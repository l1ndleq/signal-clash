// Signal Clash match-state program.
//
// Holds the connected player's running match score as a PDA. The real-time
// per-round mutations (lock a prediction, apply a round's scored delta) run on
// a MagicBlock Ephemeral Rollup — fast and gasless — while create/delegate and
// the final commit happen on Solana base layer:
//
//   L1  create_match(game_id, total_rounds)   // init match-state PDA
//   L1  delegate(game_id)                      // hand the PDA to the ER
//   ER  submit_prediction(dir, conf)           // lock a call (gasless)
//   ER  resolve_round(score_delta, streak)     // apply the round (gasless)
//   ER  finish_and_undelegate(game_id)         // commit final score -> L1
//
// Round outcomes are scored off-chain by the app's tested pure scoring fn; this
// program just records the authoritative running score on the rollup. The
// committed final score feeds the L1 `signal_clash_vault` settlement.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("EBVEm8hADVP2dmftFE3FWcdMjg7MWpfk7ssxeNAiawYQ");

pub const MATCH_SEED: &[u8] = b"match";

#[ephemeral]
#[program]
pub mod signal_clash_match {
    use super::*;

    /// L1: create the per-game match-state PDA. `session` is the ephemeral key
    /// that is allowed to sign the gasless ER writes for this match.
    pub fn create_match(
        ctx: Context<CreateMatch>,
        _game_id: String,
        total_rounds: u8,
        session: Pubkey,
    ) -> Result<()> {
        let m = &mut ctx.accounts.match_state;
        m.authority = ctx.accounts.authority.key();
        m.session = session;
        m.score = 0;
        m.streak = 0;
        m.round = 0;
        m.total_rounds = total_rounds;
        m.pending_dir = 0;
        m.pending_conf = 0;
        m.finished = false;
        Ok(())
    }

    /// L1: delegate the match-state PDA to the ephemeral rollup.
    pub fn delegate(ctx: Context<DelegateMatch>, game_id: String) -> Result<()> {
        ctx.accounts.delegate_match_state(
            &ctx.accounts.payer,
            &[MATCH_SEED, game_id.as_bytes()],
            DelegateConfig {
                // Optionally pin a specific ER validator (first remaining account).
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// ER: lock a prediction for the current round.
    pub fn submit_prediction(
        ctx: Context<UpdateMatch>,
        _game_id: String,
        direction: u8,
        confidence: u8,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.session.key(),
            ctx.accounts.match_state.session,
            MatchError::Unauthorized
        );
        let m = &mut ctx.accounts.match_state;
        require!(!m.finished, MatchError::Finished);
        m.pending_dir = direction;
        m.pending_conf = confidence;
        Ok(())
    }

    /// ER: resolve the round with the off-chain-computed score delta + streak.
    pub fn resolve_round(
        ctx: Context<UpdateMatch>,
        _game_id: String,
        score_delta: i64,
        new_streak: u8,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.session.key(),
            ctx.accounts.match_state.session,
            MatchError::Unauthorized
        );
        let m = &mut ctx.accounts.match_state;
        require!(!m.finished, MatchError::Finished);
        m.score = m
            .score
            .checked_add(score_delta)
            .ok_or(MatchError::Overflow)?;
        m.streak = new_streak;
        m.round = m.round.saturating_add(1);
        m.pending_dir = 0;
        m.pending_conf = 0;
        Ok(())
    }

    /// ER: finalize — commit the final score to L1 and undelegate the PDA.
    pub fn finish_and_undelegate(
        ctx: Context<CommitMatch>,
        _game_id: String,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.payer.key(),
            ctx.accounts.match_state.session,
            MatchError::Unauthorized
        );
        let m = &mut ctx.accounts.match_state;
        m.finished = true;
        // Flush the Anchor account so the commit captures the latest data.
        m.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.match_state.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateMatch<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + MatchState::INIT_SPACE,
        seeds = [MATCH_SEED, game_id.as_bytes()],
        bump
    )]
    pub match_state: Account<'info, MatchState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// `#[delegate]` adds `delegate_match_state(...)` to this context.
#[delegate]
#[derive(Accounts)]
pub struct DelegateMatch<'info> {
    pub payer: Signer<'info>,
    /// CHECK: the match-state PDA to delegate (seeds checked in the handler).
    #[account(mut, del)]
    pub match_state: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct UpdateMatch<'info> {
    #[account(mut, seeds = [MATCH_SEED, game_id.as_bytes()], bump)]
    pub match_state: Account<'info, MatchState>,
    /// The ephemeral session key registered at create_match — only it may write.
    pub session: Signer<'info>,
}

/// `#[commit]` injects the `magic_context` and `magic_program` accounts.
#[commit]
#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CommitMatch<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, game_id.as_bytes()], bump)]
    pub match_state: Account<'info, MatchState>,
}

#[account]
#[derive(InitSpace)]
pub struct MatchState {
    pub authority: Pubkey,
    /// Ephemeral key allowed to sign the gasless ER writes for this match.
    pub session: Pubkey,
    pub score: i64,
    pub streak: u8,
    pub round: u8,
    pub total_rounds: u8,
    pub pending_dir: u8,
    pub pending_conf: u8,
    pub finished: bool,
}

#[error_code]
pub enum MatchError {
    #[msg("match already finished")]
    Finished,
    #[msg("unauthorized session key")]
    Unauthorized,
    #[msg("arithmetic overflow")]
    Overflow,
}
