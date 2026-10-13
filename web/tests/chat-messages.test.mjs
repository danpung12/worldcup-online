import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chatReducer,
  initialChatState,
} from "../src/app/worldcup/views/chat-messages.ts";

const chat = (
  message,
  memberId = 1,
  createdAt = "2026-10-13T04:00:00.000Z",
) => ({
  message,
  memberId,
  createdAt,
});
const queue = (state, message, localId) =>
  chatReducer(state, {
    type: "send",
    chat: { ...chat(message), localId },
  });
const receive = (state, message) =>
  chatReducer(state, { type: "receive", chat: message });

test("a message is visible before any server response and confirmed in place", () => {
  const local = queue(initialChatState, "안녕", "local-1");
  assert.equal(local.messages[0].message, "안녕");
  assert.equal(local.messages[0].delivery, "sending");
  const confirmed = receive(local, chat("안녕", 1, "2026-10-13T04:00:02.000Z"));
  assert.equal(confirmed.messages.length, 1);
  assert.equal(confirmed.messages[0].localId, "local-1");
  assert.equal(confirmed.messages[0].createdAt, "2026-10-13T04:00:02.000Z");
  assert.equal(confirmed.messages[0].delivery, undefined);
  assert.equal(confirmed.pending.length, 0);
});

test("another participant's identical message does not consume my pending send", () => {
  let state = queue(initialChatState, "ㅋㅋ", "local-1");
  state = receive(state, chat("ㅋㅋ", 2));
  assert.equal(state.pending.length, 1);
  state = receive(state, chat("ㅋㅋ"));
  assert.deepEqual(
    state.messages.map(({ memberId }) => memberId),
    [1, 2],
  );
  assert.equal(state.pending.length, 0);
});

test("repeated identical sends remain separate, including equal server timestamps", () => {
  let state = queue(initialChatState, "ㅋㅋ", "local-1");
  state = queue(state, "ㅋㅋ", "local-2");
  state = receive(state, chat("ㅋㅋ"));
  assert.equal(state.pending.length, 1);
  assert.equal(state.messages[1].delivery, "sending");
  state = receive(state, chat("ㅋㅋ"));
  assert.deepEqual(
    state.messages.map(({ localId }) => localId),
    ["local-1", "local-2"],
  );
  assert.equal(state.pending.length, 0);
});

test("out-of-order echoes confirm the matching sends without moving the bubbles", () => {
  let state = queue(initialChatState, "첫 번째", "first");
  state = queue(state, "두 번째", "second");
  state = receive(state, chat("두 번째"));
  state = receive(state, chat("첫 번째"));
  assert.deepEqual(
    state.messages.map(({ message }) => message),
    ["첫 번째", "두 번째"],
  );
  assert.equal(state.pending.length, 0);
});

test("own messages without a matching local send are still displayed", () => {
  const state = receive(initialChatState, chat("다른 탭에서 보낸 메시지"));
  assert.equal(state.messages[0].message, "다른 탭에서 보낸 메시지");
});

test("delayed echoes do not bring back messages evicted by the 50-message limit", () => {
  let state = initialChatState;
  for (let i = 0; i < 60; i++)
    state = queue(state, `메시지 ${i}`, `local-${i}`);
  for (let i = 0; i < 60; i++) state = receive(state, chat(`메시지 ${i}`));
  assert.equal(state.messages.length, 50);
  assert.equal(state.messages[0].message, "메시지 10");
  assert.equal(state.messages.at(-1).message, "메시지 59");
  assert.equal(state.pending.length, 0);
});

test("history keeps an unconfirmed send instead of clearing it or matching an older identical message", () => {
  const old = chat("안녕", 1, "2026-10-13T03:00:00.000Z");
  let state = receive(initialChatState, old);
  state = queue(state, "안녕", "new");
  state = chatReducer(state, { type: "history", chats: [old] });
  assert.equal(state.messages.length, 2);
  assert.equal(state.pending[0].localId, "new");
  assert.equal(state.messages[1].delivery, "sending");
});

test("history confirms accepted sends once and retains sends not yet stored", () => {
  let state = queue(initialChatState, "안녕", "first");
  state = queue(state, "안녕", "second");
  state = chatReducer(state, { type: "history", chats: [chat("안녕")] });
  assert.equal(state.messages.length, 2);
  assert.equal(state.messages[0].delivery, undefined);
  assert.equal(state.messages[1].delivery, "sending");
  // The first broadcast may arrive after history has already confirmed it.
  state = receive(state, chat("안녕"));
  assert.equal(state.pending[0].localId, "second");
  state = receive(state, chat("안녕"));
  assert.equal(state.messages.length, 2);
  assert.equal(state.pending.length, 0);
});

test("an incoming message already loaded from history is not appended again", () => {
  const incoming = chat("다른 사람 메시지", 2);
  const history = chatReducer(initialChatState, {
    type: "history",
    chats: [incoming],
  });
  const state = receive(history, incoming);
  assert.equal(state.messages.length, 1);
});

test("a late confirmation resolves uncertain delivery and a stale timeout cannot undo success", () => {
  let state = queue(initialChatState, "안녕", "local-1");
  state = chatReducer(state, { type: "unconfirmed", localId: "local-1" });
  assert.equal(state.messages[0].delivery, "unconfirmed");
  state = receive(state, chat("안녕"));
  const confirmed = state;
  state = chatReducer(state, { type: "unconfirmed", localId: "local-1" });
  assert.equal(state, confirmed);
  assert.equal(state.messages[0].delivery, undefined);
});

test("reset clears pending sends as well as visible room history", () => {
  const state = chatReducer(queue(initialChatState, "안녕", "old-room"), {
    type: "reset",
  });
  assert.deepEqual(state, { messages: [], pending: [], historyEchoes: [] });
});
