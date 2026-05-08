import { SpawnExecution } from "../../../src/core/execution/SpawnExecution";
import { Player, PlayerInfo, PlayerType } from "../../../src/core/game/Game";
import { createGame } from "../../../src/core/game/GameImpl";
import { GameUpdateViewData } from "../../../src/core/game/GameUpdates";
import { Turn } from "../../../src/core/Schemas";
import {
  buildArenaConfig,
  createHeadlessGameRunner,
  loadTestGameMaps,
} from "./headless";

function ownedTilesByClientID(
  players: { name: string; clientID: string }[],
  gamePlayers: Player[],
) {
  return players.map((info) => {
    const player = gamePlayers.find(
      (candidate) => candidate.clientID() === info.clientID,
    );
    return {
      name: info.name,
      tiles: player?.numTilesOwned() ?? 0,
    };
  });
}

function assertBothPlayersOwnTiles(
  label: string,
  players: { name: string; tiles: number }[],
) {
  if (players.some((player) => player.tiles <= 0)) {
    throw new Error(
      `${label}: expected both players to own tiles, got ${JSON.stringify(
        players,
      )}`,
    );
  }
}

async function runDirectCoreSmoke() {
  const { gameMap, miniGameMap } = await loadTestGameMaps();
  const config = buildArenaConfig();
  const playerA = new PlayerInfo(
    "ArenaSmokeA",
    PlayerType.Human,
    "agent-a",
    "agent-a",
  );
  const playerB = new PlayerInfo(
    "ArenaSmokeB",
    PlayerType.Human,
    "agent-b",
    "agent-b",
  );
  const game = createGame([playerA, playerB], [], gameMap, miniGameMap, config);

  game.addExecution(
    new SpawnExecution("arena-smoke", playerA, game.ref(10, 10)),
    new SpawnExecution("arena-smoke", playerB, game.ref(80, 80)),
  );

  for (let i = 0; i < 5; i++) {
    game.executeNextTick();
  }

  const players = game.allPlayers();
  const spawnedPlayers = players.filter((player) => player.hasSpawned());
  const ownedTiles = players.map((player) => ({
    name: player.name(),
    tiles: player.numTilesOwned(),
  }));

  if (spawnedPlayers.length !== 2) {
    throw new Error(
      `direct core smoke: expected 2 spawned players, got ${spawnedPlayers.length}`,
    );
  }

  assertBothPlayersOwnTiles("direct core smoke", ownedTiles);

  return {
    ticks: game.ticks(),
    players: ownedTiles,
  };
}

async function runGameRunnerTurnSmoke() {
  const updates: GameUpdateViewData[] = [];
  const runner = await createHeadlessGameRunner({
    gameID: "arena-smoke-runner",
    players: [
      {
        username: "ArenaRunnerA",
        clientID: "agent-runner-a",
        isLobbyCreator: true,
      },
      { username: "ArenaRunnerB", clientID: "agent-runner-b" },
    ],
    onUpdate: (update) => updates.push(update),
  });

  const turns: Turn[] = [
    {
      turnNumber: 0,
      intents: [
        {
          clientID: "agent-runner-a",
          type: "spawn",
          tile: runner.game.ref(10, 10),
        },
        {
          clientID: "agent-runner-b",
          type: "spawn",
          tile: runner.game.ref(80, 80),
        },
      ],
    },
    { turnNumber: 1, intents: [] },
    { turnNumber: 2, intents: [] },
    { turnNumber: 3, intents: [] },
    { turnNumber: 4, intents: [] },
  ];

  for (const turn of turns) {
    runner.addTurn(turn);
    const didTick = runner.executeNextTick(runner.pendingTurns());
    if (!didTick) {
      throw new Error(`GameRunner smoke failed on turn ${turn.turnNumber}`);
    }
  }

  const spawnedPlayers = runner.game
    .allPlayers()
    .filter((player) => player.hasSpawned());
  const ownedTiles = ownedTilesByClientID(
    [
      { name: "ArenaRunnerA", clientID: "agent-runner-a" },
      { name: "ArenaRunnerB", clientID: "agent-runner-b" },
    ],
    runner.game.allPlayers(),
  );

  if (spawnedPlayers.length !== 2) {
    throw new Error(
      `GameRunner smoke: expected 2 spawned players, got ${spawnedPlayers.length}`,
    );
  }

  assertBothPlayersOwnTiles("GameRunner smoke", ownedTiles);

  return {
    ticks: runner.game.ticks(),
    updates: updates.length,
    players: ownedTiles,
  };
}

async function main() {
  const directCore = await runDirectCoreSmoke();
  const gameRunner = await runGameRunnerTurnSmoke();

  console.log("OpenFront Agent Arena smoke check passed.");
  console.log(
    JSON.stringify(
      {
        directCore,
        gameRunner,
        map: "tests/testdata/maps/plains",
      },
      null,
      2,
    ),
  );
}

await main();
