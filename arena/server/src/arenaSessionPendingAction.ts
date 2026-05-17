import type { AgentAction, AgentObservation } from "../../runner/src/types";
import type {
  ArenaSessionPendingActionTicketResult,
  ArenaSessionStore,
} from "./arenaSessionStore";

export type ArenaSessionPendingObservationInput = {
  now: Date;
  observation: AgentObservation;
  sessionID: string;
  store: ArenaSessionStore;
  supportedActions?: AgentAction["type"][];
  turnID?: string;
};

const defaultSupportedActions: AgentAction["type"][] = ["spawn", "wait", "attack"];

export function createArenaSessionTurnID({
  clientID,
  tick,
}: {
  clientID: string;
  tick: number;
}): string {
  return `turn-${tick}-${clientID}`;
}

export function createArenaSessionPendingObservation({
  now,
  observation,
  sessionID,
  store,
  supportedActions = defaultSupportedActions,
  turnID = createArenaSessionTurnID({
    clientID: observation.self.clientID,
    tick: observation.tick,
  }),
}: ArenaSessionPendingObservationInput): ArenaSessionPendingActionTicketResult {
  const session = store.getSession(sessionID);
  if (session === null) {
    return {
      status: "rejected",
      reason: "session_not_found",
    };
  }

  return store.createPendingActionTicket({
    sessionID: session.sessionID,
    matchID: session.matchID,
    clientID: observation.self.clientID,
    turnID,
    tick: observation.tick,
    observation,
    deadlineAt: new Date(
      now.getTime() + session.agentDecisionTimeoutMs,
    ).toISOString(),
    supportedActions,
  });
}
