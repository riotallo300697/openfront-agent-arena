import fs from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "../../runner/src/headless";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import type { ArenaSessionMatchArtifact } from "./arenaSessionMatchArtifact";
import { createJsonlArenaSessionMatchArtifactStore } from "./arenaSessionMatchArtifactStore";

const tempRoot = path.join(repoRoot, "arena/tmp");
await fs.mkdir(tempRoot, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(tempRoot, "session-artifact-store-"));
const storePath = path.join(tempDir, "session-artifacts.jsonl");

function fixtureArtifact({
  matchID,
  sessionID,
}: {
  matchID: string;
  sessionID: string;
}): ArenaSessionMatchArtifact {
  return {
    agentDecisionTimeoutMs: 1000,
    agents: [
      {
        clientID: "session-agent-a",
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
        name: "Session Agent A",
        slotIndex: 0,
      },
      {
        clientID: "session-agent-b",
        decisions: {
          expired: 1,
          missing: 0,
          pending: 0,
          rejected: 0,
          submitted: 0,
          total: 1,
        },
        finalObservation: {
          hasSpawned: true,
          isAlive: true,
          tick: 1,
          tilesOwned: 10,
        },
        name: "Session Agent B",
        slotIndex: 1,
      },
    ],
    completedAt: "2999-05-18T00:00:01.000Z",
    createdAt: "2999-05-18T00:00:00.000Z",
    decisions: {
      expired: 1,
      missing: 0,
      pending: 0,
      rejected: 0,
      submitted: 1,
      total: 2,
    },
    format: "openfront-agent-arena-session-match-artifact",
    map: "tests/testdata/maps/plains",
    matchID,
    maxTicks: 1,
    replay: {
      format: "openfront-agent-arena-jsonl",
      path: null,
    },
    result: {
      agents: [
        {
          clientID: "session-agent-a",
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
          name: "Session Agent A",
          slotIndex: 0,
        },
        {
          clientID: "session-agent-b",
          decisions: {
            expired: 1,
            missing: 0,
            pending: 0,
            rejected: 0,
            submitted: 0,
            total: 1,
          },
          finalObservation: {
            hasSpawned: true,
            isAlive: true,
            tick: 1,
            tilesOwned: 10,
          },
          name: "Session Agent B",
          slotIndex: 1,
        },
      ],
      decisions: {
        expired: 1,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 1,
        total: 2,
      },
      replay: null,
      ticks: 1,
      updates: null,
    },
    runner: "api-session",
    sessionID,
    status: "completed",
    turns: [
      {
        tick: 1,
        decisions: [
          {
            action: {
              type: "wait",
            },
            clientID: "session-agent-a",
            state: "submitted",
            turnID: "turn-1-session-agent-a",
          },
          {
            action: null,
            clientID: "session-agent-b",
            state: "expired",
            turnID: "turn-1-session-agent-b",
          },
        ],
      },
    ],
    version: 1,
  };
}

async function expectStoreLoadError({
  content,
  expectedText,
  fileName,
}: {
  content: string;
  expectedText: string;
  fileName: string;
}) {
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, content, "utf8");

  let error: unknown = null;
  try {
    await createJsonlArenaSessionMatchArtifactStore(filePath).loadArtifacts();
  } catch (caught) {
    error = caught;
  }

  expectCondition(
    `arena session artifact store rejects ${fileName}`,
    error instanceof Error && error.message.includes(expectedText),
    {
      error: error instanceof Error ? error.message : error,
      expectedText,
      fileName,
    },
  );
}

await expectStoreLoadError({
  fileName: "malformed.jsonl",
  content: "{",
  expectedText: "invalid Arena session artifact JSON at line 1",
});
await expectStoreLoadError({
  fileName: "invalid-record.jsonl",
  content: "{}\n",
  expectedText: "invalid Arena session artifact record at line 1",
});
await expectStoreLoadError({
  fileName: "duplicate-session.jsonl",
  content: `${JSON.stringify(
    fixtureArtifact({
      sessionID: "duplicate-session",
      matchID: "duplicate-session-match-a",
    }),
  )}\n${JSON.stringify(
    fixtureArtifact({
      sessionID: "duplicate-session",
      matchID: "duplicate-session-match-b",
    }),
  )}\n`,
  expectedText: "duplicate Arena session artifact for sessionID duplicate-session",
});
await expectStoreLoadError({
  fileName: "duplicate-match.jsonl",
  content: `${JSON.stringify(
    fixtureArtifact({
      sessionID: "duplicate-match-session-a",
      matchID: "duplicate-match",
    }),
  )}\n${JSON.stringify(
    fixtureArtifact({
      sessionID: "duplicate-match-session-b",
      matchID: "duplicate-match",
    }),
  )}\n`,
  expectedText: "duplicate Arena session artifact for matchID duplicate-match",
});

const store = createJsonlArenaSessionMatchArtifactStore(storePath);
const firstArtifact = fixtureArtifact({
  sessionID: "session-artifact-store-a",
  matchID: "session-artifact-store-match-a",
});
const secondArtifact = fixtureArtifact({
  sessionID: "session-artifact-store-b",
  matchID: "session-artifact-store-match-b",
});

expectJsonEqual("arena session artifact store missing file", await store.loadArtifacts(), []);

await store.saveArtifact(firstArtifact);
await store.saveArtifact(secondArtifact);

const loadedArtifacts = await createJsonlArenaSessionMatchArtifactStore(
  storePath,
).loadArtifacts();
expectJsonEqual("arena session artifact store loaded artifacts", loadedArtifacts, [
  firstArtifact,
  secondArtifact,
]);

const persistedContent = await fs.readFile(storePath, "utf8");
expectCondition(
  "arena session artifact store persisted content",
  persistedContent.includes("session-artifact-store-a") &&
    persistedContent.includes("session-artifact-store-b"),
  { persistedContent, storePath },
);

console.log("OpenFront Agent Arena session match artifact store smoke check passed.");
console.log(
  JSON.stringify(
    {
      storePath,
      artifacts: loadedArtifacts.length,
      rejectedStoreFiles: 4,
    },
    null,
    2,
  ),
);
