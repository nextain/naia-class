import { spawn } from "node:child_process";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const DISCORD_API = "https://discord.com/api/v10";
const ALLOWED_EXTENSIONS = new Set([".hwp", ".hwpx", ".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".md", ".zip", ".png", ".jpg", ".jpeg", ".webp"]);
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_TOTAL_BYTES = 24 * 1024 * 1024;
const MAX_DISCORD_TEXT = 1_900;
const SNOWFLAKE = /^\d{15,22}$/;
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1_000;

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function readPrivateDiscordEnv(workspace) {
  const envPath = join(workspace, "data-private", "discord-claude", ".env");
  let source;
  try {
    source = readFileSync(envPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim();
    if (!/^DISCORD_[A-Z0-9_]+$/.test(name)) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

export function parseOptions(argv, env = process.env) {
  const workspace = resolve(valueAfter(argv, "--workspace") ?? env.NAIA_WORKSPACE ?? ".");
  const privateDiscordEnv = readPrivateDiscordEnv(workspace);
  const options = {
    workspace,
    guildId: valueAfter(argv, "--guild-id") ?? env.DISCORD_GUILD_ID ?? privateDiscordEnv.DISCORD_GUILD_ID,
    channelId: valueAfter(argv, "--channel-id") ?? env.DISCORD_CHANNEL_ID ?? privateDiscordEnv.DISCORD_CHANNEL_ID,
    token: env.DISCORD_BOT_TOKEN ?? privateDiscordEnv.DISCORD_BOT_TOKEN,
    factchatKey: env.JBD_KEY,
    baseUrl: env.ANTHROPIC_BASE_URL ?? "https://factchat-cloud.mindlogic.ai/v1/gateway/claude",
    model: valueAfter(argv, "--model") ?? env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
    idleTimeoutMs: Number(env.DISCORD_SESSION_IDLE_MINUTES ?? 30) * 60_000,
    claudeBin: env.CLAUDE_BIN,
    pythonBin: env.PYTHON_BIN ?? "python",
  };
  for (const [key, value] of Object.entries({ guildId: options.guildId, channelId: options.channelId })) {
    if (!value || !SNOWFLAKE.test(value)) throw new Error(`${key} must be a Discord numeric id`);
  }
  if (!options.token || options.token.length < 30) throw new Error("DISCORD_BOT_TOKEN is missing");
  if (!options.factchatKey || options.factchatKey.length < 12) throw new Error("JBD_KEY is missing");
  if (options.baseUrl !== "https://factchat-cloud.mindlogic.ai/v1/gateway/claude") {
    throw new Error("ANTHROPIC_BASE_URL must be the Jeonju FactChat Claude gateway");
  }
  if (!new Set(["claude-sonnet-4-6", "claude-opus-4-7"]).has(options.model)) {
    throw new Error("Claude model must be claude-sonnet-4-6 or claude-opus-4-7");
  }
  if (!Number.isFinite(options.idleTimeoutMs) || options.idleTimeoutMs <= 0) {
    throw new Error("DISCORD_SESSION_IDLE_MINUTES must be a positive number");
  }
  return options;
}

export function canResumeSession(state, nowMs, idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS) {
  return typeof state?.sessionId === "string"
    && Number.isFinite(state?.updatedAt)
    && nowMs >= state.updatedAt
    && nowMs - state.updatedAt < idleTimeoutMs;
}

export function safeFilename(value) {
  const cleaned = basename(String(value ?? "file"))
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 160);
  return cleaned || "file";
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !resolve(rel).startsWith(sep));
}

function allowedAttachmentUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && (url.hostname === "cdn.discordapp.com" || url.hostname === "media.discordapp.net");
  } catch {
    return false;
  }
}

export function authorizedMessage(message, options) {
  return Boolean(message)
    && message.guild_id === options.guildId
    && message.channel_id === options.channelId
    && message.author?.bot !== true
    && (String(message.content ?? "").trim().length > 0 || message.attachments?.length > 0);
}

export function missionFromRequest(request, attachmentPaths = []) {
  const value = String(request ?? "").trim().toLowerCase();
  if (/(?:proposal|제안서|사업계획서)/.test(value)) return "proposal";
  if (attachmentPaths.some((path) => new Set([".hwp", ".hwpx"]).has(extname(path).toLowerCase()))) return "proposal";
  return "general";
}

export function buildPrompt({ messageId, request, attachmentPaths, outboxPath, workspace }) {
  const attachmentList = attachmentPaths.length
    ? attachmentPaths.map((path) => `- ${relative(workspace, path).split(sep).join("/")}`).join("\n")
    : "- 없음";
  const relativeOutbox = relative(workspace, outboxPath).split(sep).join("/");
  const mission = missionFromRequest(request, attachmentPaths);
  const missionRule = mission === "proposal"
    ? "9. 이번 작업은 제안서 미션입니다. .agents/skills/proposal-writing/SKILL.md 전체를 읽고 그 절차를 따르세요. 첨부 HWP의 원본 표와 항목 순서를 보존하고 data-company/workshop/company.md, achievements.md, proposal-plan.md와 data-private/workshop/profile.md의 교육용 가상 정보를 사용하세요. 먼저 완성 원고를 data-private/discord-claude/temp/proposal.md에 작성하세요. .agents/skills/proposal-writing/scripts/convert_hwp_to_hwpx.ps1로 원본 HWP를 temp의 변환본 HWPX로 만든 뒤, .agents/skills/proposal-writing/scripts/populate_hwpx.py의 --template에 변환본, --content에 완성 원고, --output에 최종 outbox HWPX를 지정하세요. 한컴 COM으로 내용을 직접 입력하거나 HWPX를 처음부터 ZIP/XML 묶음으로 만들지 마세요. 임시 파일과 제작 스크립트는 temp에만 두고 outbox에는 넣지 마세요. 최종 결과는 초기창업패키지_모두봄랩_교육용.hwpx와 evidence.md이며, HWPX를 read-doc으로 다시 읽어 회사명과 문제 인식, 실현 가능성, 성장전략, 팀 구성이 추출되는지 검증하세요. 추출되지 않으면 완료로 보고하지 마세요. 홈페이지 파일은 만들지 마세요."
    : "9. 이 수업의 Discord 원격 작업은 제안서만 허용합니다. HWP/HWPX 양식을 첨부하고 제안서 작성을 요청하라고 안내하며 다른 파일은 만들지 마세요.";
  return [
    "당신은 Discord에서 원격으로 호출된 Claude Code 작업자입니다.",
    `작업 ID: ${messageId}`,
    "",
    "반드시 지킬 작업 계약:",
    "1. 현재 naia-adk 작업공간 밖의 파일을 읽거나 수정하지 마세요.",
    "2. HWP/HWPX/PDF/DOCX/XLSX/PPTX가 있으면 .agents/skills/read-doc/SKILL.md 전체를 먼저 읽고, 제안서는 .agents/skills/proposal-writing/SKILL.md 전체를 이어서 읽으세요. 작업자가 만든 같은 이름의 .txt 추출본을 우선 근거로 사용하세요.",
    "3. 기존 naia-adk 안에서 교육용 제안서 결과만 만드세요.",
    "4. data-private/workshop과 data-company/workshop의 교육용 가상 정보를 사용하세요. 자료에 없는 항목은 메타 설명을 쓰지 말고 빈칸으로 유지하세요.",
    "5. API 키, Discord 토큰, 인증 파일, 환경변수의 값을 읽거나 출력하지 마세요.",
    "6. 외부 게시, Git push, 원격 저장소 생성, 실제 사업 신청, 실제 연락은 수행하지 마세요.",
    `7. 사용자가 받을 결과 파일은 반드시 ${relativeOutbox}/ 아래에 저장하세요.`,
    "8. 이미지가 있으면 Read 도구로 시각적 특징을 확인하되 실제 인물·기업을 추정하지 마세요.",
    missionRule,
    "10. 마지막 답변에는 수행 결과와 검증 내용만 간단히 적으세요.",
    "",
    "Discord 요청:",
    request || "첨부 문서를 분석하고 교육용 결과물을 만들어 주세요.",
    "",
    "내려받은 첨부파일과 추출본:",
    attachmentList,
  ].join("\n");
}

export function parseClaudeResult(output) {
  const value = JSON.parse(String(output).trim());
  if (value?.type !== "result") throw new Error("Claude Code returned no result object");
  return {
    sessionId: typeof value.session_id === "string" ? value.session_id : undefined,
    text: typeof value.result === "string" ? value.result.trim() : "",
  };
}

export function discordChunks(text) {
  const source = String(text || "작업을 마쳤지만 텍스트 보고가 없습니다.").trim();
  const chunks = [];
  for (let offset = 0; offset < source.length; offset += MAX_DISCORD_TEXT) {
    chunks.push(source.slice(offset, offset + MAX_DISCORD_TEXT));
  }
  return chunks.length ? chunks : ["작업을 마쳤습니다."];
}

async function downloadAttachments(message, inboxPath, fetchFn = fetch) {
  const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, MAX_ATTACHMENTS) : [];
  await mkdir(inboxPath, { recursive: true });
  const paths = [];
  for (const attachment of attachments) {
    const extension = extname(String(attachment.filename ?? "")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error(`unsupported attachment type: ${extension || "none"}`);
    if (!Number.isSafeInteger(attachment.size) || attachment.size <= 0 || attachment.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("attachment size is not allowed");
    }
    if (!allowedAttachmentUrl(attachment.url)) throw new Error("attachment URL is not allowed");
    const target = join(inboxPath, safeFilename(attachment.filename));
    if (!inside(inboxPath, target)) throw new Error("attachment path escaped inbox");
    const response = await fetchFn(attachment.url);
    if (!response.ok || !response.body) throw new Error("attachment download failed");
    await pipeline(response.body, createWriteStream(target, { flags: "wx" }));
    const downloaded = await stat(target);
    if (downloaded.size !== attachment.size) throw new Error("attachment size changed during download");
    paths.push(target);
  }
  return paths;
}

export async function prepareDocumentSidecars(paths, options, spawnFn = spawn) {
  const extractable = new Set([".hwp", ".hwpx", ".pdf", ".docx", ".xlsx", ".pptx"]);
  const script = join(options.workspace, ".agents", "skills", "read-doc", "scripts", "extract_doc.py");
  const tempPath = join(options.workspace, "data-private", "discord-claude", "temp");
  await mkdir(tempPath, { recursive: true });
  const prepared = [...paths];
  for (const path of paths) {
    if (!extractable.has(extname(path).toLowerCase())) continue;
    const sidecar = path.replace(/\.[^.]+$/, ".txt");
    const output = await new Promise((resolvePromise, reject) => {
      const child = spawnFn(options.pythonBin ?? "python", [script, path], {
        cwd: options.workspace,
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
          TEMP: tempPath,
          TMP: tempPath,
        },
        windowsHide: true,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.length > 2_000_000) child.kill();
      });
      child.stderr?.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(`read-doc extraction failed for ${basename(path)}: ${stderr.slice(-240)}`));
        if (!stdout.trim()) return reject(new Error(`read-doc extracted no text from ${basename(path)}`));
        resolvePromise(stdout);
      });
    });
    await writeFile(sidecar, output, "utf8");
    prepared.push(sidecar);
  }
  return prepared;
}
async function collectFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (!inside(root, path)) throw new Error("outbox path escaped root");
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  await visit(root);
  output.sort();
  if (output.length > MAX_ATTACHMENTS) throw new Error("too many output files");
  let total = 0;
  for (const path of output) {
    const info = await stat(path);
    if (info.size > MAX_OUTPUT_BYTES) throw new Error("output file is too large");
    total += info.size;
    if (total > MAX_OUTPUT_TOTAL_BYTES) throw new Error("output files are too large");
  }
  return output;
}

function defaultClaudeCommand(options) {
  if (options.claudeBin) return { command: resolve(options.claudeBin), prefix: [] };
  if (process.platform === "win32") {
    const native = join(process.env.USERPROFILE ?? "", ".local", "bin", "claude.exe");
    if (existsSync(native)) return { command: native, prefix: [] };
    // npm 설치의 claude.cmd를 shell:true로 실행하면 Discord 프롬프트가 셸에 주입될 수 있다.
    // 같은 패키지의 cli.js를 현재 Node로 직접 실행해 인수 경계를 보존한다.
    const npmCli = join(
      process.env.APPDATA ?? "",
      "npm", "node_modules", "@anthropic-ai", "claude-code", "cli.js",
    );
    if (existsSync(npmCli)) return { command: process.execPath, prefix: [npmCli] };
  }
  return { command: "claude", prefix: [] };
}

export async function runClaude({ options, prompt, sessionId, spawnFn = spawn }) {
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--model", options.model,
    "--max-turns", "30",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash",
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
  const childEnv = {
    ...process.env,
    ANTHROPIC_BASE_URL: options.baseUrl,
    ANTHROPIC_AUTH_TOKEN: options.factchatKey,
    // The worker already has a strict prompt, tool allowlist, and outbox boundary.
    // Avoid blocking an unattended Discord request on a local harness session.
    CLAUDE_HARNESS: "off",
  };
  delete childEnv.ANTHROPIC_API_KEY;
  delete childEnv.JBD_KEY;
  delete childEnv.DISCORD_BOT_TOKEN;
  delete childEnv.DISCORD_GUILD_ID;
  delete childEnv.DISCORD_CHANNEL_ID;
  delete childEnv.CLAUDECODE;
  delete childEnv.CLAUDE_CODE_ENTRYPOINT;
  return await new Promise((resolvePromise, reject) => {
    const executable = defaultClaudeCommand(options);
    const child = spawnFn(executable.command, [...executable.prefix, ...args], {
      cwd: options.workspace,
      env: childEnv,
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        const diagnostic = [stderr, stdout].map((value) => value.trim()).filter(Boolean).join(" | ").slice(-600);
        return reject(new Error(`Claude Code exited with code ${code}: ${diagnostic || "no diagnostic output"}`));
      }
      try { resolvePromise(parseClaudeResult(stdout)); }
      catch (error) { reject(new Error(`Claude Code JSON parse failed: ${error instanceof Error ? error.message : "unknown"}`)); }
    });
  });
}

function discordClient(token, fetchFn = fetch) {
  const headers = { Authorization: `Bot ${token}` };
  return {
    async gatewayUrl() {
      const response = await fetchFn(`${DISCORD_API}/gateway/bot`, { headers });
      if (!response.ok) throw new Error(`Discord gateway lookup failed (${response.status})`);
      return (await response.json()).url;
    },
    async sendText(channelId, content, replyTo) {
      const response = await fetchFn(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          allowed_mentions: { parse: [], replied_user: false },
          ...(replyTo ? { message_reference: { message_id: replyTo, fail_if_not_exists: false } } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Discord text send failed (${response.status})`);
    },
    async sendFiles(channelId, files, replyTo) {
      if (!files.length) return;
      const form = new FormData();
      form.set("payload_json", JSON.stringify({
        content: "결과 파일입니다.",
        allowed_mentions: { parse: [], replied_user: false },
        message_reference: { message_id: replyTo, fail_if_not_exists: false },
        attachments: files.map((path, index) => ({ id: index, filename: safeFilename(path) })),
      }));
      for (const [index, path] of files.entries()) {
        const bytes = await readFile(path);
        form.set(`files[${index}]`, new Blob([bytes]), safeFilename(path));
      }
      const response = await fetchFn(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!response.ok) throw new Error(`Discord file send failed (${response.status})`);
    },
  };
}

async function loadState(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    return {
      sessionId: typeof value.sessionId === "string" ? value.sessionId : undefined,
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : undefined,
      processed: Array.isArray(value.processed) ? value.processed.filter((id) => SNOWFLAKE.test(id)).slice(-100) : [],
    };
  } catch {
    return { sessionId: undefined, updatedAt: undefined, processed: [] };
  }
}

async function saveState(path, state) {
  await mkdir(resolve(path, ".."), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await import("node:fs/promises").then(({ rename }) => rename(temporary, path));
}

export function createMessageProcessor({ options, discord, download = downloadAttachments, prepare = prepareDocumentSidecars, run = runClaude, files = collectFiles, now = () => Date.now() }) {
  const privateRoot = join(options.workspace, "data-private", "discord-claude");
  const statePath = join(privateRoot, "state.json");
  let queue = Promise.resolve();
  return {
    enqueue(message) {
      if (!authorizedMessage(message, options)) return false;
      queue = queue.then(async () => {
        const state = await loadState(statePath);
        if (state.processed.includes(message.id)) return;
        await discord.sendText(options.channelId, "요청을 받았습니다. Claude Code가 작업을 시작합니다.", message.id);
        try {
          const inboxPath = join(privateRoot, "inbox", message.id);
          const outboxPath = join(privateRoot, "outbox", message.id);
          const downloadedPaths = await download(message, inboxPath);
          const attachmentPaths = await prepare(downloadedPaths, options);
          await mkdir(outboxPath, { recursive: true });
          const request = String(message.content ?? "").trim();
          const mission = missionFromRequest(request, attachmentPaths);
          const missionLabel = mission === "proposal" ? "제안서" : "안내";
          await discord.sendText(options.channelId, `첨부 준비를 마쳤습니다. ${missionLabel} 미션을 실행합니다.`, message.id);
          const prompt = buildPrompt({ messageId: message.id, request, attachmentPaths, outboxPath, workspace: options.workspace });
          const resumeSessionId = downloadedPaths.length === 0 && canResumeSession(state, now(), options.idleTimeoutMs)
            ? state.sessionId
            : undefined;
          const result = await run({ options, prompt, sessionId: resumeSessionId });
          const deliverables = (await files(outboxPath)).filter((path) => {
            const name = basename(path).toLowerCase();
            return extname(name) === ".hwpx" || name === "evidence.md";
          });
          const hwpxFiles = deliverables.filter((path) => extname(path).toLowerCase() === ".hwpx");
          if (!hwpxFiles.length) throw new Error("Claude Code created no HWPX deliverable");
          const verifiedPaths = await prepare(hwpxFiles, options);
          const verificationText = (await Promise.all(
            verifiedPaths
              .filter((path) => extname(path).toLowerCase() === ".txt")
              .map((path) => readFile(path, "utf8")),
          )).join("\n");
          for (const required of ["모두봄랩", "문제 인식", "실현 가능성", "성장전략", "팀 구성"]) {
            if (!verificationText.includes(required)) throw new Error(`HWPX verification is missing: ${required}`);
          }
          const nextState = {
            sessionId: result.sessionId ?? state.sessionId,
            updatedAt: now(),
            processed: [...state.processed, message.id].slice(-100),
          };
          await saveState(statePath, nextState);
          for (const chunk of discordChunks(result.text)) await discord.sendText(options.channelId, chunk, message.id);
          await discord.sendFiles(options.channelId, deliverables, message.id);
        } catch (error) {
          const reason = error instanceof Error ? error.message.replace(/[\r\n]+/g, " ").slice(0, 240) : "unknown error";
          await discord.sendText(options.channelId, `작업에 실패했습니다: ${reason}`, message.id);
        }
      }).catch((error) => {
        process.stderr.write(`[discord-claude] queue error: ${error instanceof Error ? error.message : "unknown"}\n`);
      });
      return true;
    },
    idle: () => queue,
  };
}

async function connectGateway(options, processor, discord) {
  const gateway = await discord.gatewayUrl();
  const socket = new WebSocket(`${gateway}?v=10&encoding=json`);
  let heartbeat;
  let sequence = null;
  let heartbeatAcknowledged = true;
  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(String(event.data));
    if (Number.isSafeInteger(payload.s)) sequence = payload.s;
    if (payload.op === 10) {
      heartbeat = setInterval(() => {
        if (!heartbeatAcknowledged) return socket.close(4000, "heartbeat timeout");
        heartbeatAcknowledged = false;
        socket.send(JSON.stringify({ op: 1, d: sequence }));
      }, payload.d.heartbeat_interval);
      socket.send(JSON.stringify({
        op: 2,
        d: {
          token: options.token,
          intents: 1 | 512 | 32768,
          properties: { os: "windows", browser: "naia-discord-claude", device: "naia-discord-claude" },
        },
      }));
    } else if (payload.op === 11) {
      heartbeatAcknowledged = true;
    } else if (payload.op === 0 && payload.t === "READY") {
      process.stdout.write(`[discord-claude] ready as ${payload.d.user?.id ?? "unknown"}\n`);
    } else if (payload.op === 0 && payload.t === "MESSAGE_CREATE") {
      processor.enqueue(payload.d);
    } else if (payload.op === 7 || payload.op === 9) {
      socket.close(4000, "reconnect");
    }
  });
  return await new Promise((resolvePromise) => {
    socket.addEventListener("close", () => {
      if (heartbeat) clearInterval(heartbeat);
      resolvePromise();
    });
    socket.addEventListener("error", () => socket.close());
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  for (const required of [
    join(options.workspace, ".agents", "skills", "read-doc", "SKILL.md"),
    join(options.workspace, ".agents", "skills", "proposal-writing", "SKILL.md"),
  ]) {
    if (!existsSync(required)) throw new Error(`required naia-adk skill missing: ${relative(options.workspace, required)}`);
  }
  const discord = discordClient(options.token);
  const processor = createMessageProcessor({ options, discord });
  process.stdout.write(`[discord-claude] watching guild=${options.guildId} channel=${options.channelId}\n`);
  for (;;) {
    try {
      await connectGateway(options, processor, discord);
    } catch (error) {
      process.stderr.write(`[discord-claude] gateway reconnect: ${error instanceof Error ? error.message : "unknown"}\n`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 3_000));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(`[discord-claude] fatal: ${error instanceof Error ? error.message : "unknown"}\n`);
    process.exitCode = 1;
  });
}
