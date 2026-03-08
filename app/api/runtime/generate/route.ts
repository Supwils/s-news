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

const RUN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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
  const scriptPath = path.join(projectRoot, "scripts", scriptName);

  try {
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
      cwd: projectRoot,
      timeout: RUN_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
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
        error: timedOut ? "Run timed out (5 min)" : (nodeErr as Error).message,
        code: nodeErr.code,
        stdout,
        stderr,
      },
      { status: 200 },
    );
  }
}
