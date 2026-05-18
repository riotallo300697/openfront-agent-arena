import { spawn } from "node:child_process";
import { startHttpExampleAgentPair } from "../../agents/httpExampleAgentLauncher";
import { expectCondition } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "../../server/src/arenaApiServer";
import type { ArenaSessionCompletionSummary } from "../../server/src/arenaSessionCompletion";
import {
  buildArenaSessionMatchArtifact,
  buildArenaSessionMatchArtifactSummary,
} from "../../server/src/arenaSessionMatchArtifact";

const sessionCompletion: ArenaSessionCompletionSummary = {
  agentDecisionTimeoutMs: 1000,
  agents: [
    {
      clientID: "python-sdk-session-agent-a",
      decisions: {
        expired: 0,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 1,
        total: 1,
      },
      finalObservation: {
        hasSpawned: true,
        isAlive: true,
        tick: 1,
        tilesOwned: 12,
      },
      name: "Python SDK Session Agent A",
      slotIndex: 0,
    },
    {
      clientID: "python-sdk-session-agent-b",
      decisions: {
        expired: 0,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 1,
        total: 1,
      },
      finalObservation: {
        hasSpawned: true,
        isAlive: true,
        tick: 1,
        tilesOwned: 10,
      },
      name: "Python SDK Session Agent B",
      slotIndex: 1,
    },
  ],
  completedAt: "2999-05-18T00:00:01.000Z",
  createdAt: "2999-05-18T00:00:00.000Z",
  currentTick: 1,
  decisions: {
    expired: 0,
    missing: 0,
    pending: 0,
    rejected: 0,
    submitted: 2,
    total: 2,
  },
  map: "tests/testdata/maps/plains",
  matchID: "arena-sdk-python-session-artifact-match",
  maxTicks: 1,
  replay: null,
  runner: "api-session",
  sessionID: "arena-sdk-python-session-artifact",
  status: "completed",
  ticks: 1,
  turns: [
    {
      tick: 1,
      decisions: [
        {
          action: {
            type: "wait",
          },
          clientID: "python-sdk-session-agent-a",
          state: "submitted",
          turnID: "turn-1-python-sdk-session-agent-a",
        },
        {
          action: {
            type: "wait",
          },
          clientID: "python-sdk-session-agent-b",
          state: "submitted",
          turnID: "turn-1-python-sdk-session-agent-b",
        },
      ],
    },
  ],
};
const sessionArtifact = buildArenaSessionMatchArtifact(sessionCompletion);
const sessionArtifactSummary = buildArenaSessionMatchArtifactSummary(sessionArtifact);
const server = await startArenaApiServer({
  sessionMatchArtifacts: new Map([[sessionArtifact.sessionID, sessionArtifact]]),
});
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
    "--session-artifact-id",
    sessionArtifact.sessionID,
    "--session-artifact",
    JSON.stringify(sessionArtifact),
    "--session-artifact-summary",
    JSON.stringify(sessionArtifactSummary),
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
