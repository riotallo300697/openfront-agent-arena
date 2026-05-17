import type { AgentAction, AgentObservation } from "../../runner/src/types";
import type { ArenaSessionRecord, ArenaSessionStore } from "./arenaSessionStore";
import {
  openArenaSessionTurn,
  resolveArenaSessionTurnState,
  type ArenaSessionTurnStateResult,
} from "./arenaSessionTurn";

export type ArenaSessionCoordinatorOpenResult =
  | {
      status: "accepted";
      session: ArenaSessionRecord;
      turns: ArenaSessionCoordinatorOpenedTurn[];
    }
  | {
      status: "rejected";
      reason: "session_not_found";
    };

export type ArenaSessionCoordinatorOpenedTurn =
  | {
      clientID: string;
      status: "opened";
      turnID: string;
      deadlineAt: string;
    }
  | {
      clientID: string;
      status: "missing_observation";
    }
  | {
      clientID: string;
      status: "rejected";
      reason: "session_not_found" | "client_not_joined";
    };

export type ArenaSessionCoordinatorDecision = {
  action: AgentAction | null;
  clientID: string;
  reason?: "invalid_turn" | "session_not_found" | "client_not_joined";
  state: "submitted" | "expired" | "pending" | "missing" | "rejected";
  turnID: string | null;
};

export type ArenaSessionCoordinatorCollectResult =
  | {
      status: "accepted";
      decisions: ArenaSessionCoordinatorDecision[];
      session: ArenaSessionRecord;
    }
  | {
      status: "rejected";
      reason: "session_not_found";
    };

export function openArenaSessionCoordinatorTurns({
  now,
  observations,
  sessionID,
  store,
  supportedActions,
}: {
  now: Date;
  observations: AgentObservation[];
  sessionID: string;
  store: ArenaSessionStore;
  supportedActions?: AgentAction["type"][];
}): ArenaSessionCoordinatorOpenResult {
  const session = store.getSession(sessionID);
  if (session === null) {
    return {
      status: "rejected",
      reason: "session_not_found",
    };
  }

  const observationsByClientID = new Map(
    observations.map((observation) => [observation.self.clientID, observation]),
  );

  return {
    status: "accepted",
    session,
    turns: session.agents.map((agent) => {
      const observation = observationsByClientID.get(agent.clientID);
      if (observation === undefined) {
        return {
          clientID: agent.clientID,
          status: "missing_observation",
        };
      }

      const openedTurn = openArenaSessionTurn({
        now,
        observation,
        sessionID,
        store,
        supportedActions,
      });
      if (openedTurn.status === "rejected") {
        return {
          clientID: agent.clientID,
          status: "rejected",
          reason: openedTurn.reason,
        };
      }

      return {
        clientID: agent.clientID,
        status: "opened",
        turnID: openedTurn.ticket.turnID,
        deadlineAt: openedTurn.ticket.deadlineAt,
      };
    }),
  };
}

export function collectArenaSessionCoordinatorDecisions({
  now,
  sessionID,
  store,
  turnIDsByClientID,
}: {
  now: Date;
  sessionID: string;
  store: ArenaSessionStore;
  turnIDsByClientID: Record<string, string | undefined>;
}): ArenaSessionCoordinatorCollectResult {
  const session = store.getSession(sessionID);
  if (session === null) {
    return {
      status: "rejected",
      reason: "session_not_found",
    };
  }

  return {
    status: "accepted",
    session,
    decisions: session.agents.map((agent) => {
      const turnID = turnIDsByClientID[agent.clientID];
      if (turnID === undefined) {
        return {
          action: null,
          clientID: agent.clientID,
          state: "missing",
          turnID: null,
        };
      }

      return coordinatorDecisionFromTurnState({
        clientID: agent.clientID,
        turnID,
        turnState: resolveArenaSessionTurnState({
          clientID: agent.clientID,
          now,
          sessionID,
          store,
          turnID,
        }),
      });
    }),
  };
}

function coordinatorDecisionFromTurnState({
  clientID,
  turnID,
  turnState,
}: {
  clientID: string;
  turnID: string;
  turnState: ArenaSessionTurnStateResult;
}): ArenaSessionCoordinatorDecision {
  if (turnState.status === "rejected") {
    return {
      action: null,
      clientID,
      reason: turnState.reason,
      state: "rejected",
      turnID,
    };
  }

  switch (turnState.state) {
    case "submitted":
      return {
        action: turnState.submittedAction.action,
        clientID,
        state: "submitted",
        turnID: turnState.submittedAction.turnID,
      };
    case "expired":
      return {
        action: null,
        clientID,
        state: "expired",
        turnID: turnState.expiredTicket.turnID,
      };
    case "pending":
      return {
        action: null,
        clientID,
        state: "pending",
        turnID: turnState.pendingAction.turnID,
      };
    case "missing":
      return {
        action: null,
        clientID,
        state: "missing",
        turnID,
      };
  }
}
