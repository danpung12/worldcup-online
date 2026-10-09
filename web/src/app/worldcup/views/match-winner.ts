import type {
  GameUpdateResponse,
  MatchResponse,
} from "../../../lib/room-socket";

// Never use the last voter's choice as the winner of an ordinary multiplayer match.
export function getConfirmedMatchWinner({
  match,
  update,
  soloVoteItemId = null,
  tieBreakerMemberId = null,
}: {
  match: MatchResponse | null;
  update: GameUpdateResponse;
  soloVoteItemId?: number | null;
  tieBreakerMemberId?: number | null;
}): number | null {
  if (!match) return null;
  const isCandidate = (id: number | null) =>
    id === match.item_a_id || id === match.item_b_id;

  if ("winnerId" in update) {
    return isCandidate(update.winnerId) ? update.winnerId : null;
  }

  const next =
    "item_a" in update
      ? update
      : update.status === "nextMatch"
        ? update.match
        : null;
  if (!next || next.id === match.id) return null;
  if (
    next.round_id < match.round_id ||
    (next.round_id === match.round_id && next.match_index <= match.match_index)
  )
    return null;

  // A candidate appearing in a later round has demonstrably advanced.
  if (next.round_id > match.round_id) {
    const advanced = [next.item_a_id, next.item_b_id].filter(isCandidate);
    if (advanced.length === 1) return advanced[0];
  }

  // A confirmed transition after a single-player vote is also conclusive.
  if (isCandidate(soloVoteItemId)) return soloVoteItemId;

  if ("status" in update && update.status === "nextMatch" && update.vote) {
    if (
      tieBreakerMemberId !== null &&
      update.vote.memberId === tieBreakerMemberId &&
      isCandidate(update.vote.selectItemId)
    )
      return update.vote.selectItemId;
  }
  return null;
}
