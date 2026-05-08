import type { AgentAction, AgentObservation, LocalAgent } from "./types";

export class FixedSpawnExpandAgent implements LocalAgent {
  constructor(
    public readonly name: string,
    private readonly spawn: { x: number; y: number },
  ) {}

  decide(observation: AgentObservation): AgentAction {
    if (!observation.self.hasSpawned) {
      return {
        type: "spawn",
        x: this.spawn.x,
        y: this.spawn.y,
      };
    }

    if (observation.tick > 105 && observation.tick % 10 === 0) {
      return {
        type: "attack",
        target: "neutral",
        troops: null,
      };
    }

    return { type: "wait" };
  }
}
