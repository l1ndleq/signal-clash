// Signal Clash vault program.
//
// One PDA vault per game (room or tournament), seeded by the short game id.
// Players deposit the entry fee; on settle the program takes a rake to the
// treasury and pays the ranked winners by a tier derived from the field size:
//
//   field < 4   -> [100]            (winner-take-all)
//   field 4..5  -> [70, 30]
//   field >= 6  -> [50, 30, 20]     (tournament split)
//
// Winners are passed as remaining_accounts in rank order (1st, 2nd, 3rd). Fewer
// winners than paid places may be passed (e.g. a solo demo where only one seat
// is a real wallet) — every unfilled place's share, plus the rake and any
// rounding dust, goes to the treasury. The split percentages apply to the pot
// AFTER the rake is removed, matching the frontend's prize breakdown.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

declare_id!("7fgxvrdpcYMhqLZP9E1mFDQFmffE7ifALVdUm8owG5Lv");

const BPS_DENOM: u128 = 10_000;
const MAX_GAME_ID_LEN: usize = 32;
const MAX_FEE_BPS: u16 = 1_000; // hard cap 10%
const MAX_PAID_PLACES: usize = 3;

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

        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.treasury = ctx.accounts.treasury.key();
        vault.entry_fee = entry_fee;
        vault.fee_bps = fee_bps;
        vault.max_players = max_players;
        vault.total_deposited = 0;
        vault.settled = false;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    /// A player deposits exactly the entry fee into the vault.
    pub fn deposit(ctx: Context<Deposit>, _game_id: String) -> Result<()> {
        require!(!ctx.accounts.vault.settled, VaultError::AlreadySettled);
        let entry_fee = ctx.accounts.vault.entry_fee;

        // Player signs the tx, so a plain System transfer funds the vault PDA.
        let ix = system_instruction::transfer(
            &ctx.accounts.player.key(),
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
        Ok(())
    }

    /// Authority settles the game: rake -> treasury, ranked winners paid by tier,
    /// everything left over (unfilled places + dust) -> treasury.
    ///
    /// remaining_accounts = ranked winner accounts (1st, 2nd, 3rd), each writable.
    pub fn settle(ctx: Context<Settle>, _game_id: String) -> Result<()> {
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

        let winners = ctx.remaining_accounts;
        let plan = compute_distribution(
            vault.total_deposited,
            vault.fee_bps,
            vault.max_players,
            winners.len(),
        )?;

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
/// tested. `winner_count` may be anywhere from 0 to the number of paid places;
/// shares for places without a real winner account fall through to `leftover`.
struct Distribution {
    pot: u64,
    rake: u64,
    /// One amount per provided winner, in rank order.
    winner_amounts: Vec<u64>,
    /// Unpaid place shares + rounding dust, destined for the treasury.
    leftover: u64,
}

fn compute_distribution(
    pot: u64,
    fee_bps: u16,
    max_players: u8,
    winner_count: usize,
) -> Result<Distribution> {
    let splits = split_bps(max_players);
    let paid_places = splits.len();
    require!(winner_count <= MAX_PAID_PLACES, VaultError::TooManyWinners);
    require!(winner_count <= paid_places, VaultError::TooManyWinners);

    let rake = ((pot as u128 * fee_bps as u128) / BPS_DENOM) as u64;
    let net = pot.checked_sub(rake).ok_or(VaultError::Overflow)?;

    let mut winner_amounts = Vec::with_capacity(winner_count);
    let mut distributed: u64 = 0;
    for split in splits.iter().take(winner_count) {
        let amount = ((net as u128 * *split as u128) / BPS_DENOM) as u64;
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
    /// CHECK: only stored as the rake destination; validated on settle.
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
    // Ranked winner accounts are passed as writable remaining_accounts.
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
}

#[error_code]
pub enum VaultError {
    #[msg("game id too long")]
    GameIdTooLong,
    #[msg("fee too high")]
    FeeTooHigh,
    #[msg("field too small")]
    FieldTooSmall,
    #[msg("already settled")]
    AlreadySettled,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("wrong treasury")]
    WrongTreasury,
    #[msg("too many winners for this field")]
    TooManyWinners,
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
        let d = compute_distribution(1_000_000, FEE, 2, 1).unwrap();
        assert_eq!(d.rake, 30_000); // 3%
        assert_eq!(d.winner_amounts, vec![970_000]); // 100% of net
        assert_eq!(d.leftover, 0);
        // field 3 behaves the same.
        let d3 = compute_distribution(1_000_000, FEE, 3, 1).unwrap();
        assert_eq!(d3.winner_amounts, vec![970_000]);
    }

    #[test]
    fn two_places_for_mid_fields() {
        // field 4 -> 70 / 30 of the post-rake pot.
        let d = compute_distribution(1_000_000, FEE, 4, 2).unwrap();
        assert_eq!(d.rake, 30_000);
        assert_eq!(d.winner_amounts, vec![679_000, 291_000]); // 70% / 30% of 970k
        assert_eq!(d.leftover, 0);
    }

    #[test]
    fn three_places_for_tournament_fields() {
        // field 6 -> 50 / 30 / 20 of the post-rake pot.
        let d = compute_distribution(1_000_000, FEE, 6, 3).unwrap();
        assert_eq!(d.rake, 30_000);
        assert_eq!(d.winner_amounts, vec![485_000, 291_000, 194_000]);
        assert_eq!(d.leftover, 0);
    }

    #[test]
    fn unfilled_places_fall_through_to_treasury() {
        // tournament field but only the 1st place is a real wallet: the 2nd and
        // 3rd shares are not paid out and must land in leftover (-> treasury).
        let d = compute_distribution(1_000_000, FEE, 6, 1).unwrap();
        assert_eq!(d.rake, 30_000);
        assert_eq!(d.winner_amounts, vec![485_000]); // only 1st place
        // net 970_000 - 485_000 paid = 485_000 left over for the treasury.
        assert_eq!(d.leftover, 485_000);
        // conservation: rake + paid + leftover == pot.
        assert_eq!(d.rake + 485_000 + d.leftover, d.pot);
    }

    #[test]
    fn settlement_is_lossless_with_indivisible_pot() {
        let pot = 1_234_567;
        let d = compute_distribution(pot, FEE, 6, 3).unwrap();
        let paid: u64 = d.winner_amounts.iter().sum();
        assert_eq!(d.rake + paid + d.leftover, pot);
    }

    #[test]
    fn rejects_more_winners_than_paid_places() {
        // field 2 has a single paid place; passing 2 winners is invalid.
        assert!(compute_distribution(1_000_000, FEE, 2, 2).is_err());
    }
}
