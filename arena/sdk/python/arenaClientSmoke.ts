import { spawn } from "node:child_process";
import { startHttpExampleAgentPair } from "../../agents/httpExampleAgentLauncher";
import { expectCondition } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "../../server/src/arenaApiServer";

const server = await startArenaApiServer();
const agentPair = await startHttpExampleAgentPair({
  agentAPort: 0,
  agentBPort: 0,
});

function runPythonSmoke(): Promise<{
  status: number | null;
  stdout: string;
  stderr: string;
}> {
  const child = spawn("python", [
    "arena/sdk/python/arena_client_smoke.py",
    "--base-url",
    server.url,
    "--agent-a-endpoint",
    agentPair.agents[0].endpoint,
    "--agent-b-endpoint",
    agentPair.agents[1].endpoint,
  ]);
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    stdout += text;
    process.stdout.write(text);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    stderr += text;
    process.stderr.write(text);
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({
        status,
        stdout,
        stderr,
      });
    });
  });
}

try {
  const result = await runPythonSmoke();
  expectCondition("python sdk smoke exit status", result.status === 0, {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  });
} finally {
  await agentPair.close();
  await server.close();
}
