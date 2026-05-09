import type { ArenaPlayerSetup } from "./headless";
import type { AgentAction } from "./types";

export type HttpMixedMatchConfig = {
  matchID: string;
  runner: "mixed-http-local";
  map: string;
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  players: ArenaPlayerSetup[];
  httpAgent: {
    clientID: string;
    name: string;
    spawn: {
      x: number;
      y: number;
    };
  };
  localAgent: {
    clientID: string;
    name: string;
    spawn: {
      x: number;
      y: number;
    };
  };
  supportedActions: AgentAction["type"][];
};

export const httpMixedMatchConfig: HttpMixedMatchConfig = {
  matchID: "arena-http-mixed-match",
  runner: "mixed-http-local",
  map: "tests/testdata/maps/plains",
  maxTicks: 12,
  agentDecisionTimeoutMs: 1000,
  players: [
    {
      username: "HttpMixedAgent",
      clientID: "http-mixed-agent",
      isLobbyCreator: true,
    },
    {
      username: "LocalMixedAgent",
      clientID: "local-mixed-agent",
    },
  ],
  httpAgent: {
    clientID: "http-mixed-agent",
    name: "HttpMixedAgent",
    spawn: {
      x: 10,
      y: 10,
    },
  },
  localAgent: {
    clientID: "local-mixed-agent",
    name: "LocalMixedAgent",
    spawn: {
      x: 80,
      y: 80,
    },
  },
  supportedActions: ["spawn", "wait", "attack"],
};
