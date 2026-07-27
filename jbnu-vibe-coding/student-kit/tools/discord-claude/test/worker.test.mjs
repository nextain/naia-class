import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  authorizedMessage,
  buildPrompt,
  canResumeSession,
  createMessageProcessor,
  discordChunks,
  missionFromRequest,
  parseClaudeResult,
  parseOptions,
  safeFilename,
} from "../worker.mjs";

const ids = {
  guildId: "123456789012345678",
  channelId: "223456789012345678",
  userId: "323456789012345678",
};

function options(workspace) {
  return {
    workspace,
    ...ids,
    token: "test-token-that-is-long-enough-for-validation",
    factchatKey: "test-factchat-key",
    baseUrl: "https://factchat-cloud.mindlogic.ai/v1/gateway/claude",
    model: "claude-sonnet-4-6",
    idleTimeoutMs: 30 * 60 * 1_000,
  };
}

test("options require the FactChat key, exact gateway, Claude model, and Discord server/channel ids", () => {
  const env = {
    DISCORD_BOT_TOKEN: "test-token-that-is-long-enough-for-validation",
    DISCORD_GUILD_ID: ids.guildId,
    DISCORD_CHANNEL_ID: ids.channelId,
    JBD_KEY: "test-factchat-key",
  };
  const parsed = parseOptions(["--workspace", "."], env);
  assert.equal(parsed.baseUrl, "https://factchat-cloud.mindlogic.ai/v1/gateway/claude");
  assert.equal(parsed.model, "claude-sonnet-4-6");
  assert.throws(() => parseOptions(["--model", "gpt-5.5"], env), /Claude model/);
  assert.throws(() => parseOptions([], { ...env, JBD_KEY: "" }), /JBD_KEY/);
});

test("Discord settings load from data-private without PowerShell environment setup", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "discord-private-env-"));
  const privatePath = join(workspace, "data-private", "discord-claude");
  await mkdir(privatePath, { recursive: true });
  await writeFile(join(privatePath, ".env"), [
    "DISCORD_BOT_TOKEN=test-token-that-is-long-enough-for-validation",
    `DISCORD_GUILD_ID=${ids.guildId}`,
    `DISCORD_CHANNEL_ID=${ids.channelId}`,
    "",
  ].join("\n"), "utf8");
  const parsed = parseOptions(["--workspace", workspace], {
    JBD_KEY: "test-factchat-key",
    ANTHROPIC_BASE_URL: "https://factchat-cloud.mindlogic.ai/v1/gateway/claude",
  });
  assert.equal(parsed.token, "test-token-that-is-long-enough-for-validation");
  assert.equal(parsed.guildId, ids.guildId);
  assert.equal(parsed.channelId, ids.channelId);
});

test("authorization accepts people in the configured channel and ignores bots", () => {
  const base = {
    id: "423456789012345678",
    guild_id: ids.guildId,
    channel_id: ids.channelId,
    author: { id: ids.userId, bot: false },
    content: "첨부한 공고를 분석해줘",
    attachments: [],
  };
  assert.equal(authorizedMessage(base, options("D:\\workspace")), true);
  assert.equal(authorizedMessage({ ...base, author: { id: "999999999999999999", bot: false } }, options("D:\\workspace")), true);
  assert.equal(authorizedMessage({ ...base, channel_id: "999999999999999999" }, options("D:\\workspace")), false);
  assert.equal(authorizedMessage({ ...base, author: { ...base.author, bot: true } }, options("D:\\workspace")), false);
  assert.equal(authorizedMessage({ ...base, content: "" }, options("D:\\workspace")), false);
});

test("filenames are flattened and proposal prompt requires HWPX delivery", () => {
  assert.equal(safeFilename("../../proposal?.hwp"), "proposal_.hwp");
  const workspace = process.platform === "win32" ? "D:\\workspace" : "/workspace";
  const prompt = buildPrompt({
    messageId: "423456789012345678",
    request: "proposal 초안을 작성해줘",
    attachmentPaths: [join(workspace, "data-private", "discord-claude", "inbox", "notice.hwp")],
    outboxPath: join(workspace, "data-private", "discord-claude", "outbox", "423456789012345678"),
    workspace,
  });
  assert.match(prompt, /\.agents\/skills\/read-doc\/SKILL\.md/);
  assert.match(prompt, /\.agents\/skills\/proposal-writing\/SKILL\.md/);
  assert.match(prompt, /제안서 미션/);
  assert.match(prompt, /자료에 없는 항목은 메타 설명을 쓰지 말고 빈칸으로 유지하세요/);
  assert.doesNotMatch(prompt, new RegExp(['확인', '필요'].join(' ')));
  assert.match(prompt, /초기창업패키지_모두봄랩_교육용\.hwpx/);
  assert.doesNotMatch(prompt, /Tailwind CDN/);
  assert.doesNotMatch(prompt, /\.agents\/skills\/project-create\/SKILL\.md/);
  assert.doesNotMatch(prompt, /D:\\workspace|\/workspace\/data-private/);
});

test("Discord accepts proposal as the only remote mission", () => {
  assert.equal(missionFromRequest("web 이미지를 참고해줘"), "general");
  assert.equal(missionFromRequest("proposal 양식을 채워줘"), "proposal");
  assert.equal(missionFromRequest("첨부한 양식으로 제안서를 작성해줘"), "proposal");
  assert.equal(missionFromRequest("작성해줘", ["notice.hwp"]), "proposal");
  assert.equal(missionFromRequest("둘 다 만들어줘"), "general");
  const workspace = process.platform === "win32" ? "D:\\workspace" : "/workspace";
  const guidePrompt = buildPrompt({
    messageId: "423456789012345678", request: "web 원페이지를 만들어줘",
    attachmentPaths: [join(workspace, "data-private", "discord-claude", "inbox", "image.png")],
    outboxPath: join(workspace, "data-private", "discord-claude", "outbox", "423456789012345678"), workspace,
  });
  assert.match(guidePrompt, /제안서만 허용/);
  assert.doesNotMatch(guidePrompt, /Tailwind CDN/);
});

test("Claude Code JSON yields a stable session id and final text", () => {
  const parsed = parseClaudeResult(JSON.stringify({
    type: "result",
    subtype: "success",
    session_id: "d47a43fb-d4b7-4cf5-8c46-782c0c19cd2f",
    result: "완료했습니다",
  }));
  assert.deepEqual(parsed, {
    sessionId: "d47a43fb-d4b7-4cf5-8c46-782c0c19cd2f",
    text: "완료했습니다",
  });
});

test("session resumes only before the 30 minute idle boundary", () => {
  const state = { sessionId: "session-1", updatedAt: 1_000 };
  const timeout = 30 * 60 * 1_000;
  assert.equal(canResumeSession(state, 1_000 + timeout - 1, timeout), true);
  assert.equal(canResumeSession(state, 1_000 + timeout, timeout), false);
  assert.equal(canResumeSession({ sessionId: "session-1" }, 2_000, timeout), false);
});

test("Discord text is split below the platform limit", () => {
  const chunks = discordChunks("가".repeat(4_500));
  assert.deepEqual(chunks.map((chunk) => chunk.length), [1_900, 1_900, 700]);
});

test("authorized message runs once, reuses the session, and returns outbox files", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "discord-claude-worker-"));
  const sent = [];
  const discord = {
    async sendText(channelId, content, replyTo) { sent.push({ kind: "text", channelId, content, replyTo }); },
    async sendFiles(channelId, paths, replyTo) { sent.push({ kind: "files", channelId, paths, replyTo }); },
  };
  const seenSessions = [];
  const processor = createMessageProcessor({
    options: options(workspace),
    discord,
    download: async (message, inbox) => {
      if (!message.attachments?.length) return [];
      await mkdir(inbox, { recursive: true });
      const path = join(inbox, "notice.hwp");
      await writeFile(path, "fixture");
      return [path];
    },
    prepare: async (paths) => paths,
    run: async ({ prompt, sessionId }) => {
      seenSessions.push(sessionId);
      const match = prompt.match(/data-private\/discord-claude\/outbox\/\d+/);
      assert.ok(match);
      const outbox = join(workspace, ...match[0].split("/"));
      await mkdir(outbox, { recursive: true });
      await writeFile(join(outbox, "초기창업패키지_모두봄랩_교육용.hwpx"), "test hwpx fixture\n");
      await writeFile(join(outbox, "evidence.md"), "# 교육용 근거\n");
      return { sessionId: sessionId ?? "d47a43fb-d4b7-4cf5-8c46-782c0c19cd2f", text: "HWPX를 만들었습니다." };
    },
  });
  const first = {
    id: "423456789012345678",
    guild_id: ids.guildId,
    channel_id: ids.channelId,
    author: { id: ids.userId, bot: false },
    content: "첨부한 양식으로 초기창업패키지 제안서를 작성해줘",
    attachments: [{ filename: "notice.hwp" }],
  };
  assert.equal(processor.enqueue(first), true);
  await processor.idle();
  assert.equal(processor.enqueue(first), true);
  await processor.idle();
  const second = { ...first, id: "523456789012345678", content: "방금 만든 제안서의 과장 표현을 줄여줘", attachments: [] };
  processor.enqueue(second);
  await processor.idle();
  assert.deepEqual(seenSessions, [undefined, "d47a43fb-d4b7-4cf5-8c46-782c0c19cd2f"]);
  assert.equal(sent.filter(({ kind }) => kind === "files").length, 2);
  assert.match(await readFile(join(workspace, "data-private", "discord-claude", "state.json"), "utf8"), /d47a43fb-d4b7-4cf5-8c46-782c0c19cd2f/);
});
