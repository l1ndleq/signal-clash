// Signal Clash vault program.
//
// One PDA vault per game (room or tournament), seeded by the short game id.
// Players deposit the entry fee; the vault records every depositor on-chain. On
// settle the program takes a rake to the (fixed) treasury and pays the ranked
// winners by a tier derived from the field size:
//
//   field < 4   -> [100]            (winner-take-all)
//   field 4..5  -> [70, 30]
//   field >= 6  -> [50, 30, 20]     (tournament split)
//
// Trust boundary: the winner ranking is asserted off-chain (prices + scoring are
// off-chain), but the program constrains what the authority can do with the pot:
//   - every paid winner MUST be a recorded depositor (no paying outsiders),
//   - each winner account / prize place is used at most once,
//   - the rake + every unpaid place's share always go to the hardcoded treasury.
// There is no early single-player exit: while a game is live, the only way out is
// `settle` (which pays the winner), so a loser can never pull their stake out
// from under a winner. The sole safety net against a vanished authority is
// `void` — after a long abandonment window anyone can refund EVERY depositor
// their own entry fee at once (never anyone else's), which a winner who wants
// their prize simply pre-empts by settling.
//
// Winners are passed as writable remaining_accounts, paired with a `places` arg
// giving each winner's prize place (0 = 1st, 1 = 2nd, 2 = 3rd). The split
// percentages apply to the pot AFTER the rake is removed.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

declare_id!("7fgxvrdpcYMhqLZP9E1mFDQFmffE7ifALVdUm8owG5Lv");

const BPS_DENOM: u128 = 10_000;
const MAX_GAME_ID_LEN: usize = 32;
const MAX_FEE_BPS: u16 = 1_000; // hard cap 10%
const MAX_PAID_PLACES: usize = 3;
/// Largest supported field (tournament max), bounding the on-chain registry.
const MAX_FIELD: u8 = 32;
/// If the game is never settled within this window, anyone may `void` it and
/// refund all depositors (24h — far past any match, and long enough that a
/// winner who wants their prize will have settled first).
const ABANDON_WINDOW_SECS: i64 = 86_400;

/// Canonical treasury (devnet, base58 8UqyRdiYwVgb89AHPhQDEKUvs8FVQyfnsPKMJnNmUTrn).
/// The rake + any unpaid-place shares always go here, so a vault can't be
/// initialized with an attacker-controlled treasury.
const TREASURY: Pubkey = Pubkey::new_from_array([
    111, 35, 221, 53, 100, 203, 57, 21, 142, 81, 175, 111, 154, 152, 25, 211, 35, 85, 251, 28,
    207, 182, 77, 148, 164, 161, 215, 13, 212, 17, 19, 199,
]);

#[program]
pub mod signal_clash_vault {
    use super::*;

    /// Create a per-game vault PDA. `game_id` is the app's short game id.
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        game_id: String,
        entry_fee: u64,
        fee_bps: u16,
        max_players: u8,
    ) -> Result<()> {
        require!(game_id.len() <= MAX_GAME_ID_LEN, VaultError::GameIdTooLong);
        require!(fee_bps <= MAX_FEE_BPS, VaultError::FeeTooHigh);
        require!(max_players >= 2, VaultError::FieldTooSmall);
        require!(max_players <= MAX_FIELD, VaultError::FieldTooLarge);
        require_keys_eq!(
            ctx.accounts.treasury.key(),
            TREASURY,
            VaultError::WrongTreasury
        );

        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.treasury = ctx.accounts.treasury.key();
        vault.entry_fee = entry_fee;
        vault.fee_bps = fee_bps;
        vault.max_players = max_players;
        vault.total_deposited = 0;
        vault.settled = false;
        vault.bump = ctx.bumps.vault;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.players = Vec::new();
        Ok(())
    }

    /// A player deposits exactly the entry fee into the vault. Each wallet may
    /// deposit once, up to the field size, and is recorded for settle/reclaim.
    pub fn deposit(ctx: Context<Deposit>, _game_id: String) -> Result<()> {
        let player_key = ctx.accounts.player.key();
        let entry_fee = {
            let vault = &ctx.accounts.vault;
            require!(!vault.settled, VaultError::AlreadySettled);
            require!(
                (vault.players.len() as u8) < vault.max_players,
                VaultError::VaultFull
            );
            require!(
                !vault.players.contains(&player_key),
                VaultError::AlreadyDeposited
            );
            vault.entry_fee
        };

        // Player signs the tx, so a plain System transfer funds the vault PDA.
        let ix = system_instruction::transfer(
            &player_key,
            &ctx.accounts.vault.key(),
            entry_fee,
        );
        invoke(
            &ix,
            &[
                ctx.accounts.player.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(entry_fee)
            .ok_or(VaultError::Overflow)?;
        vault.players.push(player_key);
        Ok(())
    }

    /// Authority settles the game: rake -> treasury, each winner paid the share
    /// for its `places[i]` prize place, everything left over (unpaid places +
    /// dust) -> treasury.
    ///
    /// remaining_accounts = winner accounts (writable), 1:1 with `places`. Every
    /// winner must be a recorded depositor; winners and places must be distinct.
    pub fn settle(ctx: Context<Settle>, _game_id: String, places: Vec<u8>) -> Result<()> {
        let winners = ctx.remaining_accounts;

        let (pot, fee_bps, max_players) = {
            let vault = &ctx.accounts.vault;
            require!(!vault.settled, VaultError::AlreadySettled);
            require_keys_eq!(
                ctx.accounts.authority.key(),
                vault.authority,
                VaultError::Unauthorized
            );
            require_keys_eq!(
                ctx.accounts.treasury.key(),
                vault.treasury,
                VaultError::WrongTreasury
            );
            require!(
                winners.len() == places.len(),
                VaultError::WinnersPlacesMismatch
            );

            // Winners must be real depositors, each account used at most once.
            for (i, winner) in winners.iter().enumerate() {
                require!(
                    vault.players.contains(&winner.key()),
                    VaultError::WinnerNotParticipant
                );
                for prev in &winners[..i] {
                    require_keys_neq!(
                        prev.key(),
                        winner.key(),
                        VaultError::DuplicateWinner
                    );
                }
            }
            (vault.total_deposited, vault.fee_bps, vault.max_players)
        };

        let plan = compute_distribution(pot, fee_bps, max_players, &places)?;

        // Move lamports straight out of the program-owned PDA. The vault keeps
        // its rent-exempt base; only the deposited pot is distributed.
        let vault_ai = ctx.accounts.vault.to_account_info();
        **vault_ai.try_borrow_mut_lamports()? -= plan.pot;

        for (i, winner) in winners.iter().enumerate() {
            let amount = plan.winner_amounts[i];
            if amount > 0 {
                **winner.try_borrow_mut_lamports()? += amount;
            }
        }

        let to_treasury = plan
            .rake
            .checked_add(plan.leftover)
            .ok_or(VaultError::Overflow)?;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += to_treasury;

        ctx.accounts.vault.settled = true;
        Ok(())
    }

    /// Abandonment safety valve: if the authority never settles within the
    /// abandonment window, anyone may void the game. Every recorded depositor is
    /// refunded their own entry fee (and nothing else) in one shot — there is no
    /// per-player early exit, so a loser cannot withdraw their stake out from
    /// under a winner. A winner who wants their prize settles before the window.
    ///
    /// remaining_accounts = every recorded depositor, in registry order, writable.
    pub fn void(ctx: Context<Void>, _game_id: String) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let refunds = ctx.remaining_accounts;

        let (fee, count) = {
            let vault = &ctx.accounts.vault;
            require!(!vault.settled, VaultError::AlreadySettled);
            require!(
                now >= vault.created_at + ABANDON_WINDOW_SECS,
                VaultError::NotAbandonedYet
            );
            require!(
                refunds.len() == vault.players.len(),
                VaultError::RefundAccountsMismatch
            );
            for (acc, player) in refunds.iter().zip(vault.players.iter()) {
                require_keys_eq!(acc.key(), *player, VaultError::RefundAccountsMismatch);
            }
            (vault.entry_fee, vault.players.len() as u64)
        };

        // total == total_deposited; refunds each depositor exactly their stake.
        let total = fee.checked_mul(count).ok_or(VaultError::Overflow)?;
        let vault_ai = ctx.accounts.vault.to_account_info();
        **vault_ai.try_borrow_mut_lamports()? -= total;
        for acc in refunds.iter() {
            **acc.try_borrow_mut_lamports()? += fee;
        }

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_sub(total)
            .ok_or(VaultError::Overflow)?;
        vault.settled = true;
        Ok(())
    }
}

/// Prize split (basis points of the post-rake pot) for a given field size.
fn split_bps(max_players: u8) -> &'static [u16] {
    if max_players < 4 {
        &[10_000]
    } else if max_players < 6 {
        &[7_000, 3_000]
    } else {
        &[5_000, 3_000, 2_000]
    }
}

/// Pure settlement math, independent of Solana accounts so it can be unit
/// tested. `places` lists each winner's prize place (0-based); places omitted
/// from the list fall through to `leftover` (-> treasury).
struct Distribution {
    pot: u64,
    rake: u64,
    /// One amount per provided winner, aligned with `places`.
    winner_amounts: Vec<u64>,
    /// Unpaid place shares + rounding dust, destined for the treasury.
    leftover: u64,
}

fn compute_distribution(
    pot: u64,
    fee_bps: u16,
    max_players: u8,
    places: &[u8],
) -> Result<Distribution> {
    let splits = split_bps(max_players);
    let paid_places = splits.len();
    require!(places.len() <= MAX_PAID_PLACES, VaultError::TooManyWinners);
    require!(places.len() <= paid_places, VaultError::TooManyWinners);

    let rake = ((pot as u128 * fee_bps as u128) / BPS_DENOM) as u64;
    let net = pot.checked_sub(rake).ok_or(VaultError::Overflow)?;

    let mut winner_amounts = Vec::with_capacity(places.len());
    let mut distributed: u64 = 0;
    for (i, &place) in places.iter().enumerate() {
        let place = place as usize;
        require!(place < paid_places, VaultError::InvalidPlace);
        // Each prize place can only be claimed once.
        for &prev in &places[..i] {
            require!(prev as usize != place, VaultError::DuplicatePlace);
        }
        let amount = ((net as u128 * splits[place] as u128) / BPS_DENOM) as u64;
        winner_amounts.push(amount);
        distributed = distributed.checked_add(amount).ok_or(VaultError::Overflow)?;
    }

    // Whatever of the pot was not raked or paid to a winner goes to treasury.
    let leftover = pot
        .checked_sub(rake)
        .and_then(|v| v.checked_sub(distributed))
        .ok_or(VaultError::Overflow)?;

    Ok(Distribution {
        pot,
        rake,
        winner_amounts,
        leftover,
    })
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", game_id.as_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: must equal the hardcoded TREASURY (validated in the handler).
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault", game_id.as_bytes()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct Settle<'info> {
    #[account(mut, seeds = [b"vault", game_id.as_bytes()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
    /// CHECK: validated against vault.treasury; receives rake + unpaid shares.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    // Winner accounts are passed as writable remaining_accounts, 1:1 with places.
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct Void<'info> {
    #[account(mut, seeds = [b"vault", game_id.as_bytes()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    /// Any signer may trigger an abandoned-game refund (just pays the tx fee).
    pub payer: Signer<'info>,
    // Every recorded depositor passed as writable remaining_accounts, in order.
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub entry_fee: u64,
    pub fee_bps: u16,
    pub max_players: u8,
    pub total_deposited: u64,
    pub settled: bool,
    pub bump: u8,
    /// Vault creation time (unix); gates the reclaim refund window.
    pub created_at: i64,
    /// Every recorded depositor, in deposit order. Winners on settle and
    /// refunds on reclaim are constrained to this set.
    #[max_len(32)]
    pub players: Vec<Pubkey>,
}

#[error_code]
pub enum VaultError {
    #[msg("game id too long")]
    GameIdTooLong,
    #[msg("fee too high")]
    FeeTooHigh,
    #[msg("field too small")]
    FieldTooSmall,
    #[msg("field too large")]
    FieldTooLarge,
    #[msg("already settled")]
    AlreadySettled,
    #[msg("vault is full")]
    VaultFull,
    #[msg("wallet already deposited")]
    AlreadyDeposited,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("wrong treasury")]
    WrongTreasury,
    #[msg("too many winners for this field")]
    TooManyWinners,
    #[msg("winners and places length mismatch")]
    WinnersPlacesMismatch,
    #[msg("winner is not a recorded depositor")]
    WinnerNotParticipant,
    #[msg("duplicate winner account")]
    DuplicateWinner,
    #[msg("invalid prize place")]
    InvalidPlace,
    #[msg("duplicate prize place")]
    DuplicatePlace,
    #[msg("abandonment window has not elapsed")]
    NotAbandonedYet,
    #[msg("refund accounts must be every depositor, in order")]
    RefundAccountsMismatch,
    #[msg("arithmetic overflow")]
    Overflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    // 3% rake, like the app's RAKE_BPS.
    const FEE: u16 = 300;

    #[test]
    fn winner_take_all_for_small_fields() {
        // field 2 -> single place gets the whole post-rake pot.
        let d = compute_distribution(1_000_000, FEE, 2, &[0]).unwrap();
        assert_eq!(d.rake, 30_000); // 3%
        assert_eq!(d.winner_amounts, vec![970_000]); // 100% of net
        assert_eq!(d.leftover, 0);
        // field 3 behaves the same.
        let d3 = compute_distribution(1_000_000, FEE, 3, &[0]).unwrap();
        assert_eq!(d3.winner_amounts, vec![970_000]);
    }

    #[test]
    fn two_places_for_mid_fields() {
        // field 4 -> 70 / 30 of the post-rake pot.
        let d = compute_distribution(1_000_000, FEE, 4, &[0, 1]).unwrap();
        assert_eq!(d.rake, 30_000);
        assert_eq!(d.winner_amounts, vec![679_000, 291_000]); // 70% / 30% of 970k
        assert_eq!(d.leftover, 0);
    }

    #[test]
    fn three_places_for_tournament_fields() {
        // field 6 -> 50 / 30 / 20 of the post-rake pot.
        let d = compute_distribution(1_000_000, FEE, 6, &[0, 1, 2]).unwrap();
        assert_eq!(d.rake, 30_000);
        assert_eq!(d.winner_amounts, vec![485_000, 291_000, 194_000]);
        assert_eq!(d.leftover, 0);
    }

    #[test]
    fn unfilled_places_fall_through_to_treasury() {
        // tournament field but only the 1st place is a real wallet: the 2nd and
        // 3rd shares are not paid out and must land in leftover (-> treasury).
        let d = compute_distribution(1_000_000, FEE, 6, &[0]).unwrap();
        assert_eq!(d.rake, 30_000);
        assert_eq!(d.winner_amounts, vec![485_000]); // only 1st place
        // net 970_000 - 485_000 paid = 485_000 left over for the treasury.
        assert_eq!(d.leftover, 485_000);
        // conservation: rake + paid + leftover == pot.
        assert_eq!(d.rake + 485_000 + d.leftover, d.pot);
    }

    #[test]
    fn pays_a_non_first_place_winner() {
        // Only the 3rd-place finisher is a real wallet: they get the 20% share,
        // the unclaimed 1st/2nd shares + rake go to the treasury.
        let d = compute_distribution(1_000_000, FEE, 6, &[2]).unwrap();
        assert_eq!(d.winner_amounts, vec![194_000]); // 20% of 970k
        assert_eq!(d.leftover, 970_000 - 194_000);
        assert_eq!(d.rake + 194_000 + d.leftover, d.pot);
    }

    #[test]
    fn settlement_is_lossless_with_indivisible_pot() {
        let pot = 1_234_567;
        let d = compute_distribution(pot, FEE, 6, &[0, 1, 2]).unwrap();
        let paid: u64 = d.winner_amounts.iter().sum();
        assert_eq!(d.rake + paid + d.leftover, pot);
    }

    #[test]
    fn rejects_more_winners_than_paid_places() {
        // field 2 has a single paid place; passing 2 winners is invalid.
        assert!(compute_distribution(1_000_000, FEE, 2, &[0, 1]).is_err());
    }

    #[test]
    fn rejects_out_of_range_place() {
        // field 6 has places 0..=2; place 3 is invalid.
        assert!(compute_distribution(1_000_000, FEE, 6, &[3]).is_err());
    }

    #[test]
    fn rejects_duplicate_place() {
        assert!(compute_distribution(1_000_000, FEE, 6, &[0, 0]).is_err());
    }
}
