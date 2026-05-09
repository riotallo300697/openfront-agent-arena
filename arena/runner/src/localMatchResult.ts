import type { LocalMatchResult, ReplayMatchEndEvent } from "./types";

export function buildLocalMatchResult(
  result: LocalMatchResult,
): LocalMatchResult {
  return result;
}

export function localMatchResultToMatchEndEvent(
  result: LocalMatchResult,
): ReplayMatchEndEvent {
  return {
    type: "match_end",
    matchID: result.matchID,
    ticks: result.ticks,
    updates: result.updates,
    attackIntents: result.attackIntents,
    rejectedActions: result.rejectedActions,
    agents: result.agents,
  };
}
