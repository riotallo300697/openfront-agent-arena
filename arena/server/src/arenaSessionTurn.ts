import type { AgentAction, AgentObservation } from "../../runner/src/types";
import {
  createArenaSessionPendingObservation,
  type ArenaSessionPendingObservationInput,
} from "./arenaSessionPendingAction";
import type {
  ArenaSessionPendingActionTicket,
  ArenaSessionPendingActionTicketResult,
  ArenaSessionStore,
  ArenaSessionSubmittedAction,
} from "./arenaSessionStore";

export type ArenaSessionTurnOpenInput = Omit<
  ArenaSessionPendingObservationInput,
  "supportedActions"
> & {
  supportedActions?: AgentAction["type"][];
};

export type ArenaSessionTurnStateResult =
  | {
      status: "accepted";
      state: "submitted";
      submittedAction: ArenaSessionSubmittedAction;
    }
  | {
      status: "accepted";
      state: "expired";
      expiredTicket: ArenaSessionPendingActionTicket;
    }
  | {
      status: "accepted";
      state: "pending";
      pendingAction: ArenaSessionPendingActionTicket;
    }
  | {
      status: "accepted";
      state: "missing";
    }
  | {
      status: "rejected";
      reason: "session_not_found" | "client_not_joined" | "invalid_turn";
    };

export type ArenaSessionTurnStateInput = {
  clientID: string;
  now: Date;
  sessionID: string;
  store: ArenaSessionStore;
  turnID: string;
};

export function openArenaSessionTurn({
  now,
  observation,
  sessionID,
  store,
  supportedActions,
  turnID,
}: ArenaSessionTurnOpenInput): ArenaSessionPendingActionTicketResult {
  return createArenaSessionPendingObservation({
    now,
    observation,
    sessionID,
    store,
    supportedActions,
    turnID,
  });
}

export function openArenaSessionTurns({
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
}): ArenaSessionPendingActionTicketResult[] {
  return observations.map((observation) =>
    openArenaSessionTurn({
      now,
      observation,
      sessionID,
      store,
      supportedActions,
    }),
  );
}

export function resolveArenaSessionTurnState({
  clientID,
  now,
  sessionID,
  store,
  turnID,
}: ArenaSessionTurnStateInput): ArenaSessionTurnStateResult {
  const submittedAction = store.takeSubmittedAction({
    clientID,
    sessionID,
    turnID,
  });
  if (submittedAction.status === "rejected") {
    return submittedAction;
  }

  if (submittedAction.submittedAction !== null) {
    return {
      status: "accepted",
      state: "submitted",
      submittedAction: submittedAction.submittedAction,
    };
  }

  const observationState = store.getObservationState({
    clientID,
    sessionID,
  });
  if (observationState.status === "rejected") {
    return observationState;
  }

  if (observationState.observationState.pendingAction === null) {
    return {
      status: "accepted",
      state: "missing",
    };
  }

  if (observationState.observationState.pendingAction.turnID !== turnID) {
    return {
      status: "rejected",
      reason: "invalid_turn",
    };
  }

  const expiredAction = store.expirePendingAction({
    clientID,
    now,
    sessionID,
  });
  if (expiredAction.status === "rejected") {
    return expiredAction;
  }

  if (expiredAction.expiredTicket !== null) {
    return {
      status: "accepted",
      state: "expired",
      expiredTicket: expiredAction.expiredTicket,
    };
  }

  return {
    status: "accepted",
    state: "pending",
    pendingAction: observationState.observationState.pendingAction,
  };
}
