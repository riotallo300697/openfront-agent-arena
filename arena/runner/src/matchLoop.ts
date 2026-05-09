import type { StampedIntent, Turn } from "../../../src/core/Schemas";
import { buildLocalAgentDecision } from "./agentTurnPipeline";
import type { ArenaPlayerSetup, createHeadlessGameRunner } from "./headless";
import { buildReplaySummary } from "./replaySummary";
import type { ReplayWriter } from "./replayWriter";
import { expectCondition } from "./smokeAssert";
import type { AgentDecisionSource, LocalAgentDecision } from "./types";

type LocalRunner = Awaited<ReturnType<typeof createHeadlessGameRunner>>;

export type RunReplayMatchTurnsResult = {
  decisions: LocalAgentDecision[];
  intentCount: number;
  attackIntents: number;
  rejectedActions: number;
  ticks: number;
  updates: number;
};

export async function runReplayMatchTurns({
  agentDecisionTimeoutMs,
  agents,
  matchLabel,
  maxTicks,
  players,
  replay,
  runner,
  updateCount,
  onTurnDecisions,
}: {
  agentDecisionTimeoutMs: number;
  agents: Record<string, AgentDecisionSource>;
  matchLabel: string;
  maxTicks: number;
  players: ArenaPlayerSetup[];
  replay: ReplayWriter;
  runner: LocalRunner;
  updateCount?: () => number;
  onTurnDecisions?: (
    decisions: LocalAgentDecision[],
    turnNumber: number,
  ) => void | Promise<void>;
}): Promise<RunReplayMatchTurnsResult> {
  const allDecisions: LocalAgentDecision[] = [];
  let intentCount = 0;
  let attackIntents = 0;
  let rejectedActions = 0;
  let updates = 0;

  for (let turnNumber = 0; turnNumber < maxTicks; turnNumber++) {
    const decisions = await Promise.all(
      players.map((player) =>
        buildLocalAgentDecision({
          agent: agents[player.clientID],
          player,
          runner,
          timeoutMs: agentDecisionTimeoutMs,
        }),
      ),
    );
    await onTurnDecisions?.(decisions, turnNumber);
    allDecisions.push(...decisions);

    rejectedActions += decisions.filter(
      (decision) =>
        decision.inputValidation.status === "rejected" ||
        decision.validation?.status === "rejected",
    ).length;

    const intents = decisions
      .map((decision) => decision.intent)
      .filter((intent): intent is StampedIntent => intent !== null);
    const turn: Turn = {
      turnNumber,
      intents,
    };

    intentCount += intents.length;
    attackIntents += intents.filter(
      (intent) => intent.type === "attack",
    ).length;

    runner.addTurn(turn);
    const didTick = runner.executeNextTick(runner.pendingTurns());
    expectCondition(`${matchLabel} tick executed`, didTick, {
      turnNumber,
    });

    updates = updateCount?.() ?? runner.game.ticks();

    replay.write({
      type: "tick",
      tick: runner.game.ticks(),
      turnNumber,
      decisions,
      intents,
      summary: buildReplaySummary(runner.game, players, agents),
      updateCount: updates,
    });
  }

  return {
    decisions: allDecisions,
    intentCount,
    attackIntents,
    rejectedActions,
    ticks: runner.game.ticks(),
    updates,
  };
}
