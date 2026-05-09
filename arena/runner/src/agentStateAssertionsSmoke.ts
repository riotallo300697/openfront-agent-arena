import { expectAgentsSpawnedAliveWithTiles } from "./agentStateAssertions";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type { AgentReplaySummary } from "./types";

const expectedAgents = [
  {
    agent: "StateAssertA",
    clientID: "state-assert-a",
  },
  {
    agent: "StateAssertB",
    clientID: "state-assert-b",
  },
];

const validAgents: AgentReplaySummary[] = [
  {
    agent: "StateAssertA",
    clientID: "state-assert-a",
    hasSpawned: true,
    tilesOwned: 10,
    isAlive: true,
  },
  {
    agent: "StateAssertB",
    clientID: "state-assert-b",
    hasSpawned: true,
    tilesOwned: 5,
    isAlive: true,
  },
];

function expectThrows(name: string, check: () => void) {
  let didThrow = false;

  try {
    check();
  } catch {
    didThrow = true;
  }

  expectCondition(name, didThrow, {});
}

expectAgentsSpawnedAliveWithTiles({
  name: "agent state smoke valid",
  agents: validAgents,
  expectedAgents,
});

expectThrows("agent state smoke missing agent", () => {
  expectAgentsSpawnedAliveWithTiles({
    name: "agent state smoke missing",
    agents: validAgents.slice(0, 1),
    expectedAgents,
  });
});

expectThrows("agent state smoke unspawned agent", () => {
  expectAgentsSpawnedAliveWithTiles({
    name: "agent state smoke unspawned",
    agents: [
      validAgents[0],
      {
        ...validAgents[1],
        hasSpawned: false,
      },
    ],
    expectedAgents,
  });
});

expectThrows("agent state smoke agent owns no tiles", () => {
  expectAgentsSpawnedAliveWithTiles({
    name: "agent state smoke no tiles",
    agents: [
      validAgents[0],
      {
        ...validAgents[1],
        tilesOwned: 0,
      },
    ],
    expectedAgents,
  });
});

expectThrows("agent state smoke dead agent", () => {
  expectAgentsSpawnedAliveWithTiles({
    name: "agent state smoke dead",
    agents: [
      validAgents[0],
      {
        ...validAgents[1],
        isAlive: false,
      },
    ],
    expectedAgents,
  });
});

expectJsonEqual("agent state smoke valid agent count", validAgents.length, 2);

console.log("OpenFront Agent Arena agent state assertions smoke check passed.");
console.log(
  JSON.stringify(
    {
      validAgents: validAgents.length,
      rejectedCases: 4,
    },
    null,
    2,
  ),
);
