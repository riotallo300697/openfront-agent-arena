import type { Game } from "../../../src/core/game/Game";
import type { ArenaPlayerSetup } from "./headless";
import type { AgentReplaySummary, LocalAgent } from "./types";

type ReplaySummaryGame = Pick<Game, "playerByClientID">;

export function buildReplaySummary(
  game: ReplaySummaryGame,
  players: ArenaPlayerSetup[],
  agents: Record<string, LocalAgent>,
): AgentReplaySummary[] {
  return players.map((player) => {
    const gamePlayer = game.playerByClientID(player.clientID);
    return {
      agent: agents[player.clientID].name,
      clientID: player.clientID,
      hasSpawned: gamePlayer?.hasSpawned() ?? false,
      tilesOwned: gamePlayer?.numTilesOwned() ?? 0,
      isAlive: gamePlayer?.isAlive() ?? false,
    };
  });
}
