import assert from "node:assert/strict";
import { test } from "node:test";
import { getConfirmedMatchWinner, getGameTransitionKey } from "../src/app/worldcup/views/match-winner.ts";

const match = {
  id: 10,
  round_id: 1,
  match_index: 1,
  item_a_id: 1,
  item_b_id: 2,
  winner_id: null,
  item_a: { id: 1, name: "A", image_url: "a.jpg" },
  item_b: { id: 2, name: "B", image_url: "b.jpg" },
};
const next = { ...match, id: 11, match_index: 2, item_a_id: 3, item_b_id: 4 };

test("broadcast and delayed acknowledgement identify the same transition", () => {
  const seen = new Set();
  const applied = [];
  for (const update of [
    { status: "nextMatch", match: next, vote: { memberId: 1, selectItemId: 1 } },
    { ...next, id: 12, match_index: 3 },
    next,
  ]) {
    const key = getGameTransitionKey(update);
    if (!seen.has(key)) { seen.add(key); applied.push(key); }
  }
  assert.deepEqual(applied, ["match:11", "match:12"]);
});

test("voting and ties remain repeatable within one match", () => {
  assert.equal(getGameTransitionKey({ status: "voting", vote: { memberId: 1, selectItemId: 1 } }), null);
  assert.equal(getGameTransitionKey({ status: "tie", match, tieMembers: 1 }), null);
});

test("finished acknowledgement does not depend on the now-hidden match", () => {
  assert.equal(getGameTransitionKey({ finished: true, winnerId: 2 }), "finished:2");
});
const cases = [
  [
    "one-person multiplayer room confirms the sole accepted vote",
    { update: { status: "nextMatch", match: next, vote: { memberId: 1, selectItemId: 2 } }, participantCount: 1 },
    2,
  ],
  [
    "multiplayer majority wins even when the last vote chose the loser",
    { update: { status: "nextMatch", match: next, vote: { memberId: 3, selectItemId: 2 } },
      participantCount: 3,
      votes: [{ memberId: 1, selectItemId: 1 }, { memberId: 2, selectItemId: 1 }] },
    1,
  ],
  [
    "the final accepted vote can decide the winner",
    { update: { status: "nextMatch", match: next, vote: { memberId: 3, selectItemId: 2 } },
      participantCount: 3,
      votes: [{ memberId: 1, selectItemId: 1 }, { memberId: 2, selectItemId: 2 }] },
    2,
  ],
  [
    "changed and duplicate votes count once per member",
    { update: { status: "nextMatch", match: next, vote: { memberId: 1, selectItemId: 2 } },
      participantCount: 3,
      votes: [{ memberId: 1, selectItemId: 1 }, { memberId: 1, selectItemId: 1 },
        { memberId: 2, selectItemId: 2 }, { memberId: 3, selectItemId: 1 }] },
    2,
  ],
  [
    "round transition proves a leader that the omitted last vote cannot beat",
    { update: { ...next, round_id: 2 }, participantCount: 4,
      votes: [{ memberId: 1, selectItemId: 1 }, { memberId: 2, selectItemId: 1 }, { memberId: 3, selectItemId: 2 }] },
    1,
  ],
  [
    "missing votes after reconnect do not invent a winner",
    { update: { ...next, round_id: 2 }, participantCount: 4,
      votes: [{ memberId: 1, selectItemId: 1 }] },
    null,
  ],
  [
    "vote tally never starts animation while voting is still open",
    { update: { status: "voting" }, participantCount: 3,
      votes: [{ memberId: 1, selectItemId: 1 }, { memberId: 2, selectItemId: 1 }] },
    null,
  ],
  [
    "previous tally cannot override a pending tie breaker",
    { update: { ...next, round_id: 2 }, participantCount: 3, tieBreakerMemberId: 3,
      votes: [{ memberId: 1, selectItemId: 1 }, { memberId: 2, selectItemId: 1 }] },
    null,
  ],
  ["final winner", { update: { finished: true, winnerId: 2 } }, 2],
  [
    "explicit existing winner response",
    { update: { status: "winner", winnerId: 1 } },
    1,
  ],
  [
    "invalid winner is ignored",
    { update: { finished: true, winnerId: 99 } },
    null,
  ],
  [
    "ordinary last voter is not necessarily the winner",
    {
      update: {
        status: "nextMatch",
        match: next,
        vote: { memberId: 4, selectItemId: 2 },
      },
    },
    null,
  ],
  [
    "a local vote alone is not victory",
    {
      update: { status: "voting", vote: { memberId: 1, selectItemId: 1 } },
      soloVoteItemId: 1,
    },
    null,
  ],
  [
    "tie is not victory",
    { update: { status: "tie", match, tieMembers: 1 }, soloVoteItemId: 1 },
    null,
  ],
  ["solo confirmed transition", { update: next, soloVoteItemId: 1 }, 1],
  [
    "same match is not a transition",
    { update: match, soloVoteItemId: 1 },
    null,
  ],
  [
    "tie breaker's accepted choice",
    {
      update: {
        status: "nextMatch",
        match: next,
        vote: { memberId: 3, selectItemId: 2 },
      },
      tieBreakerMemberId: 3,
    },
    2,
  ],
  [
    "another member is not the tie breaker",
    {
      update: {
        status: "nextMatch",
        match: next,
        vote: { memberId: 4, selectItemId: 2 },
      },
      tieBreakerMemberId: 3,
    },
    null,
  ],
  [
    "one candidate advanced into next round",
    { update: { ...next, round_id: 2, item_b_id: 2 } },
    2,
  ],
  [
    "next round with no prior candidates is inconclusive",
    { update: { ...next, round_id: 2 } },
    null,
  ],
  [
    "both prior candidates is inconclusive",
    { update: { ...match, id: 11, round_id: 2 } },
    null,
  ],
  [
    "no previous match on initial load",
    { match: null, update: next, soloVoteItemId: 1 },
    null,
  ],
  [
    "delayed prior round response is ignored",
    { match: { ...match, round_id: 2 }, update: next, soloVoteItemId: 1 },
    null,
  ],
  [
    "delayed prior match response is ignored",
    { match: { ...match, match_index: 3 }, update: next, soloVoteItemId: 1 },
    null,
  ],
];
for (const [name, input, winner] of cases) {
  test(name, () =>
    assert.equal(getConfirmedMatchWinner({ match, ...input }), winner),
  );
}
