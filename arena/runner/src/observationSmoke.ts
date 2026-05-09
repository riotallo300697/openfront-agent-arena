import type { Turn } from "../../../src/core/Schemas";
import { createHeadlessGameRunner } from "./headless";
import { buildObservation } from "./observation";
import { expectCondition } from "./smokeAssert";
import type { AgentObservation } from "./types";

const players = [
  {
    username: "ObservationA",
    clientID: "observation-a",
    isLobbyCreator: true,
  },
  {
    username: "ObservationB",
    clientID: "observation-b",
  },
];

function findObservedPlayer(observation: AgentObservation, clientID: string) {
  return observation.players.find((player) => player.clientID === clientID);
}

function expectObservationForSelf(
  label: string,
  observation: AgentObservation,
  expected: {
    tick: number;
    clientID: string;
    name: string;
    hasSpawned: boolean;
    minTilesOwned: number;
  },
) {
  expectCondition(`${label}: tick`, observation.tick === expected.tick, {
    expected: expected.tick,
    actual: observation.tick,
  });
  expectCondition(`${label}: self client ID`, observation.self.clientID === expected.clientID, {
    expected: expected.clientID,
    actual: observation.self.clientID,
  });
  expectCondition(`${label}: self name`, observation.self.name === expected.name, {
    expected: expected.name,
    actual: observation.self.name,
  });
  expectCondition(
    `${label}: self spawn status`,
    observation.self.hasSpawned === expected.hasSpawned,
    {
      expected: expected.hasSpawned,
      actual: observation.self.hasSpawned,
    },
  );
  expectCondition(
    `${label}: self owned tiles`,
    observation.self.tilesOwned >= expected.minTilesOwned,
    {
      minExpected: expected.minTilesOwned,
      actual: observation.self.tilesOwned,
    },
  );
}

function expectPublicPlayer(
  label: string,
  observation: AgentObservation,
  expected: {
    clientID: string;
    name: string;
    isAlive: boolean;
    hasSpawned: boolean;
    minTilesOwned: number;
  },
) {
  const observedPlayer = findObservedPlayer(observation, expected.clientID);

  expectCondition(`${label}: public player exists`, observedPlayer !== undefined, {
    expectedClientID: expected.clientID,
    players: observation.players,
  });
  expectCondition(`${label}: public player has player ID`, observedPlayer!.playerID.length > 0, {
    player: observedPlayer,
  });
  expectCondition(`${label}: public player name`, observedPlayer!.name === expected.name, {
    expected: expected.name,
    actual: observedPlayer!.name,
  });
  expectCondition(
    `${label}: public player alive status`,
    observedPlayer!.isAlive === expected.isAlive,
    {
      expected: expected.isAlive,
      actual: observedPlayer!.isAlive,
    },
  );
  expectCondition(
    `${label}: public player spawn status`,
    observedPlayer!.hasSpawned === expected.hasSpawned,
    {
      expected: expected.hasSpawned,
      actual: observedPlayer!.hasSpawned,
    },
  );
  expectCondition(
    `${label}: public player owned tiles`,
    observedPlayer!.tilesOwned >= expected.minTilesOwned,
    {
      minExpected: expected.minTilesOwned,
      actual: observedPlayer!.tilesOwned,
    },
  );
}

async function main() {
  const runner = await createHeadlessGameRunner({
    gameID: "arena-observation-smoke",
    players,
  });

  const initialObservation = buildObservation(runner, players[0]);

  expectObservationForSelf("initial observation", initialObservation, {
    tick: 0,
    clientID: "observation-a",
    name: "ObservationA",
    hasSpawned: false,
    minTilesOwned: 0,
  });
  expectPublicPlayer("initial observation self public data", initialObservation, {
    clientID: "observation-a",
    name: "ObservationA",
    isAlive: false,
    hasSpawned: false,
    minTilesOwned: 0,
  });
  expectPublicPlayer("initial observation opponent public data", initialObservation, {
    clientID: "observation-b",
    name: "ObservationB",
    isAlive: false,
    hasSpawned: false,
    minTilesOwned: 0,
  });

  const turns: Turn[] = [
    {
      turnNumber: 0,
      intents: [
        {
          clientID: "observation-a",
          type: "spawn",
          tile: runner.game.ref(10, 10),
        },
        {
          clientID: "observation-b",
          type: "spawn",
          tile: runner.game.ref(80, 80),
        },
      ],
    },
    { turnNumber: 1, intents: [] },
    { turnNumber: 2, intents: [] },
  ];

  for (const turn of turns) {
    runner.addTurn(turn);
    const didTick = runner.executeNextTick(runner.pendingTurns());
    if (!didTick) {
      throw new Error(`Observation smoke failed on turn ${turn.turnNumber}`);
    }
  }

  const postSpawnObservation = buildObservation(runner, players[0]);

  expectObservationForSelf("post-spawn observation", postSpawnObservation, {
    tick: 3,
    clientID: "observation-a",
    name: "ObservationA",
    hasSpawned: true,
    minTilesOwned: 1,
  });
  expectPublicPlayer("post-spawn observation self public data", postSpawnObservation, {
    clientID: "observation-a",
    name: "ObservationA",
    isAlive: true,
    hasSpawned: true,
    minTilesOwned: 1,
  });
  expectPublicPlayer("post-spawn observation opponent public data", postSpawnObservation, {
    clientID: "observation-b",
    name: "ObservationB",
    isAlive: true,
    hasSpawned: true,
    minTilesOwned: 1,
  });

  console.log("OpenFront Agent Arena observation smoke check passed.");
  console.log(
    JSON.stringify(
      {
        checkedObservations: 2,
        ticks: runner.game.ticks(),
        self: postSpawnObservation.self,
        players: postSpawnObservation.players.map((player) => ({
          clientID: player.clientID,
          name: player.name,
          hasSpawned: player.hasSpawned,
          tilesOwned: player.tilesOwned,
          isAlive: player.isAlive,
        })),
      },
      null,
      2,
    ),
  );
}

await main();
