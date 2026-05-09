import { buildLocalAgentDecision } from "./agentTurnPipeline";
import { createHeadlessGameRunner } from "./headless";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type { ExternalAgentClient } from "./types";

const player = {
  username: "PipelineAgent",
  clientID: "pipeline-agent",
  isLobbyCreator: true,
};

const runner = await createHeadlessGameRunner({
  gameID: "arena-agent-turn-pipeline-smoke",
  players: [player],
});

const spawnDecision = await buildLocalAgentDecision({
  runner,
  player,
  timeoutMs: 1000,
  agent: {
    name: "PipelineSpawnAgent",
    decide: () => ({ type: "spawn", x: 10, y: 10 }),
  },
});

expectJsonEqual("spawn input validation", spawnDecision.inputValidation, {
  status: "accepted",
});
expectJsonEqual("spawn game validation", spawnDecision.validation, {
  status: "accepted",
});
expectCondition("spawn action retained", spawnDecision.action?.type === "spawn", {
  decision: spawnDecision,
});
expectCondition("spawn intent created", spawnDecision.intent?.type === "spawn", {
  decision: spawnDecision,
});

const rejectedInputDecision = await buildLocalAgentDecision({
  runner,
  player,
  timeoutMs: 1000,
  agent: {
    name: "PipelineBadInputAgent",
    decide: () => ({ type: "wait", note: "extra fields are not allowed" }),
  },
});

expectJsonEqual("bad input validation", rejectedInputDecision.inputValidation, {
  status: "rejected",
  path: "action",
  reason: "has unknown keys: note",
});
expectJsonEqual("bad input action", rejectedInputDecision.action, null);
expectJsonEqual("bad input game validation", rejectedInputDecision.validation, null);
expectJsonEqual("bad input intent", rejectedInputDecision.intent, null);

const rejectedGameDecision = await buildLocalAgentDecision({
  runner,
  player,
  timeoutMs: 1000,
  agent: {
    name: "PipelineEarlyAttackAgent",
    decide: () => ({ type: "attack", target: "neutral", troops: null }),
  },
});

expectJsonEqual("early attack input validation", rejectedGameDecision.inputValidation, {
  status: "accepted",
});
expectJsonEqual("early attack game validation", rejectedGameDecision.validation, {
  status: "rejected",
  reason: "agent must spawn before attacking",
});
expectCondition(
  "early attack action retained",
  rejectedGameDecision.action?.type === "attack",
  { decision: rejectedGameDecision },
);
expectJsonEqual("early attack intent", rejectedGameDecision.intent, null);

const externalWaitAgent: ExternalAgentClient = {
  name: "PipelineExternalWaitAgent",
  async decide(observation) {
    expectCondition("external agent receives observation", observation.tick === 0, {
      observation,
    });
    return { type: "wait" };
  },
};

const externalWaitDecision = await buildLocalAgentDecision({
  runner,
  player,
  timeoutMs: 1000,
  agent: externalWaitAgent,
});

expectJsonEqual("external wait input validation", externalWaitDecision.inputValidation, {
  status: "accepted",
});
expectJsonEqual("external wait game validation", externalWaitDecision.validation, {
  status: "accepted",
});
expectCondition("external wait action retained", externalWaitDecision.action?.type === "wait", {
  decision: externalWaitDecision,
});
expectJsonEqual("external wait intent", externalWaitDecision.intent, null);

const throwingDecision = await buildLocalAgentDecision({
  runner,
  player,
  timeoutMs: 1000,
  agent: {
    name: "PipelineThrowingAgent",
    decide: () => {
      throw new Error("boom");
    },
  },
});

expectJsonEqual("throwing agent input validation", throwingDecision.inputValidation, {
  status: "rejected",
  path: "agent.decide",
  reason: "agent decision failed: boom",
});
expectJsonEqual("throwing agent action", throwingDecision.action, null);
expectJsonEqual("throwing agent game validation", throwingDecision.validation, null);
expectJsonEqual("throwing agent intent", throwingDecision.intent, null);

const timeoutDecision = await buildLocalAgentDecision({
  runner,
  player,
  timeoutMs: 1,
  agent: {
    name: "PipelineTimeoutAgent",
    decide: () => new Promise(() => {}),
  },
});

expectJsonEqual("timeout agent input validation", timeoutDecision.inputValidation, {
  status: "rejected",
  path: "agent.decide",
  reason: "agent decision timed out after 1ms",
});
expectJsonEqual("timeout agent action", timeoutDecision.action, null);
expectJsonEqual("timeout agent game validation", timeoutDecision.validation, null);
expectJsonEqual("timeout agent intent", timeoutDecision.intent, null);

console.log("OpenFront Agent Arena agent turn pipeline smoke check passed.");
console.log(
  JSON.stringify(
    {
      checkedDecisions: 6,
      acceptedInputDecisions: 3,
      rejectedInputDecisions: 3,
      rejectedGameDecisions: 1,
      externalClientDecisions: 1,
      failedAgentDecisions: 2,
    },
    null,
    2,
  ),
);
