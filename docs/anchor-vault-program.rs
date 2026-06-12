// Draft source for the Signal Clash vault program.
// After `anchor init anchor-vault`, this replaces
// anchor-vault/programs/anchor-vault/src/lib.rs
// (declare_id! is overwritten by `anchor keys sync` after the first build).

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Vau1t1111111111111111111111111111111111111");

#[program]
pub mod signal_clash_vault {
    use super::*;

    /// Create a per-room vault PDA. The room id is our short game id.
    pub fn initialize_room(
        ctx: Context<InitializeRoom>,
        room_id: String,
        entry_fee: u64,
        fee_bps: u16,
    ) -> Result<()> {
        require!(room_id.len() <= 32, VaultError::RoomIdTooLong);
        require!(fee_bps <= 2_000, VaultError::FeeTooHigh); // hard cap 20%

        let room = &mut ctx.accounts.room;
        room.authority = ctx.accounts.authority.key();
        room.treasury = ctx.accounts.treasury.key();
        room.entry_fee = entry_fee;
        room.fee_bps = fee_bps;
        room.total_deposited = 0;
        room.settled = false;
        room.bump = ctx.bumps.room;
        Ok(())
    }

    /// A player deposits exactly the entry fee into the room vault.
    pub fn deposit(ctx: Context<Deposit>, _room_id: String) -> Result<()> {
        let entry_fee = ctx.accounts.room.entry_fee;
        require!(!ctx.accounts.room.settled, VaultError::AlreadySettled);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.room.to_account_info(),
                },
            ),
            entry_fee,
        )?;

        let room = &mut ctx.accounts.room;
        room.total_deposited = room
            .total_deposited
            .checked_add(entry_fee)
            .ok_or(VaultError::Overflow)?;
        Ok(())
    }

    /// Authority settles the match: rake -> treasury, remainder -> winner.
    pub fn settle(ctx: Context<Settle>, _room_id: String) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(!room.settled, VaultError::AlreadySettled);
        require_keys_eq!(
            ctx.accounts.authority.key(),
            room.authority,
            VaultError::Unauthorized
        );
        require_keys_eq!(
            ctx.accounts.treasury.key(),
            room.treasury,
            VaultError::WrongTreasury
        );

        let pot = room.total_deposited;
        let fee = (pot as u128 * room.fee_bps as u128 / 10_000u128) as u64;
        let payout = pot.checked_sub(fee).ok_or(VaultError::Overflow)?;

        // Move lamports straight out of the PDA data account (program-owned).
        // The room keeps its rent-exempt base (deposits sit on top of it).
        **room.to_account_info().try_borrow_mut_lamports()? -= pot;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += fee;
        **ctx.accounts.winner.try_borrow_mut_lamports()? += payout;

        room.settled = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct InitializeRoom<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Room::INIT_SPACE,
        seeds = [b"room", room_id.as_bytes()],
        bump
    )]
    pub room: Account<'info, Room>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: only stored as the rake destination; validated on settle.
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"room", room_id.as_bytes()], bump = room.bump)]
    pub room: Account<'info, Room>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct Settle<'info> {
    #[account(mut, seeds = [b"room", room_id.as_bytes()], bump = room.bump)]
    pub room: Account<'info, Room>,
    pub authority: Signer<'info>,
    /// CHECK: validated against room.treasury.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    /// CHECK: winner recipient of the remaining pot.
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Room {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub entry_fee: u64,
    pub fee_bps: u16,
    pub total_deposited: u64,
    pub settled: bool,
    pub bump: u8,
}

#[error_code]
pub enum VaultError {
    #[msg("room id too long")]
    RoomIdTooLong,
    #[msg("fee too high")]
    FeeTooHigh,
    #[msg("already settled")]
    AlreadySettled,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("wrong treasury")]
    Overflow,
    #[msg("wrong treasury")]
    WrongTreasury,
}
