import type { ActionValidation, AgentAction, AgentObservation } from "./types";

type ActionValidationMap = {
  isValidCoord(x: number, y: number): boolean;
};

export function validateAction(
  map: ActionValidationMap,
  observation: AgentObservation,
  action: AgentAction,
): ActionValidation {
  switch (action.type) {
    case "wait":
      return { status: "accepted" };
    case "spawn":
      if (observation.self.hasSpawned) {
        return {
          status: "rejected",
          reason: "agent has already spawned",
        };
      }

      if (!Number.isInteger(action.x) || !Number.isInteger(action.y)) {
        return {
          status: "rejected",
          reason: "spawn coordinates must be integers",
        };
      }

      if (!map.isValidCoord(action.x, action.y)) {
        return {
          status: "rejected",
          reason: "spawn coordinates are outside the map",
        };
      }

      return { status: "accepted" };
    case "attack":
      if (!observation.self.hasSpawned) {
        return {
          status: "rejected",
          reason: "agent must spawn before attacking",
        };
      }

      if (
        action.troops !== null &&
        (!Number.isFinite(action.troops) || action.troops < 0)
      ) {
        return {
          status: "rejected",
          reason: "attack troops must be null or a non-negative number",
        };
      }

      return { status: "accepted" };
  }
}
