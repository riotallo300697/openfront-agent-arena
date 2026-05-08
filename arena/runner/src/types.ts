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

export type AgentReplaySummary = {
  agent: string;
  clientID: string;
  hasSpawned: boolean;
  tilesOwned: number;
  isAlive: boolean;
};

export type ActionValidation =
  | {
      status: "accepted";
    }
  | {
      status: "rejected";
      reason: string;
    };
