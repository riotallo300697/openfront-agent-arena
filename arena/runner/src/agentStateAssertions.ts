import { expectCondition } from "./smokeAssert";
import type { AgentReplaySummary } from "./types";

export type ExpectedAgentState = Pick<AgentReplaySummary, "agent" | "clientID">;

export function expectAgentsSpawnedAliveWithTiles({
  agents,
  expectedAgents,
  name,
}: {
  agents: AgentReplaySummary[];
  expectedAgents: ExpectedAgentState[];
  name: string;
}): void {
  expectCondition(
    `${name} agent count`,
    agents.length === expectedAgents.length,
    {
      agents,
      expectedAgents,
    },
  );

  for (const expectedAgent of expectedAgents) {
    const actualAgent = agents.find(
      (agent) =>
        agent.agent === expectedAgent.agent &&
        agent.clientID === expectedAgent.clientID,
    );

    expectCondition(`${name} agent exists`, actualAgent !== undefined, {
      expectedAgent,
      agents,
    });
    expectCondition(
      `${name} agent spawned`,
      actualAgent !== undefined && actualAgent.hasSpawned === true,
      { actualAgent },
    );
    expectCondition(
      `${name} agent owns tiles`,
      actualAgent !== undefined && actualAgent.tilesOwned > 0,
      { actualAgent },
    );
    expectCondition(
      `${name} agent alive`,
      actualAgent !== undefined && actualAgent.isAlive === true,
      { actualAgent },
    );
  }
}
