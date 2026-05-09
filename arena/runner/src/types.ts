import type { StampedIntent } from "../../../src/core/Schemas";

export type AgentObservation = {
  tick: number;
  self: {
    clientID: string;
    name: string;
    hasSpawned: boolean;
    tilesOwned: number;
  };
  players: {
    playerID: string;
    clientID: string | null;
    name: string;
    isAlive: boolean;
    hasSpawned: boolean;
    tilesOwned: number;
  }[];
};

export type AgentAction =
  | {
      type: "spawn";
      x: number;
      y: number;
    }
  | {
      type: "wait";
    }
  | {
      type: "attack";
      target: "neutral";
      troops: number | null;
    };

export interface LocalAgent {
  readonly name: string;
  decide(observation: AgentObservation): AgentAction;
}

export interface ExternalAgentClient {
  readonly name: string;
  decide(observation: AgentObservation): Promise<unknown>;
}

export type AgentDecisionSource = {
  readonly name: string;
  decide(observation: AgentObservation): unknown | Promise<unknown>;
};

export type AgentReplaySummary = {
  agent: string;
  clientID: string;
  hasSpawned: boolean;
  tilesOwned: number;
  isAlive: boolean;
};

export type ReplayMatchResult = {
  matchID: string;
  ticks: number;
  updates: number;
  attackIntents: number;
  rejectedActions: number;
  agents: AgentReplaySummary[];
  replay: string;
};

export type LocalMatchResult = ReplayMatchResult & {
  supportedActions: AgentAction["type"][];
};

export type ReplayAgentInfo = {
  name: string;
  clientID: string;
};

export type AgentInputValidation =
  | {
      status: "accepted";
    }
  | {
      status: "rejected";
      path: string;
      reason: string;
    };

export type LocalAgentDecision = {
  agent: string;
  clientID: string;
  observation: AgentObservation;
  action: AgentAction | null;
  inputValidation: AgentInputValidation;
  validation: ActionValidation | null;
  intent: StampedIntent | null;
};

export type ReplayMetadataEvent = {
  type: "replay_metadata";
  format: "openfront-agent-arena-jsonl";
  version: 1;
  matchID: string;
  runner: "local" | "mixed-http-local";
  map: string;
  seed: number | null;
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  agents: ReplayAgentInfo[];
  supportedActions: AgentAction["type"][];
};

export type ReplayMatchStartEvent = {
  type: "match_start";
  matchID: string;
  map: string;
  maxTicks: number;
  agents: ReplayAgentInfo[];
  supportedActions: AgentAction["type"][];
};

export type ReplayTickEvent = {
  type: "tick";
  tick: number;
  turnNumber: number;
  decisions: LocalAgentDecision[];
  intents: StampedIntent[];
  summary: AgentReplaySummary[];
  updateCount: number;
};

export type ReplayMatchEndEvent = {
  type: "match_end";
  matchID: string;
  ticks: number;
  updates: number;
  attackIntents: number;
  rejectedActions: number;
  agents: AgentReplaySummary[];
};

export type ReplayEvent =
  | ReplayMetadataEvent
  | ReplayMatchStartEvent
  | ReplayTickEvent
  | ReplayMatchEndEvent;

export type ActionValidation =
  | {
      status: "accepted";
    }
  | {
      status: "rejected";
      reason: string;
    };
