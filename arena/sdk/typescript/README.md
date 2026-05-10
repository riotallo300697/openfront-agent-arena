# TypeScript SDK Helper

Local helper for the current Arena API server. This is not a published npm package yet.

## Basic Usage

```ts
import { ArenaClient } from "./arenaClient";

const client = new ArenaClient({
  baseUrl: "http://127.0.0.1:5000",
});

const health = await client.health();
console.log(health);

const match = await client.createMatch({
  matchID: "sdk-readme-match",
  map: "tests/testdata/maps/plains",
  maxTicks: 3,
  agentDecisionTimeoutMs: 1000,
  agents: [
    {
      clientID: "agent-a",
      name: "ExampleAgentA",
      endpoint: "http://127.0.0.1:5001/decide",
      spawn: { x: 10, y: 10 },
    },
    {
      clientID: "agent-b",
      name: "ExampleAgentB",
      endpoint: "http://127.0.0.1:5002/decide",
      spawn: { x: 30, y: 30 },
    },
  ],
});

console.log(match.result);
console.log(await client.getReplay(match.matchID));
```

## Spectator Events

```ts
const collector = await client.createEventCollector({
  matchID: "sdk-readme-match",
});

await client.createMatch(matchRequest);

const events = await collector.waitForMatchEnded();
await collector.close();

console.log(events.map((event) => event.type));
```

## Check

```text
npm.cmd run arena:sdk-typescript-smoke
```
