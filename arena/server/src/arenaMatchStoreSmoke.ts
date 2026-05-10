import fs from "node:fs/promises";
import path from "node:path";

import { startHttpExampleAgentPair } from "../../agents/httpExampleAgentLauncher";
import { repoRoot } from "../../runner/src/headless";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "./arenaApiServer";
import { createJsonlArenaMatchStore } from "./arenaMatchStore";

const tempRoot = path.join(repoRoot, "arena/tmp");
await fs.mkdir(tempRoot, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(tempRoot, "match-store-"));
const storePath = path.join(tempDir, "matches.jsonl");
const matchID = "arena-match-store-smoke";
const agentPair = await startHttpExampleAgentPair({
  agentAPort: 0,
  agentBPort: 0,
});

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
  const firstServer = await startArenaApiServer({
    matchStore: createJsonlArenaMatchStore(storePath),
  });
  try {
    const createdRecord = (await createMatch(firstServer.url)) as {
      matchID?: unknown;
      result?: {
        replay?: unknown;
        ticks?: unknown;
      };
      replay?: {
        path?: unknown;
      };
    };
    expectJsonEqual("arena match store created id", createdRecord.matchID, matchID);
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
      result?: {
        ticks?: unknown;
      };
    };
    expectJsonEqual("arena match store loaded id", loadedRecord.matchID, matchID);
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
      },
      null,
      2,
    ),
  );
} finally {
  await agentPair.close();
  await fs.rm(tempDir, { recursive: true, force: true });
}
