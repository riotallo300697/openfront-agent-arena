import { buildLocalAgentDecision } from "./agentTurnPipeline";
import { createHeadlessGameRunner } from "./headless";
import { HttpAgentClient, type HttpAgentFetch } from "./httpAgentClient";
import { expectCondition, expectJsonEqual } from "./smokeAssert";

const player = {
  username: "HttpAgent",
  clientID: "http-agent",
  isLobbyCreator: true,
};

const runner = await createHeadlessGameRunner({
  gameID: "arena-http-agent-client-smoke",
  players: [player],
});

const seenRequests: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}[] = [];

const successfulFetch: HttpAgentFetch = async (url, init) => {
  seenRequests.push({
    url,
    method: init.method,
    headers: init.headers,
    body: JSON.parse(init.body) as unknown,
  });

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      action: {
        type: "spawn",
        x: 10,
        y: 10,
      },
    }),
  };
};

const client = new HttpAgentClient({
  name: "MockHttpAgent",
  endpoint: "http://127.0.0.1:9999/decide",
  fetchImpl: successfulFetch,
});
const decision = await buildLocalAgentDecision({
  agent: client,
  player,
  runner,
  timeoutMs: 1000,
});

expectJsonEqual("http client input validation", decision.inputValidation, {
  status: "accepted",
});
expectJsonEqual("http client game validation", decision.validation, {
  status: "accepted",
});
expectCondition("http client action retained", decision.action?.type === "spawn", {
  decision,
});
expectCondition("http client spawn intent created", decision.intent?.type === "spawn", {
  decision,
});
expectJsonEqual("http client request count", seenRequests.length, 1);
expectJsonEqual("http client request URL", seenRequests[0].url, client.endpoint);
expectJsonEqual("http client request method", seenRequests[0].method, "POST");
expectJsonEqual("http client content type", seenRequests[0].headers["content-type"], "application/json");
expectCondition(
  "http client sends observation",
  typeof seenRequests[0].body === "object" &&
    seenRequests[0].body !== null &&
    "observation" in seenRequests[0].body,
  { request: seenRequests[0] },
);

const httpErrorClient = new HttpAgentClient({
  name: "MockHttpErrorAgent",
  endpoint: "http://127.0.0.1:9999/decide",
  fetchImpl: async () => ({
    ok: false,
    status: 503,
    statusText: "Service Unavailable",
    json: async () => ({}),
  }),
});
const httpErrorDecision = await buildLocalAgentDecision({
  agent: httpErrorClient,
  player,
  runner,
  timeoutMs: 1000,
});

expectJsonEqual("http error input validation", httpErrorDecision.inputValidation, {
  status: "rejected",
  path: "agent.decide",
  reason: "agent decision failed: agent endpoint returned 503 Service Unavailable",
});
expectJsonEqual("http error action", httpErrorDecision.action, null);
expectJsonEqual("http error game validation", httpErrorDecision.validation, null);
expectJsonEqual("http error intent", httpErrorDecision.intent, null);

const badBodyClient = new HttpAgentClient({
  name: "MockBadBodyAgent",
  endpoint: "http://127.0.0.1:9999/decide",
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      notAction: {
        type: "wait",
      },
    }),
  }),
});
const badBodyDecision = await buildLocalAgentDecision({
  agent: badBodyClient,
  player,
  runner,
  timeoutMs: 1000,
});

expectJsonEqual("bad body input validation", badBodyDecision.inputValidation, {
  status: "rejected",
  path: "agent.decide",
  reason: "agent decision failed: agent endpoint response must be an object with action",
});
expectJsonEqual("bad body action", badBodyDecision.action, null);
expectJsonEqual("bad body game validation", badBodyDecision.validation, null);
expectJsonEqual("bad body intent", badBodyDecision.intent, null);

console.log("OpenFront Agent Arena HTTP agent client smoke check passed.");
console.log(
  JSON.stringify(
    {
      checkedClients: 3,
      successfulRequests: seenRequests.length,
      rejectedClientDecisions: 2,
    },
    null,
    2,
  ),
);
