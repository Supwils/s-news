import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";

const execAsync = promisify(exec);

const TOPIC_SCRIPT_MAP: Record<string, string> = {
  general: "run-general-news.sh",
  finance: "run-finance-news.sh",
  "ai-tech": "run-aitech-news.sh",
  science: "run-science-news.sh",
  crypto: "run-crypto-news.sh",
  "energy-climate": "run-energy-climate-news.sh",
  "auto-mobility": "run-auto-mobility-news.sh",
  gaming: "run-gaming-news.sh",
  "supply-chain": "run-supply-chain-news.sh",
  all: "run_all_news.sh",
};

/** Order for "run all" (same as run_all_news.sh). Each topic runs in its own exec to avoid one long timeout. */
const ALL_TOPICS_ORDER: string[] = [
  "general",
  "finance",
  "ai-tech",
  "science",
  "crypto",
  "energy-climate",
  "auto-mobility",
  "gaming",
  "supply-chain",
];

const RUN_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes (single-topic)
const RUN_ALL_PER_TOPIC_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes per topic when running all

function isAllowedHost(request: NextRequest): boolean {
  if (process.env.VERCEL) {
    return false;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const allowed = process.env.ALLOWED_RUNTIME_HOST;
  if (allowed) {
    return host === allowed || host.startsWith(`${allowed}:`);
  }
  return host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ allowed: isAllowedHost(request) });
}

export async function POST(request: NextRequest) {
  if (!isAllowedHost(request)) {
    return NextResponse.json({ ok: false, error: "Runtime only allowed on localhost or ALLOWED_RUNTIME_HOST" }, { status: 403 });
  }

  let body: { topic?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = body?.topic;
  const scriptName = topic && TOPIC_SCRIPT_MAP[topic];
  if (!scriptName) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid topic. Use: general | finance | ai-tech | science | crypto | energy-climate | auto-mobility | gaming | supply-chain | all" },
      { status: 400 },
    );
  }

  const projectRoot = process.cwd();

  // Run all topics as a stream: one exec per topic, progress events + terminal logs
  if (topic === "all") {
    const total = ALL_TOPICS_ORDER.length;
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const write = (obj: object) => {
          controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
        };
        let aggregateStdout = "";
        let aggregateStderr = "";
        try {
          for (let i = 0; i < total; i++) {
            const topicKey = ALL_TOPICS_ORDER[i];
            const script = TOPIC_SCRIPT_MAP[topicKey];
            if (!script) continue;
            const scriptPath = path.join(projectRoot, "scripts", script);
            const done = i + 1;
            console.log(`[Runtime] Starting topic ${done}/${total}: ${topicKey}`);
            write({ type: "progress", topic: topicKey, done: i, total, current: topicKey });
            try {
              const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
                cwd: projectRoot,
                timeout: RUN_ALL_PER_TOPIC_TIMEOUT_MS,
                maxBuffer: 5 * 1024 * 1024,
              });
              aggregateStdout += (stdout ?? "") + "\n";
              if (stderr) aggregateStderr += stderr + "\n";
              console.log(`[Runtime] Finished topic ${done}/${total}: ${topicKey}`);
              write({ type: "progress", topic: topicKey, done, total, current: null });
            } catch (err: unknown) {
              const nodeErr = err as { killed?: boolean; code?: number; stdout?: string; stderr?: string; message?: string };
              aggregateStdout += nodeErr.stdout?.slice(-2000) ?? "";
              aggregateStderr += nodeErr.stderr?.slice(-2000) ?? "";
              const timedOut = nodeErr.killed === true;
              const errorMsg = timedOut ? "Run timed out (8 min per topic)" : (nodeErr as Error).message;
              console.error(`[Runtime] Failed topic ${done}/${total}: ${topicKey}`, errorMsg);
              write({
                type: "done",
                ok: false,
                topic: "all",
                error: errorMsg,
                code: nodeErr.code,
                stdout: aggregateStdout.slice(-4000),
                stderr: aggregateStderr.slice(-2000),
              });
              controller.close();
              return;
            }
          }
          write({
            type: "done",
            ok: true,
            topic: "all",
            stdout: aggregateStdout.slice(-4000),
            stderr: aggregateStderr.slice(-2000) ? aggregateStderr.slice(-2000) : undefined,
          });
        } catch (err) {
          console.error("[Runtime] Run-all stream error", err);
          write({ type: "done", ok: false, topic: "all", error: (err as Error).message });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  // Single topic: one exec, return JSON when done
  const scriptPath = path.join(projectRoot, "scripts", scriptName);
  try {
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
      cwd: projectRoot,
      timeout: RUN_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024,
    });
    return NextResponse.json({
      ok: true,
      topic,
      stdout: stdout?.slice(-4000) ?? "",
      stderr: stderr?.slice(-2000) ?? "",
    });
  } catch (err: unknown) {
    const nodeErr = err as { killed?: boolean; signal?: string; code?: number; stdout?: string; stderr?: string };
    const stdout = nodeErr.stdout?.slice(-4000) ?? "";
    const stderr = nodeErr.stderr?.slice(-2000) ?? "";
    const timedOut = nodeErr.killed === true || nodeErr.signal === "SIGTERM";
    return NextResponse.json(
      {
        ok: false,
        topic,
        error: timedOut ? "Run timed out (20 min)" : (nodeErr as Error).message,
        code: nodeErr.code,
        stdout,
        stderr,
      },
      { status: 200 },
    );
  }
}
