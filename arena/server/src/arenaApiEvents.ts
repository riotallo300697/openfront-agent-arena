import type {
  AgentAction,
  AgentReplaySummary,
  LocalAgentDecision,
  ReplayAgentInfo,
  ReplayMatchResult,
} from "../../runner/src/types";

export type ArenaApiEvent =
  | {
      type: "match.started";
      matchID: string;
      map: string;
      maxTicks: number;
      agents: ReplayAgentInfo[];
      supportedActions: AgentAction["type"][];
    }
  | {
      type: "action.accepted";
      matchID: string;
      turnNumber: number;
      agent: string;
      clientID: string;
      action: AgentAction;
    }
  | {
      type: "action.rejected";
      matchID: string;
      turnNumber: number;
      agent: string;
      clientID: string;
      action: AgentAction | null;
      reason: string;
    }
  | {
      type: "match.tick";
      matchID: string;
      tick: number;
      turnNumber: number;
      summary: AgentReplaySummary[];
    }
  | {
      type: "match.ended";
      matchID: string;
      result: ReplayMatchResult;
    };

export type ArenaApiEventSink = (
  event: ArenaApiEvent,
) => void | Promise<void>;

export function decisionsToActionEvents({
  decisions,
  matchID,
  turnNumber,
}: {
  decisions: LocalAgentDecision[];
  matchID: string;
  turnNumber: number;
}): ArenaApiEvent[] {
  return decisions.map((decision): ArenaApiEvent => {
    if (
      decision.inputValidation.status === "accepted" &&
      decision.validation?.status === "accepted" &&
      decision.action !== null
    ) {
      return {
        type: "action.accepted",
        matchID,
        turnNumber,
        agent: decision.agent,
        clientID: decision.clientID,
        action: decision.action,
      };
    }

    return {
      type: "action.rejected",
      matchID,
      turnNumber,
      agent: decision.agent,
      clientID: decision.clientID,
      action: decision.action,
      reason:
        decision.inputValidation.status === "rejected"
          ? decision.inputValidation.reason
          : decision.validation?.reason ?? "action was rejected",
    };
  });
}
