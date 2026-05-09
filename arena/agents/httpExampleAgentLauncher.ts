import { pathToFileURL } from "node:url";
import { startHttpExampleAgentServer } from "./httpExampleAgent";

export type HttpExampleAgentPair = {
  readonly agents: [
    {
      readonly name: "ExampleAgentA";
      readonly clientID: "agent-a";
      readonly endpoint: string;
      readonly spawn: {
        readonly x: 10;
        readonly y: 10;
      };
    },
    {
      readonly name: "ExampleAgentB";
      readonly clientID: "agent-b";
      readonly endpoint: string;
      readonly spawn: {
        readonly x: 30;
        readonly y: 30;
      };
    },
  ];
  close(): Promise<void>;
};

export type HttpExampleAgentPairOptions = {
  agentAPort?: number;
  agentBPort?: number;
};

function envPort(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return fallback;
  }

  const port = Number(rawValue);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return port;
}

function optionPort(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("agent port must be a non-negative integer");
  }

  return value;
}

export async function startHttpExampleAgentPair({
  agentAPort = envPort("ARENA_EXAMPLE_AGENT_A_PORT", 5001),
  agentBPort = envPort("ARENA_EXAMPLE_AGENT_B_PORT", 5002),
}: HttpExampleAgentPairOptions = {}): Promise<HttpExampleAgentPair> {
  const agentA = await startHttpExampleAgentServer({
    port: optionPort(agentAPort, 5001),
    spawn: {
      x: 10,
      y: 10,
    },
  });
  const agentB = await startHttpExampleAgentServer({
    port: optionPort(agentBPort, 5002),
    spawn: {
      x: 30,
      y: 30,
    },
  });

  return {
    agents: [
      {
        name: "ExampleAgentA",
        clientID: "agent-a",
        endpoint: `${agentA.url}/decide`,
        spawn: {
          x: 10,
          y: 10,
        },
      },
      {
        name: "ExampleAgentB",
        clientID: "agent-b",
        endpoint: `${agentB.url}/decide`,
        spawn: {
          x: 30,
          y: 30,
        },
      },
    ],
    close: async () => {
      await agentB.close();
      await agentA.close();
    },
  };
}

function printAgentPair(agentPair: HttpExampleAgentPair) {
  console.log("OpenFront Agent Arena example HTTP agents listening.");
  console.log(
    JSON.stringify(
      {
        agents: agentPair.agents,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const agentPair = await startHttpExampleAgentPair();

  const closeAgents = () =>
    agentPair.close()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
      });

  process.on("SIGINT", closeAgents);
  process.on("SIGTERM", closeAgents);

  printAgentPair(agentPair);
}
