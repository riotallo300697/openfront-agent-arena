import type { AgentAction, AgentObservation } from "../../runner/src/types";
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
    }
  | {
      status: "rejected";
      reason: "session_not_found";
    };

export type ArenaSessionRunner = {
  collectTurnDecisions({ now }: { now: Date }): ArenaSessionRunnerCollectResult;
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
  let state: ArenaSessionRunnerState = {
    sessionID,
    currentTick: store.getSession(sessionID)?.currentTick ?? 0,
    status: "idle",
    activeTurn: null,
  };
  let resolvedDecisionsByClientID = new Map<string, ArenaSessionCoordinatorDecision>();

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

      return {
        status: "accepted",
        session: opened.session,
        state: snapshotState(),
        decisions: orderedDecisions(opened.session, resolvedDecisionsByClientID),
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
        state = {
          sessionID,
          currentTick: completedTick,
          status:
            completedTick >= sessionResult.session.maxTicks
              ? "completed"
              : "idle",
          activeTurn: null,
        };
      }

      return {
        status: "accepted",
        session: sessionResult.session,
        state: snapshotState(),
        decisions,
      };
    },
  };
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
