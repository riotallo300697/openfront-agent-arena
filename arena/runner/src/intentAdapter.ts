import type { Game } from "../../../src/core/game/Game";
import type { StampedIntent } from "../../../src/core/Schemas";
import type { ArenaPlayerSetup } from "./headless";
import type { AgentAction } from "./types";

type IntentAdapterGame = Pick<Game, "ref" | "terraNullius">;

export function actionToIntent(
  game: IntentAdapterGame,
  player: ArenaPlayerSetup,
  action: AgentAction,
): StampedIntent | null {
  switch (action.type) {
    case "spawn":
      return {
        clientID: player.clientID,
        type: "spawn",
        tile: game.ref(action.x, action.y),
      };
    case "wait":
      return null;
    case "attack":
      return {
        clientID: player.clientID,
        type: "attack",
        targetID: game.terraNullius().id(),
        troops: action.troops,
      };
  }
}
