import type {
  GameUpdateResponse,
  MatchResponse,
} from "../../../lib/room-socket";

export function getGameTransitionKey(update: GameUpdateResponse): string | null {
  if ("item_a" in update) return `match:${update.id}`;
  if ("status" in update && update.status === "nextMatch") return `match:${update.match.id}`;
  if ("finished" in update && update.finished) return `finished:${update.winnerId}`;
  return null;
}

// Never use the last voter's choice as the winner of an ordinary multiplayer match.
export function getConfirmedMatchWinner({
  match,
  update,
  soloVoteItemId = null,
  tieBreakerMemberId = null,
  votes = [],
  participantCount = 0,
}: {
  match: MatchResponse | null;
  update: GameUpdateResponse;
  soloVoteItemId?: number | null;
  tieBreakerMemberId?: number | null;
  votes?: ReadonlyArray<{ memberId: number; selectItemId: number }>;
  participantCount?: number;
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

  // Reconstruct the tally from accepted socket votes, including the final vote
  // carried by nextMatch. Repeated votes/acks count once per member.
  if (tieBreakerMemberId !== null || participantCount < 1) return null;
  const choices = new Map(votes.map((vote) => [vote.memberId, vote.selectItemId]));
  if ("status" in update && update.status === "nextMatch" && update.vote) {
    choices.set(update.vote.memberId, update.vote.selectItemId);
  }
  const validChoices = [...choices.values()].filter(isCandidate);
  const margin = validChoices.reduce(
    (total, id) => total + (id === match.item_a_id ? 1 : -1),
    0,
  );
  const missingVotes = Math.max(0, participantCount - validChoices.length);
  // A round transition can omit its last vote. If the missing votes could at
  // most tie the leader, the confirmed non-tie transition proves that leader won.
  if (margin !== 0 && Math.abs(margin) >= missingVotes) {
    return margin > 0 ? match.item_a_id : match.item_b_id;
  }
  return null;
}
