import fs from "node:fs/promises";
import path from "node:path";

import { startHttpExampleAgentPair } from "../../agents/httpExampleAgentLauncher";
import { repoRoot } from "../../runner/src/headless";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "./arenaApiServer";
import {
  createJsonlArenaMatchStore,
  type ArenaMatchRecord,
} from "./arenaMatchStore";

const tempRoot = path.join(repoRoot, "arena/tmp");
await fs.mkdir(tempRoot, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(tempRoot, "match-store-"));
const storePath = path.join(tempDir, "matches.jsonl");
const matchID = "arena-match-store-smoke";
const agentPair = await startHttpExampleAgentPair({
  agentAPort: 0,
  agentBPort: 0,
});

function fixtureRecord(matchIDValue: string): ArenaMatchRecord {
  return {
    matchID: matchIDValue,
    status: "completed",
    createdAt: "2026-05-10T00:00:00.000Z",
    completedAt: "2026-05-10T00:00:01.000Z",
    map: "tests/testdata/maps/plains",
    maxTicks: 1,
    agentDecisionTimeoutMs: 1000,
    runner: "api-http",
    agents: [
      {
        clientID: "fixture-a",
        name: "Fixture A",
        endpoint: "http://127.0.0.1:3001/decide",
        spawn: {
          x: 1,
          y: 1,
        },
      },
      {
        clientID: "fixture-b",
        name: "Fixture B",
        endpoint: "http://127.0.0.1:3002/decide",
        spawn: {
          x: 2,
          y: 2,
        },
      },
    ],
    result: {
      matchID: matchIDValue,
      ticks: 1,
      updates: 1,
      attackIntents: 0,
      rejectedActions: 0,
      agents: [],
      replay: `arena/replays/${matchIDValue}.jsonl`,
    },
    replay: {
      format: "openfront-agent-arena-jsonl",
      path: `arena/replays/${matchIDValue}.jsonl`,
    },
  };
}

async function expectStoreLoadError({
  expectedText,
  fileName,
  content,
}: {
  expectedText: string;
  fileName: string;
  content: string;
}): Promise<void> {
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, content, "utf8");

  let error: unknown = null;
  try {
    await createJsonlArenaMatchStore(filePath).loadMatches();
  } catch (caught) {
    error = caught;
  }

  expectCondition(
    `arena match store rejects ${fileName}`,
    error instanceof Error && error.message.includes(expectedText),
    {
      error: error instanceof Error ? error.message : error,
      expectedText,
      fileName,
    },
  );
}

async function createMatch(baseUrl: string): Promise<unknown> {
  const response = await fetch(`${baseUrl}/arena/matches`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      matchID,
      map: "tests/testdata/maps/plains",
      maxTicks: 3,
      agentDecisionTimeoutMs: 1000,
      agents: agentPair.agents.map((agent) => ({
        clientID: agent.clientID,
        name: agent.name,
        endpoint: agent.endpoint,
        spawn: agent.spawn,
      })),
    }),
  });
  const body = (await response.json()) as unknown;

  expectCondition("arena match store create match status", response.status === 200, {
    status: response.status,
    body,
  });

  return body;
}

async function readJson(baseUrl: string, pathName: string): Promise<unknown> {
  const response = await fetch(`${baseUrl}${pathName}`);
  const body = (await response.json()) as unknown;

  expectCondition("arena match store read status", response.status === 200, {
    status: response.status,
    body,
    pathName,
  });

  return body;
}

try {
  await expectStoreLoadError({
    fileName: "malformed.jsonl",
    content: "{",
    expectedText: "invalid Arena match store JSON at line 1",
  });
  await expectStoreLoadError({
    fileName: "invalid-record.jsonl",
    content: "{}\n",
    expectedText: "invalid Arena match store record at line 1",
  });
  await expectStoreLoadError({
    fileName: "duplicate-record.jsonl",
    content: `${JSON.stringify(fixtureRecord("duplicate-store-match"))}\n${JSON.stringify(
      fixtureRecord("duplicate-store-match"),
    )}\n`,
    expectedText:
      "duplicate Arena match store record for matchID duplicate-store-match",
  });

  const firstServer = await startArenaApiServer({
    matchStore: createJsonlArenaMatchStore(storePath),
  });
  try {
    const createdRecord = (await createMatch(firstServer.url)) as {
      matchID?: unknown;
      map?: unknown;
      maxTicks?: unknown;
      agentDecisionTimeoutMs?: unknown;
      runner?: unknown;
      agents?: unknown;
      result?: {
        replay?: unknown;
        ticks?: unknown;
      };
      replay?: {
        path?: unknown;
      };
    };
    expectJsonEqual("arena match store created id", createdRecord.matchID, matchID);
    expectJsonEqual(
      "arena match store created request metadata",
      {
        map: createdRecord.map,
        maxTicks: createdRecord.maxTicks,
        agentDecisionTimeoutMs: createdRecord.agentDecisionTimeoutMs,
        runner: createdRecord.runner,
      },
      {
        map: "tests/testdata/maps/plains",
        maxTicks: 3,
        agentDecisionTimeoutMs: 1000,
        runner: "api-http",
      },
    );
    expectJsonEqual(
      "arena match store created agents",
      createdRecord.agents,
      agentPair.agents.map((agent) => ({
        clientID: agent.clientID,
        name: agent.name,
        endpoint: agent.endpoint,
        spawn: agent.spawn,
      })),
    );
    expectJsonEqual("arena match store created ticks", createdRecord.result?.ticks, 3);
    expectJsonEqual(
      "arena match store replay metadata path",
      createdRecord.replay?.path,
      createdRecord.result?.replay,
    );
  } finally {
    await firstServer.close();
  }

  const persistedContent = await fs.readFile(storePath, "utf8");
  expectCondition(
    "arena match store persisted content",
    persistedContent.includes(matchID),
    { storePath, persistedContent },
  );

  const secondServer = await startArenaApiServer({
    matchStore: createJsonlArenaMatchStore(storePath),
  });
  try {
    const listedMatches = (await readJson(secondServer.url, "/arena/matches")) as {
      matches?: {
        matchID?: unknown;
      }[];
    };
    expectJsonEqual(
      "arena match store loaded list",
      Array.isArray(listedMatches.matches)
        ? listedMatches.matches.map((record) => record.matchID)
        : [],
      [matchID],
    );

    const loadedRecord = (await readJson(
      secondServer.url,
      `/arena/matches/${matchID}`,
    )) as {
      matchID?: unknown;
      map?: unknown;
      maxTicks?: unknown;
      agentDecisionTimeoutMs?: unknown;
      runner?: unknown;
      agents?: unknown;
      result?: {
        ticks?: unknown;
      };
    };
    expectJsonEqual("arena match store loaded id", loadedRecord.matchID, matchID);
    expectJsonEqual(
      "arena match store loaded request metadata",
      {
        map: loadedRecord.map,
        maxTicks: loadedRecord.maxTicks,
        agentDecisionTimeoutMs: loadedRecord.agentDecisionTimeoutMs,
        runner: loadedRecord.runner,
      },
      {
        map: "tests/testdata/maps/plains",
        maxTicks: 3,
        agentDecisionTimeoutMs: 1000,
        runner: "api-http",
      },
    );
    expectJsonEqual(
      "arena match store loaded agents",
      loadedRecord.agents,
      agentPair.agents.map((agent) => ({
        clientID: agent.clientID,
        name: agent.name,
        endpoint: agent.endpoint,
        spawn: agent.spawn,
      })),
    );
    expectJsonEqual("arena match store loaded ticks", loadedRecord.result?.ticks, 3);
  } finally {
    await secondServer.close();
  }

  console.log("OpenFront Agent Arena match store smoke check passed.");
  console.log(
    JSON.stringify(
      {
        storePath,
        matchID,
        rejectedStoreFiles: 3,
      },
      null,
      2,
    ),
  );
} finally {
  await agentPair.close();
  await fs.rm(tempDir, { recursive: true, force: true });
}
