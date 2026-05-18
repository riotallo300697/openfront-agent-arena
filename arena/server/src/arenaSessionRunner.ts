import type { AgentAction, AgentObservation } from "../../runner/src/types";
import {
  buildArenaSessionCompletionSummary,
  type ArenaSessionCompletedTurn,
  type ArenaSessionCompletionSummary,
} from "./arenaSessionCompletion";
import {
  collectArenaSessionCoordinatorDecisions,
  openArenaSessionCoordinatorTurns,
  type ArenaSessionCoordinatorDecision,
} from "./arenaSessionCoordinator";
import type { ArenaSessionRecord, ArenaSessionStore } from "./arenaSessionStore";

export type ArenaSessionRunnerStatus = "idle" | "collecting" | "completed";

export type ArenaSessionRunnerState = {
  currentTick: number;
  sessionID: string;
  status: ArenaSessionRunnerStatus;
  activeTurn: ArenaSessionRunnerActiveTurn | null;
};

export type ArenaSessionRunnerActiveTurn = {
  openedAt: string;
  tick: number;
  turnIDsByClientID: Record<string, string | undefined>;
};

export type ArenaSessionRunnerOpenResult =
  | {
      status: "accepted";
      session: ArenaSessionRecord;
      state: ArenaSessionRunnerState;
      decisions: ArenaSessionCoordinatorDecision[];
      completion: ArenaSessionCompletionSummary | null;
    }
  | {
      status: "rejected";
      reason: "session_not_found" | "turn_already_open" | "session_completed";
    };

export type ArenaSessionRunnerCollectResult =
  | {
      status: "accepted";
      session: ArenaSessionRecord;
      state: ArenaSessionRunnerState;
      decisions: ArenaSessionCoordinatorDecision[];
      completion: ArenaSessionCompletionSummary | null;
    }
  | {
      status: "rejected";
      reason: "session_not_found";
    };

export type ArenaSessionRunner = {
  collectTurnDecisions({ now }: { now: Date }): ArenaSessionRunnerCollectResult;
  getCompletion(): ArenaSessionCompletionSummary | null;
  getState(): ArenaSessionRunnerState;
  openTurnBatch({
    now,
    observations,
  }: {
    now: Date;
    observations: AgentObservation[];
  }): ArenaSessionRunnerOpenResult;
};

export function createArenaSessionRunner({
  sessionID,
  store,
  supportedActions = ["spawn", "wait", "attack"],
}: {
  sessionID: string;
  store: ArenaSessionStore;
  supportedActions?: AgentAction["type"][];
}): ArenaSessionRunner {
  const initialSession = store.getSession(sessionID);
  let state: ArenaSessionRunnerState = {
    sessionID,
    currentTick: initialSession?.currentTick ?? 0,
    status: initialSession?.status === "completed" ? "completed" : "idle",
    activeTurn: null,
  };
  let resolvedDecisionsByClientID = new Map<string, ArenaSessionCoordinatorDecision>();
  let completedTurns: ArenaSessionCompletedTurn[] = [];
  let latestObservationsByClientID = new Map<string, AgentObservation>();
  let completion: ArenaSessionCompletionSummary | null = null;

  function snapshotState(): ArenaSessionRunnerState {
    return {
      ...state,
      activeTurn:
        state.activeTurn === null
          ? null
          : {
              ...state.activeTurn,
              turnIDsByClientID: { ...state.activeTurn.turnIDsByClientID },
            },
    };
  }

  function sessionOrRejected():
    | { status: "accepted"; session: ArenaSessionRecord }
    | { status: "rejected"; reason: "session_not_found" } {
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
    };
  }

  return {
    getState() {
      return snapshotState();
    },

    getCompletion() {
      return completion;
    },

    openTurnBatch({ now, observations }) {
      const sessionResult = sessionOrRejected();
      if (sessionResult.status === "rejected") {
        return sessionResult;
      }

      if (state.status === "completed") {
        return {
          status: "rejected",
          reason: "session_completed",
        };
      }

      if (state.activeTurn !== null) {
        return {
          status: "rejected",
          reason: "turn_already_open",
        };
      }

      const nextTick = state.currentTick + 1;
      for (const observation of observations) {
        latestObservationsByClientID.set(observation.self.clientID, observation);
      }
      const opened = openArenaSessionCoordinatorTurns({
        now,
        observations,
        sessionID,
        store,
        supportedActions,
      });
      if (opened.status === "rejected") {
        return opened;
      }

      const turnIDsByClientID: Record<string, string | undefined> = {};
      resolvedDecisionsByClientID = new Map();
      for (const turn of opened.turns) {
        if (turn.status === "opened") {
          turnIDsByClientID[turn.clientID] = turn.turnID;
          continue;
        }

        resolvedDecisionsByClientID.set(turn.clientID, {
          action: null,
          clientID: turn.clientID,
          reason: turn.status === "rejected" ? turn.reason : undefined,
          state: turn.status === "rejected" ? "rejected" : "missing",
          turnID: null,
        });
      }

      state = {
        sessionID,
        currentTick: state.currentTick,
        status: "collecting",
        activeTurn: {
          openedAt: now.toISOString(),
          tick: nextTick,
          turnIDsByClientID,
        },
      };
      const syncedSession = syncSessionProgress({
        currentTick: state.currentTick,
        session: opened.session,
        status: "running",
        store,
      });

      return {
        status: "accepted",
        session: syncedSession,
        state: snapshotState(),
        decisions: orderedDecisions(opened.session, resolvedDecisionsByClientID),
        completion,
      };
    },

    collectTurnDecisions({ now }) {
      const sessionResult = sessionOrRejected();
      if (sessionResult.status === "rejected") {
        return sessionResult;
      }

      if (state.activeTurn === null) {
        return {
          status: "accepted",
          session: sessionResult.session,
          state: snapshotState(),
          decisions: orderedDecisions(
            sessionResult.session,
            resolvedDecisionsByClientID,
          ),
          completion,
        };
      }

      const collected = collectArenaSessionCoordinatorDecisions({
        now,
        sessionID,
        store,
        turnIDsByClientID: state.activeTurn.turnIDsByClientID,
      });
      if (collected.status === "rejected") {
        return collected;
      }

      for (const decision of collected.decisions) {
        const previousDecision = resolvedDecisionsByClientID.get(
          decision.clientID,
        );
        if (
          decision.state === "submitted" ||
          decision.state === "expired" ||
          decision.state === "rejected"
        ) {
          resolvedDecisionsByClientID.set(decision.clientID, decision);
        } else if (previousDecision === undefined) {
          resolvedDecisionsByClientID.set(decision.clientID, decision);
        } else if (
          previousDecision.state === "pending" &&
          decision.state === "missing"
        ) {
          resolvedDecisionsByClientID.set(decision.clientID, decision);
        }
      }

      const decisions = orderedDecisions(
        sessionResult.session,
        resolvedDecisionsByClientID,
      );
      const hasPendingDecision = decisions.some(
        (decision) => decision.state === "pending",
      );

      if (!hasPendingDecision) {
        const completedTick = state.activeTurn.tick;
        const sessionStatus =
          completedTick >= sessionResult.session.maxTicks ? "completed" : "running";
        completedTurns = [
          ...completedTurns,
          {
            tick: completedTick,
            decisions,
          },
        ];
        state = {
          sessionID,
          currentTick: completedTick,
          status: sessionStatus === "completed" ? "completed" : "idle",
          activeTurn: null,
        };
        sessionResult.session = syncSessionProgress({
          completedAt:
            sessionStatus === "completed" ? now.toISOString() : undefined,
          currentTick: completedTick,
          session: sessionResult.session,
          status: sessionStatus,
          store,
        });
        if (sessionStatus === "completed") {
          completion = buildArenaSessionCompletionSummary({
            latestObservations: Array.from(latestObservationsByClientID.values()),
            session: sessionResult.session,
            turns: completedTurns,
          });
        }
      }

      return {
        status: "accepted",
        session: sessionResult.session,
        state: snapshotState(),
        decisions,
        completion,
      };
    },
  };
}

function syncSessionProgress({
  completedAt,
  currentTick,
  session,
  status,
  store,
}: {
  completedAt?: string;
  currentTick: number;
  session: ArenaSessionRecord;
  status: ArenaSessionRecord["status"];
  store: ArenaSessionStore;
}): ArenaSessionRecord {
  const synced = store.updateSessionProgress({
    completedAt,
    currentTick,
    sessionID: session.sessionID,
    status,
  });

  return synced.status === "accepted" ? synced.session : session;
}

function orderedDecisions(
  session: ArenaSessionRecord,
  decisionsByClientID: Map<string, ArenaSessionCoordinatorDecision>,
): ArenaSessionCoordinatorDecision[] {
  return session.agents.map(
    (agent) =>
      decisionsByClientID.get(agent.clientID) ?? {
        action: null,
        clientID: agent.clientID,
        state: "missing",
        turnID: null,
      },
  );
}
