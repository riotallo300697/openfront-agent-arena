import { localMatchConfig } from "./localMatchConfig";
import { readReplayEvents } from "./replayReader";
import { localReplayFilePath, type ReplayEvent } from "./replayWriter";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type {
  ReplayMatchEndEvent,
  ReplayTickEvent,
} from "./types";

const localMatchID = localMatchConfig.matchID;
const expectedFinalAgents = localMatchConfig.players.map((player) => ({
  agent: localMatchConfig.agents[player.clientID].name,
  clientID: player.clientID,
}));
const expectedReplayAgents = localMatchConfig.players.map((player) => ({
  name: localMatchConfig.agents[player.clientID].name,
  clientID: player.clientID,
}));

function expectStringArray(
  name: string,
  actual: unknown,
  expected: readonly string[],
) {
  expectJsonEqual(name, actual, expected);
}

function expectReplayAgents(name: string, actual: unknown) {
  expectCondition(`${name}: agents array`, Array.isArray(actual), { actual });
  expectJsonEqual(`${name}: agents`, actual, expectedReplayAgents);
}

function expectReplayEventType<T extends ReplayEvent["type"]>(
  event: ReplayEvent,
  type: T,
): Extract<ReplayEvent, { type: T }> {
  expectCondition(`${type} event type`, event.type === type, { event });
  return event as Extract<ReplayEvent, { type: T }>;
}

function expectMetadata(event: ReplayEvent) {
  const metadata = expectReplayEventType(event, "replay_metadata");

  expectCondition("metadata format", metadata.format === "openfront-agent-arena-jsonl", {
    event: metadata,
  });
  expectCondition("metadata version", metadata.version === 1, { event: metadata });
  expectCondition("metadata match ID", metadata.matchID === localMatchID, {
    event: metadata,
  });
  expectCondition("metadata runner", metadata.runner === "local", {
    event: metadata,
  });
  expectCondition("metadata map", metadata.map === localMatchConfig.map, {
    event: metadata,
  });
  expectCondition("metadata max ticks", metadata.maxTicks === localMatchConfig.maxTicks, {
    event: metadata,
  });
  expectCondition(
    "metadata agent decision timeout",
    metadata.agentDecisionTimeoutMs === localMatchConfig.agentDecisionTimeoutMs,
    { event: metadata },
  );
  expectReplayAgents("metadata", metadata.agents);
  expectStringArray(
    "metadata supported actions",
    metadata.supportedActions,
    localMatchConfig.supportedActions,
  );
}

function expectMatchStart(event: ReplayEvent) {
  const matchStart = expectReplayEventType(event, "match_start");

  expectCondition("match start match ID", matchStart.matchID === localMatchID, {
    event: matchStart,
  });
  expectCondition("match start map", matchStart.map === localMatchConfig.map, {
    event: matchStart,
  });
  expectCondition("match start max ticks", matchStart.maxTicks === localMatchConfig.maxTicks, {
    event: matchStart,
  });
  expectReplayAgents("match start", matchStart.agents);
  expectStringArray(
    "match start supported actions",
    matchStart.supportedActions,
    localMatchConfig.supportedActions,
  );
}

function expectTick(event: ReplayTickEvent) {
  expectCondition("tick number", typeof event.tick === "number", { event });
  expectCondition("tick turn number", typeof event.turnNumber === "number", { event });
  expectCondition("tick decisions", Array.isArray(event.decisions), { event });
  expectCondition("tick summary", Array.isArray(event.summary), { event });

  for (const decision of event.decisions) {
    expectCondition(
      "tick decision input validation status",
      decision.inputValidation.status === "accepted" ||
        decision.inputValidation.status === "rejected",
      { decision },
    );
    expectCondition(
      "tick decision validation status",
      decision.validation === null ||
        decision.validation.status === "accepted" ||
        decision.validation.status === "rejected",
      { decision },
    );
    expectCondition(
      "tick decision accepted input keeps action",
      decision.inputValidation.status === "rejected" ||
        decision.action !== null,
      { decision },
    );
    expectCondition(
      "tick decision rejected input skips game validation",
      decision.inputValidation.status === "accepted" ||
        decision.validation === null,
      { decision },
    );
    expectCondition(
      "tick decision rejected input skips intent",
      decision.inputValidation.status === "accepted" ||
        decision.intent === null,
      { decision },
    );
  }
}

function expectTickSequence(tickEvents: ReplayTickEvent[]) {
  tickEvents.forEach((event, index) => {
    expectCondition("tick sequence turn number", event.turnNumber === index, {
      index,
      turnNumber: event.turnNumber,
    });
    expectCondition("tick sequence tick number", event.tick === index + 1, {
      expectedTick: index + 1,
      tick: event.tick,
    });
  });
}

function expectFinalAgents(matchEnd: ReplayMatchEndEvent) {
  const agents = matchEnd.agents;

  for (const expectedAgent of expectedFinalAgents) {
    const actualAgent = agents.find(
      (agent) =>
        agent.agent === expectedAgent.agent &&
        agent.clientID === expectedAgent.clientID,
    );

    expectCondition("match end agent exists", actualAgent !== undefined, {
      expectedAgent,
      agents,
    });
    expectCondition(
      "match end agent spawned",
      actualAgent !== undefined && actualAgent.hasSpawned === true,
      { actualAgent },
    );
    expectCondition(
      "match end agent owns tiles",
      actualAgent !== undefined && actualAgent.tilesOwned > 0,
      { actualAgent },
    );
    expectCondition(
      "match end agent alive",
      actualAgent !== undefined && actualAgent.isAlive === true,
      { actualAgent },
    );
  }
}

function expectMatchEndResultContract(matchEnd: ReplayMatchEndEvent) {
  expectCondition("match end match ID", matchEnd.matchID === localMatchID, {
    event: matchEnd,
  });
  expectCondition("match end ticks", matchEnd.ticks === localMatchConfig.maxTicks, {
    event: matchEnd,
  });
  expectCondition(
    "match end updates",
    matchEnd.updates === localMatchConfig.maxTicks,
    { event: matchEnd },
  );
  expectCondition(
    "match end attack intents",
    typeof matchEnd.attackIntents === "number" && matchEnd.attackIntents > 0,
    { event: matchEnd },
  );
  expectCondition("match end rejected actions", matchEnd.rejectedActions === 0, {
    event: matchEnd,
  });
  expectCondition(
    "match end agents",
    matchEnd.agents.length === localMatchConfig.players.length,
    { event: matchEnd },
  );
}

function main() {
  const filePath = localReplayFilePath(localMatchID);
  const events = readReplayEvents(filePath);

  expectCondition("replay event count", events.length >= 4, {
    eventCount: events.length,
  });
  expectMetadata(events[0]);

  const matchStart = events[1];
  expectMatchStart(matchStart);

  const matchEnd = expectReplayEventType(events[events.length - 1], "match_end");
  expectMatchEndResultContract(matchEnd);

  const tickEvents = events.filter(
    (event): event is ReplayTickEvent => event.type === "tick",
  );
  expectCondition("replay has tick events", tickEvents.length > 0, {
    eventTypes: events.map((event) => event.type),
  });

  for (const tickEvent of tickEvents) {
    expectTick(tickEvent);
  }
  expectTickSequence(tickEvents);

  expectCondition("tick count matches match end", tickEvents.length === matchEnd.ticks, {
    tickEvents: tickEvents.length,
    matchEndTicks: matchEnd.ticks,
  });
  expectFinalAgents(matchEnd);

  console.log("OpenFront Agent Arena replay smoke check passed.");
  console.log(
    JSON.stringify(
      {
        filePath,
        events: events.length,
        ticks: tickEvents.length,
        matchEndTicks: matchEnd.ticks,
        finalAgents: expectedFinalAgents.length,
        firstEvent: events[0].type,
        lastEvent: matchEnd.type,
      },
      null,
      2,
    ),
  );
}

main();
