import { parseAgentActionInput } from "./agentActionInput";
import { validateAction } from "./actionValidation";
import type { ArenaPlayerSetup, createHeadlessGameRunner } from "./headless";
import { actionToIntent } from "./intentAdapter";
import { buildObservation } from "./observation";
import type { AgentDecisionSource, LocalAgentDecision } from "./types";

type LocalRunner = Awaited<ReturnType<typeof createHeadlessGameRunner>>;

type RawAgentDecisionResult =
  | {
      status: "accepted";
      value: unknown;
    }
  | {
      status: "rejected";
      path: string;
      reason: string;
    };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function resolveAgentDecision({
  agent,
  observation,
  timeoutMs,
}: {
  agent: AgentDecisionSource;
  observation: ReturnType<typeof buildObservation>;
  timeoutMs: number;
}): Promise<RawAgentDecisionResult> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<RawAgentDecisionResult>((resolve) => {
      timeout = setTimeout(() => {
        resolve({
          status: "rejected",
          path: "agent.decide",
          reason: `agent decision timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);
    });
    const decisionPromise = (async () => agent.decide(observation))().then(
      (value): RawAgentDecisionResult => ({
        status: "accepted",
        value,
      }),
      (error): RawAgentDecisionResult => ({
        status: "rejected",
        path: "agent.decide",
        reason: `agent decision failed: ${errorMessage(error)}`,
      }),
    );

    return await Promise.race([decisionPromise, timeoutPromise]);
  } finally {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  }
}

export async function buildLocalAgentDecision({
  agent,
  player,
  runner,
  timeoutMs,
}: {
  agent: AgentDecisionSource;
  player: ArenaPlayerSetup;
  runner: LocalRunner;
  timeoutMs: number;
}): Promise<LocalAgentDecision> {
  const observation = buildObservation(runner, player);
  const rawAction = await resolveAgentDecision({
    agent,
    observation,
    timeoutMs,
  });
  const actionInput =
    rawAction.status === "accepted"
      ? parseAgentActionInput(rawAction.value)
      : rawAction;
  const action = actionInput.status === "accepted" ? actionInput.action : null;
  const inputValidation =
    actionInput.status === "accepted"
      ? { status: "accepted" as const }
      : {
          status: "rejected" as const,
          path: actionInput.path,
          reason: actionInput.reason,
        };
  const validation =
    actionInput.status === "accepted"
      ? validateAction(runner.game, observation, actionInput.action)
      : null;
  const intent =
    validation?.status === "accepted"
      ? actionToIntent(runner.game, player, actionInput.action)
      : null;

  return {
    agent: agent.name,
    clientID: player.clientID,
    observation,
    action,
    inputValidation,
    validation,
    intent,
  };
}
