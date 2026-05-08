import type { ArenaPlayerSetup, createHeadlessGameRunner } from "./headless";
import type { AgentObservation } from "./types";

type LocalRunner = Awaited<ReturnType<typeof createHeadlessGameRunner>>;

export function buildObservation(
  runner: LocalRunner,
  player: ArenaPlayerSetup,
): AgentObservation {
  const self = runner.game.playerByClientID(player.clientID);

  return {
    tick: runner.game.ticks(),
    self: {
      clientID: player.clientID,
      name: player.username,
      hasSpawned: self?.hasSpawned() ?? false,
      tilesOwned: self?.numTilesOwned() ?? 0,
    },
    players: runner.game.allPlayers().map((candidate) => ({
      playerID: candidate.id(),
      clientID: candidate.clientID(),
      name: candidate.name(),
      isAlive: candidate.isAlive(),
      hasSpawned: candidate.hasSpawned(),
      tilesOwned: candidate.numTilesOwned(),
    })),
  };
}
