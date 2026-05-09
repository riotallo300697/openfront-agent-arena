import { FixedSpawnExpandAgent } from "./baselineAgents";
import type { ArenaPlayerSetup } from "./headless";
import type { AgentAction, LocalAgent } from "./types";

export type LocalMatchConfig = {
  matchID: string;
  map: string;
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  players: ArenaPlayerSetup[];
  agents: Record<string, LocalAgent>;
  supportedActions: AgentAction["type"][];
};

export const localMatchConfig: LocalMatchConfig = {
  matchID: "arena-local-match",
  map: "tests/testdata/maps/plains",
  maxTicks: 140,
  agentDecisionTimeoutMs: 1000,
  players: [
    {
      username: "FixedSpawnWest",
      clientID: "fixed-spawn-west",
      isLobbyCreator: true,
    },
    {
      username: "FixedSpawnEast",
      clientID: "fixed-spawn-east",
    },
  ],
  agents: {
    "fixed-spawn-west": new FixedSpawnExpandAgent("FixedSpawnExpandWest", {
      x: 10,
      y: 10,
    }),
    "fixed-spawn-east": new FixedSpawnExpandAgent("FixedSpawnExpandEast", {
      x: 80,
      y: 80,
    }),
  },
  supportedActions: ["spawn", "wait", "attack"],
};
