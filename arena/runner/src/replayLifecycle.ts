import type { ReplayWriter } from "./replayWriter";
import type {
  AgentAction,
  AgentReplaySummary,
  ReplayAgentInfo,
  ReplayMatchEndEvent,
  ReplayMetadataEvent,
} from "./types";

export type ReplayAgentSource = {
  readonly clientID: string;
};

export type ReplayNamedAgentSource = {
  readonly name: string;
};

export type ReplayStartConfig = {
  matchID: string;
  runner: ReplayMetadataEvent["runner"];
  map: string;
  seed?: number | null;
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  agents: ReplayAgentInfo[];
  supportedActions: readonly AgentAction["type"][];
};

export type ReplayMatchEndInput = {
  matchID: string;
  ticks: number;
  updates: number;
  attackIntents: number;
  rejectedActions: number;
  agents: AgentReplaySummary[];
};

export function buildReplayAgents(
  players: ReplayAgentSource[],
  agents: Record<string, ReplayNamedAgentSource>,
): ReplayAgentInfo[] {
  return players.map((player) => ({
    name: agents[player.clientID].name,
    clientID: player.clientID,
  }));
}

export function writeReplayStart(
  replay: ReplayWriter,
  config: ReplayStartConfig,
): void {
  replay.write({
    type: "replay_metadata",
    format: "openfront-agent-arena-jsonl",
    version: 1,
    matchID: config.matchID,
    runner: config.runner,
    map: config.map,
    seed: config.seed ?? null,
    maxTicks: config.maxTicks,
    agentDecisionTimeoutMs: config.agentDecisionTimeoutMs,
    agents: config.agents,
    supportedActions: [...config.supportedActions],
  });

  replay.write({
    type: "match_start",
    matchID: config.matchID,
    map: config.map,
    maxTicks: config.maxTicks,
    agents: config.agents,
    supportedActions: [...config.supportedActions],
  });
}

export function buildReplayMatchEndEvent(
  input: ReplayMatchEndInput,
): ReplayMatchEndEvent {
  return {
    type: "match_end",
    matchID: input.matchID,
    ticks: input.ticks,
    updates: input.updates,
    attackIntents: input.attackIntents,
    rejectedActions: input.rejectedActions,
    agents: input.agents,
  };
}

export function writeReplayEnd(
  replay: ReplayWriter,
  input: ReplayMatchEndInput,
): void {
  replay.write(buildReplayMatchEndEvent(input));
}
