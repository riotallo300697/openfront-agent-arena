import http from "node:http";
import { WebSocket } from "ws";
import { startHttpExampleAgentServer } from "../../agents/httpExampleAgent";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import type { ArenaApiEvent } from "./arenaApiEvents";
import { startArenaApiServer } from "./arenaApiServer";

const server = await startArenaApiServer();
const agentA = await startHttpExampleAgentServer({
  spawn: {
    x: 10,
    y: 10,
  },
});
const agentB = await startHttpExampleAgentServer({
  spawn: {
    x: 30,
    y: 30,
  },
});

const serverURL = new URL(server.url);
const eventsURL = `ws://${serverURL.host}/arena/events`;

async function closedLocalDecideEndpoint(): Promise<string> {
  const closedServer = http.createServer((_request, response) => {
    response.writeHead(503);
    response.end();
  });

  await new Promise<void>((resolve) => {
    closedServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = closedServer.address();
  expectCondition(
    "arena api events closed endpoint address",
    typeof address === "object" &&
      address !== null &&
      typeof address.port === "number",
    { address },
  );
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  await new Promise<void>((resolve, reject) => {
    closedServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return `http://127.0.0.1:${port}/decide`;
}

function connectSpectator(): Promise<WebSocket> {
  const socket = new WebSocket(eventsURL);

  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function waitForClose(socket: WebSocket): Promise<number> {
  return new Promise((resolve) => {
    socket.once("close", (code) => resolve(code));
  });
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${server.url}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

try {
  const readOnlySpectator = await connectSpectator();
  const readOnlyClose = waitForClose(readOnlySpectator);
  readOnlySpectator.send(JSON.stringify({ type: "action" }));
  expectJsonEqual(
    "arena api spectator read-only close",
    await readOnlyClose,
    1008,
  );

  const events: ArenaApiEvent[] = [];
  const spectator = await connectSpectator();
  const ended = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("timed out waiting for match.ended"));
    }, 5000);

    spectator.on("message", (message) => {
      const event = JSON.parse(message.toString()) as ArenaApiEvent;
      events.push(event);

      if (event.type === "match.ended") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  const matchRequest = {
    matchID: "arena-api-events-smoke",
    map: "tests/testdata/maps/plains",
    maxTicks: 3,
    agentDecisionTimeoutMs: 1000,
    agents: [
      {
        clientID: "events-agent-a",
        name: "EventsAgentA",
        endpoint: `${agentA.url}/decide`,
        spawn: {
          x: 10,
          y: 10,
        },
      },
      {
        clientID: "events-agent-b",
        name: "EventsAgentB",
        endpoint: `${agentB.url}/decide`,
        spawn: {
          x: 30,
          y: 30,
        },
      },
    ],
  };
  const matchResponse = await postJson("/arena/matches", matchRequest);
  const matchBody = (await matchResponse.json()) as unknown;

  expectCondition("arena api events match status", matchResponse.status === 200, {
    status: matchResponse.status,
    body: matchBody,
  });
  await ended;
  spectator.close();

  expectJsonEqual(
    "arena api event types",
    events.map((event) => event.type),
    [
      "match.started",
      "action.accepted",
      "action.accepted",
      "match.tick",
      "action.accepted",
      "action.accepted",
      "match.tick",
      "action.accepted",
      "action.accepted",
      "match.tick",
      "match.ended",
    ],
  );
  expectJsonEqual(
    "arena api event match IDs",
    [...new Set(events.map((event) => event.matchID))],
    [matchRequest.matchID],
  );

  const tickEvents = events.filter((event) => event.type === "match.tick");
  expectJsonEqual(
    "arena api event ticks",
    tickEvents.map((event) => event.tick),
    [1, 2, 3],
  );
  const endedEvent = events.find((event) => event.type === "match.ended");
  expectJsonEqual(
    "arena api ended event ticks",
    endedEvent?.type === "match.ended" ? endedEvent.result.ticks : null,
    matchRequest.maxTicks,
  );

  const rejectedEvents: ArenaApiEvent[] = [];
  const rejectedSpectator = await connectSpectator();
  const rejectedEnded = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("timed out waiting for rejected match.ended"));
    }, 5000);

    rejectedSpectator.on("message", (message) => {
      const event = JSON.parse(message.toString()) as ArenaApiEvent;
      rejectedEvents.push(event);

      if (event.type === "match.ended") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  const unreachableEndpoint = await closedLocalDecideEndpoint();
  const rejectedMatchRequest = {
    ...matchRequest,
    matchID: "arena-api-events-rejected-smoke",
    maxTicks: 1,
    agents: matchRequest.agents.map((agent) => ({
      ...agent,
      endpoint: unreachableEndpoint,
    })),
  };
  const rejectedMatchResponse = await postJson(
    "/arena/matches",
    rejectedMatchRequest,
  );
  const rejectedMatchBody = (await rejectedMatchResponse.json()) as unknown;

  expectCondition(
    "arena api rejected events match status",
    rejectedMatchResponse.status === 200,
    {
      status: rejectedMatchResponse.status,
      body: rejectedMatchBody,
    },
  );
  await rejectedEnded;
  rejectedSpectator.close();

  expectJsonEqual(
    "arena api rejected event types",
    rejectedEvents.map((event) => event.type),
    [
      "match.started",
      "action.rejected",
      "action.rejected",
      "match.tick",
      "match.ended",
    ],
  );
  expectCondition(
    "arena api rejected event reasons",
    rejectedEvents
      .filter((event) => event.type === "action.rejected")
      .every(
        (event) =>
          event.type === "action.rejected" &&
          event.reason.startsWith("agent decision failed:"),
      ),
    { events: rejectedEvents },
  );

  console.log("OpenFront Agent Arena API server events smoke check passed.");
  console.log(
    JSON.stringify(
      {
        url: eventsURL,
        acceptedEvents: events.length,
        rejectedEvents: rejectedEvents.length,
        acceptedEventTypes: events.map((event) => event.type),
        rejectedEventTypes: rejectedEvents.map((event) => event.type),
      },
      null,
      2,
    ),
  );
} finally {
  await agentB.close();
  await agentA.close();
  await server.close();
}
