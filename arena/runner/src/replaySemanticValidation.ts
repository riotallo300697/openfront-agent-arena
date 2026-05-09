import { expectAgentsSpawnedAliveWithTiles } from "./agentStateAssertions";
import { readReplayEvents } from "./replayReader";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type {
  AgentAction,
  AgentReplaySummary,
  ReplayAgentInfo,
  ReplayEvent,
  ReplayMatchEndEvent,
  ReplayMetadataEvent,
  ReplayTickEvent,
} from "./types";

export type ReplaySemanticValidationConfig = {
  matchID: string;
  runner: ReplayMetadataEvent["runner"];
  map: string;
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  agents: ReplayAgentInfo[];
  supportedActions: readonly AgentAction["type"][];
  finalAgents: Pick<AgentReplaySummary, "agent" | "clientID">[];
  expectedRejectedActions?: number;
  expectedUpdates?: number;
  minAttackIntents?: number;
  expectedDecisionsPerTick?: number;
};

export type ReplaySemanticValidationResult = {
  events: ReplayEvent[];
  tickEvents: ReplayTickEvent[];
  matchEnd: ReplayMatchEndEvent;
};

function expectStringArray(
  name: string,
  actual: unknown,
  expected: readonly string[],
) {
  expectJsonEqual(name, actual, expected);
}

function expectReplayEventType<T extends ReplayEvent["type"]>(
  event: ReplayEvent,
  type: T,
): Extract<ReplayEvent, { type: T }> {
  expectCondition(`${type} event type`, event.type === type, { event });
  return event as Extract<ReplayEvent, { type: T }>;
}

function expectReplayAgents(
  name: string,
  actual: unknown,
  expected: ReplayAgentInfo[],
) {
  expectCondition(`${name}: agents array`, Array.isArray(actual), { actual });
  expectJsonEqual(`${name}: agents`, actual, expected);
}

function expectMetadata(
  event: ReplayEvent,
  config: ReplaySemanticValidationConfig,
) {
  const metadata = expectReplayEventType(event, "replay_metadata");

  expectCondition(
    "metadata format",
    metadata.format === "openfront-agent-arena-jsonl",
    {
      event: metadata,
    },
  );
  expectCondition("metadata version", metadata.version === 1, {
    event: metadata,
  });
  expectCondition("metadata match ID", metadata.matchID === config.matchID, {
    event: metadata,
  });
  expectCondition("metadata runner", metadata.runner === config.runner, {
    event: metadata,
  });
  expectCondition("metadata map", metadata.map === config.map, {
    event: metadata,
  });
  expectCondition("metadata max ticks", metadata.maxTicks === config.maxTicks, {
    event: metadata,
  });
  expectCondition(
    "metadata agent decision timeout",
    metadata.agentDecisionTimeoutMs === config.agentDecisionTimeoutMs,
    { event: metadata },
  );
  expectReplayAgents("metadata", metadata.agents, config.agents);
  expectStringArray(
    "metadata supported actions",
    metadata.supportedActions,
    config.supportedActions,
  );
}

function expectMatchStart(
  event: ReplayEvent,
  config: ReplaySemanticValidationConfig,
) {
  const matchStart = expectReplayEventType(event, "match_start");

  expectCondition(
    "match start match ID",
    matchStart.matchID === config.matchID,
    {
      event: matchStart,
    },
  );
  expectCondition("match start map", matchStart.map === config.map, {
    event: matchStart,
  });
  expectCondition(
    "match start max ticks",
    matchStart.maxTicks === config.maxTicks,
    {
      event: matchStart,
    },
  );
  expectReplayAgents("match start", matchStart.agents, config.agents);
  expectStringArray(
    "match start supported actions",
    matchStart.supportedActions,
    config.supportedActions,
  );
}

function expectTick(
  event: ReplayTickEvent,
  config: ReplaySemanticValidationConfig,
) {
  expectCondition("tick number", typeof event.tick === "number", { event });
  expectCondition("tick turn number", typeof event.turnNumber === "number", {
    event,
  });
  expectCondition("tick decisions", Array.isArray(event.decisions), { event });
  expectCondition("tick summary", Array.isArray(event.summary), { event });

  if (config.expectedDecisionsPerTick !== undefined) {
    expectCondition(
      "tick decision count",
      event.decisions.length === config.expectedDecisionsPerTick,
      {
        expectedDecisionsPerTick: config.expectedDecisionsPerTick,
        decisions: event.decisions.length,
        event,
      },
    );
  }

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

function expectMatchEndResultContract(
  matchEnd: ReplayMatchEndEvent,
  config: ReplaySemanticValidationConfig,
) {
  const expectedUpdates = config.expectedUpdates ?? config.maxTicks;

  expectCondition("match end match ID", matchEnd.matchID === config.matchID, {
    event: matchEnd,
  });
  expectCondition("match end ticks", matchEnd.ticks === config.maxTicks, {
    event: matchEnd,
  });
  expectCondition("match end updates", matchEnd.updates === expectedUpdates, {
    event: matchEnd,
  });

  if (config.minAttackIntents !== undefined) {
    expectCondition(
      "match end attack intents",
      typeof matchEnd.attackIntents === "number" &&
        matchEnd.attackIntents >= config.minAttackIntents,
      { event: matchEnd, minAttackIntents: config.minAttackIntents },
    );
  }

  if (config.expectedRejectedActions !== undefined) {
    expectCondition(
      "match end rejected actions",
      matchEnd.rejectedActions === config.expectedRejectedActions,
      {
        event: matchEnd,
        expectedRejectedActions: config.expectedRejectedActions,
      },
    );
  }

  expectCondition(
    "match end agents",
    matchEnd.agents.length === config.finalAgents.length,
    { event: matchEnd },
  );
}

export function validateReplayFileSemantics(
  filePath: string,
  config: ReplaySemanticValidationConfig,
): ReplaySemanticValidationResult {
  const events = readReplayEvents(filePath);

  expectCondition("replay event count", events.length >= 4, {
    eventCount: events.length,
  });
  expectMetadata(events[0], config);
  expectMatchStart(events[1], config);

  const matchEnd = expectReplayEventType(
    events[events.length - 1],
    "match_end",
  );
  expectMatchEndResultContract(matchEnd, config);

  const tickEvents = events.filter(
    (event): event is ReplayTickEvent => event.type === "tick",
  );
  expectCondition("replay has tick events", tickEvents.length > 0, {
    eventTypes: events.map((event) => event.type),
  });

  for (const tickEvent of tickEvents) {
    expectTick(tickEvent, config);
  }
  expectTickSequence(tickEvents);

  expectCondition(
    "tick count matches match end",
    tickEvents.length === matchEnd.ticks,
    {
      tickEvents: tickEvents.length,
      matchEndTicks: matchEnd.ticks,
    },
  );
  expectAgentsSpawnedAliveWithTiles({
    name: "match end final agents",
    agents: matchEnd.agents,
    expectedAgents: config.finalAgents,
  });

  return {
    events,
    tickEvents,
    matchEnd,
  };
}
