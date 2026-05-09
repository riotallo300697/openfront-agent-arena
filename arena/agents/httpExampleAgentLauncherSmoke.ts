import { startHttpExampleAgentPair } from "./httpExampleAgentLauncher";
import { expectCondition, expectJsonEqual } from "../runner/src/smokeAssert";

const agentPair = await startHttpExampleAgentPair({
  agentAPort: 0,
  agentBPort: 0,
});

try {
  expectJsonEqual(
    "example agent pair client IDs",
    agentPair.agents.map((agent) => agent.clientID),
    ["agent-a", "agent-b"],
  );
  expectJsonEqual(
    "example agent pair names",
    agentPair.agents.map((agent) => agent.name),
    ["ExampleAgentA", "ExampleAgentB"],
  );
  expectCondition(
    "example agent pair endpoints",
    agentPair.agents.every((agent) =>
      agent.endpoint.startsWith("http://127.0.0.1:"),
    ),
    { agents: agentPair.agents },
  );

  const responses = await Promise.all(
    agentPair.agents.map((agent) =>
      fetch(agent.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          observation: {
            tick: 0,
            self: {
              clientID: agent.clientID,
              name: agent.name,
              hasSpawned: false,
              tilesOwned: 0,
            },
            players: [],
          },
        }),
      }).then((response) => response.json()),
    ),
  );

  expectJsonEqual("example agent pair spawn responses", responses, [
    {
      action: {
        type: "spawn",
        x: 10,
        y: 10,
      },
    },
    {
      action: {
        type: "spawn",
        x: 30,
        y: 30,
      },
    },
  ]);

  console.log("OpenFront Agent Arena HTTP example agent launcher smoke check passed.");
  console.log(
    JSON.stringify(
      {
        endpoints: agentPair.agents.map((agent) => agent.endpoint),
        checkedAgents: agentPair.agents.length,
      },
      null,
      2,
    ),
  );
} finally {
  await agentPair.close();
}
