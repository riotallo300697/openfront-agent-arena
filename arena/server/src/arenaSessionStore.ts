import crypto from "node:crypto";

import type {
  ArenaSessionCreateRequest,
  ArenaSessionSubmitActionRequest,
} from "./arenaSessionValidation";

export type ArenaSessionStatus =
  | "waiting"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export type ArenaSessionAgent = {
  clientID: string;
  name: string;
  slotIndex: number;
  joinedAt: string;
};

export type ArenaSessionPendingActionTicket = {
  sessionID: string;
  matchID: string;
  clientID: string;
  turnID: string;
  tick: number;
  observation: unknown;
  deadlineAt: string;
  supportedActions: ("spawn" | "wait" | "attack")[];
};

export type ArenaSessionObservationState =
  | {
      sessionID: string;
      matchID: string;
      clientID: string;
      status: ArenaSessionStatus;
      reason: "no_pending_action";
      pendingAction: null;
    }
  | {
      sessionID: string;
      matchID: string;
      clientID: string;
      status: ArenaSessionStatus;
      pendingAction: ArenaSessionPendingActionTicket;
    };

export type ArenaSessionRecord = {
  sessionID: string;
  matchID: string;
  status: ArenaSessionStatus;
  createdAt: string;
  completedAt?: string;
  currentTick: number;
  map: ArenaSessionCreateRequest["map"];
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  maxAgents: 2;
  agents: ArenaSessionAgent[];
};

export type ArenaSessionStore = {
  createSession(request: ArenaSessionCreateRequest): ArenaSessionRecord;
  getSession(sessionID: string): ArenaSessionRecord | null;
  createPendingActionTicket(
    ticket: ArenaSessionPendingActionTicket,
  ): ArenaSessionPendingActionTicketResult;
  getObservationState({
    clientID,
    sessionID,
  }: {
    clientID: string;
    sessionID: string;
  }): ArenaSessionObservationStateResult;
  joinSession({
    clientID,
    name,
    now,
    sessionID,
  }: {
    clientID: string;
    name: string;
    now: string;
    sessionID: string;
  }): ArenaSessionJoinResult;
  listSessions(): ArenaSessionRecord[];
  matchIDExists(matchID: string): boolean;
  sessionIDExists(sessionID: string): boolean;
  submitAction({
    clientID,
    request,
    sessionID,
  }: {
    clientID: string;
    request: ArenaSessionSubmitActionRequest;
    sessionID: string;
  }): ArenaSessionSubmitActionResult;
};

export type ArenaSessionJoinResult =
  | {
      status: "accepted";
      session: ArenaSessionRecord;
      agent: ArenaSessionAgent;
    }
  | {
      status: "rejected";
      reason: "session_not_found" | "client_already_joined" | "session_full";
    };

export type ArenaSessionObservationStateResult =
  | {
      status: "accepted";
      observationState: ArenaSessionObservationState;
    }
  | {
      status: "rejected";
      reason: "session_not_found" | "client_not_joined";
    };

export type ArenaSessionPendingActionTicketResult =
  | {
      status: "accepted";
      ticket: ArenaSessionPendingActionTicket;
    }
  | {
      status: "rejected";
      reason: "session_not_found" | "client_not_joined";
    };

export type ArenaSessionSubmitActionAccepted = {
  sessionID: string;
  matchID: string;
  clientID: string;
  turnID: string;
  accepted: true;
  status: ArenaSessionStatus;
};

export type ArenaSessionSubmitActionResult =
  | {
      status: "accepted";
      submission: ArenaSessionSubmitActionAccepted;
    }
  | {
      status: "rejected";
      reason:
        | "session_not_found"
        | "client_not_joined"
        | "no_pending_action"
        | "invalid_turn";
    };

function cloneSession(session: ArenaSessionRecord): ArenaSessionRecord {
  return {
    ...session,
    agents: session.agents.map((agent) => ({ ...agent })),
  };
}

function clonePendingActionTicket(
  ticket: ArenaSessionPendingActionTicket,
): ArenaSessionPendingActionTicket {
  return {
    ...ticket,
    supportedActions: [...ticket.supportedActions],
  };
}

function generatedSessionID(): string {
  return `session-${crypto.randomUUID()}`;
}

function pendingActionKey({
  clientID,
  sessionID,
}: {
  clientID: string;
  sessionID: string;
}): string {
  return `${sessionID}:${clientID}`;
}

export function createInMemoryArenaSessionStore(): ArenaSessionStore {
  const sessions = new Map<string, ArenaSessionRecord>();
  const pendingActionTickets = new Map<string, ArenaSessionPendingActionTicket>();

  return {
    createSession(request) {
      const now = new Date().toISOString();
      const session: ArenaSessionRecord = {
        sessionID: request.sessionID ?? generatedSessionID(),
        matchID: request.matchID,
        status: "waiting",
        createdAt: now,
        currentTick: 0,
        map: request.map,
        maxTicks: request.maxTicks,
        agentDecisionTimeoutMs: request.agentDecisionTimeoutMs,
        maxAgents: request.maxAgents,
        agents: [],
      };
      sessions.set(session.sessionID, session);
      return cloneSession(session);
    },
    getSession(sessionID) {
      const session = sessions.get(sessionID);
      return session === undefined ? null : cloneSession(session);
    },
    createPendingActionTicket(ticket) {
      const session = sessions.get(ticket.sessionID);
      if (session === undefined) {
        return {
          status: "rejected",
          reason: "session_not_found",
        };
      }

      if (!session.agents.some((agent) => agent.clientID === ticket.clientID)) {
        return {
          status: "rejected",
          reason: "client_not_joined",
        };
      }

      const storedTicket = clonePendingActionTicket({
        ...ticket,
        matchID: session.matchID,
        sessionID: session.sessionID,
      });
      pendingActionTickets.set(
        pendingActionKey({
          clientID: ticket.clientID,
          sessionID: ticket.sessionID,
        }),
        storedTicket,
      );

      return {
        status: "accepted",
        ticket: clonePendingActionTicket(storedTicket),
      };
    },
    getObservationState({ clientID, sessionID }) {
      const session = sessions.get(sessionID);
      if (session === undefined) {
        return {
          status: "rejected",
          reason: "session_not_found",
        };
      }

      if (!session.agents.some((agent) => agent.clientID === clientID)) {
        return {
          status: "rejected",
          reason: "client_not_joined",
        };
      }

      const pendingAction = pendingActionTickets.get(
        pendingActionKey({ clientID, sessionID }),
      );
      if (pendingAction !== undefined) {
        return {
          status: "accepted",
          observationState: {
            sessionID: session.sessionID,
            matchID: session.matchID,
            clientID,
            status: session.status,
            pendingAction: clonePendingActionTicket(pendingAction),
          },
        };
      }

      return {
        status: "accepted",
        observationState: {
          sessionID: session.sessionID,
          matchID: session.matchID,
          clientID,
          status: session.status,
          reason: "no_pending_action",
          pendingAction: null,
        },
      };
    },
    joinSession({ clientID, name, now, sessionID }) {
      const session = sessions.get(sessionID);
      if (session === undefined) {
        return {
          status: "rejected",
          reason: "session_not_found",
        };
      }

      if (session.agents.some((agent) => agent.clientID === clientID)) {
        return {
          status: "rejected",
          reason: "client_already_joined",
        };
      }

      if (session.agents.length >= session.maxAgents) {
        return {
          status: "rejected",
          reason: "session_full",
        };
      }

      const agent: ArenaSessionAgent = {
        clientID,
        name,
        slotIndex: session.agents.length,
        joinedAt: now,
      };
      session.agents.push(agent);

      return {
        status: "accepted",
        session: cloneSession(session),
        agent: { ...agent },
      };
    },
    listSessions() {
      return Array.from(sessions.values()).map(cloneSession);
    },
    matchIDExists(matchID) {
      return Array.from(sessions.values()).some(
        (session) => session.matchID === matchID,
      );
    },
    sessionIDExists(sessionID) {
      return sessions.has(sessionID);
    },
    submitAction({ clientID, request, sessionID }) {
      const session = sessions.get(sessionID);
      if (session === undefined) {
        return {
          status: "rejected",
          reason: "session_not_found",
        };
      }

      if (!session.agents.some((agent) => agent.clientID === clientID)) {
        return {
          status: "rejected",
          reason: "client_not_joined",
        };
      }

      if (request.turnID.length === 0) {
        return {
          status: "rejected",
          reason: "invalid_turn",
        };
      }

      const key = pendingActionKey({ clientID, sessionID });
      const pendingAction = pendingActionTickets.get(key);
      if (pendingAction !== undefined && pendingAction.turnID !== request.turnID) {
        return {
          status: "rejected",
          reason: "invalid_turn",
        };
      }

      if (pendingAction !== undefined) {
        pendingActionTickets.delete(key);
        return {
          status: "accepted",
          submission: {
            sessionID: session.sessionID,
            matchID: session.matchID,
            clientID,
            turnID: request.turnID,
            accepted: true,
            status: session.status,
          },
        };
      }

      return {
        status: "rejected",
        reason: "no_pending_action",
      };
    },
  };
}
