import type { RunReplayMatchTurnsResult } from "./matchLoop";
import { buildReplayMatchEndEvent } from "./replayLifecycle";
import type {
  AgentAction,
  AgentReplaySummary,
  LocalMatchResult,
  ReplayMatchEndEvent,
  ReplayMatchResult,
} from "./types";

export function buildReplayMatchResult({
  agents,
  loopResult,
  matchID,
  replay,
}: {
  agents: AgentReplaySummary[];
  loopResult: Pick<
    RunReplayMatchTurnsResult,
    "ticks" | "updates" | "attackIntents" | "rejectedActions"
  >;
  matchID: string;
  replay: string;
}): ReplayMatchResult {
  return {
    matchID,
    ticks: loopResult.ticks,
    updates: loopResult.updates,
    attackIntents: loopResult.attackIntents,
    rejectedActions: loopResult.rejectedActions,
    agents,
    replay,
  };
}

export function buildLocalMatchResult({
  supportedActions,
  ...result
}: ReplayMatchResult & {
  supportedActions: AgentAction["type"][];
}): LocalMatchResult {
  return {
    matchID: result.matchID,
    ticks: result.ticks,
    updates: result.updates,
    attackIntents: result.attackIntents,
    rejectedActions: result.rejectedActions,
    agents: result.agents,
    supportedActions,
    replay: result.replay,
  };
}

export function matchResultToMatchEndEvent(
  result: ReplayMatchResult,
): ReplayMatchEndEvent {
  return buildReplayMatchEndEvent(result);
}
