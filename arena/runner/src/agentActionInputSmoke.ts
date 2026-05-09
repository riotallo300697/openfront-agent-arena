import { parseAgentActionInput } from "./agentActionInput";
import { expectJsonEqual } from "./smokeAssert";

const cases = [
  {
    name: "wait input is accepted",
    input: { type: "wait" },
    expected: {
      status: "accepted",
      action: { type: "wait" },
    },
  },
  {
    name: "spawn input is accepted",
    input: { type: "spawn", x: 10, y: 20 },
    expected: {
      status: "accepted",
      action: { type: "spawn", x: 10, y: 20 },
    },
  },
  {
    name: "neutral attack input is accepted",
    input: { type: "attack", target: "neutral", troops: null },
    expected: {
      status: "accepted",
      action: { type: "attack", target: "neutral", troops: null },
    },
  },
  {
    name: "non-object input is rejected",
    input: null,
    expected: {
      status: "rejected",
      path: "action",
      reason: "must be an object",
    },
  },
  {
    name: "unknown action input is rejected",
    input: { type: "build" },
    expected: {
      status: "rejected",
      path: "action.type",
      reason: "unknown action type: build",
    },
  },
  {
    name: "extra input fields are rejected",
    input: { type: "wait", note: "please wait" },
    expected: {
      status: "rejected",
      path: "action",
      reason: "has unknown keys: note",
    },
  },
  {
    name: "bad spawn input coordinate is rejected",
    input: { type: "spawn", x: "10", y: 20 },
    expected: {
      status: "rejected",
      path: "action.x",
      reason: "must be an integer",
    },
  },
  {
    name: "bad attack input target is rejected",
    input: { type: "attack", target: "player", troops: null },
    expected: {
      status: "rejected",
      path: "action.target",
      reason: 'must be "neutral"',
    },
  },
] as const;

for (const inputCase of cases) {
  expectJsonEqual(
    inputCase.name,
    parseAgentActionInput(inputCase.input),
    inputCase.expected,
  );
}

console.log("OpenFront Agent Arena agent action input smoke check passed.");
console.log(
  JSON.stringify(
    {
      checkedCases: cases.length,
      acceptedCases: cases.filter(
        (inputCase) => inputCase.expected.status === "accepted",
      ).length,
      rejectedCases: cases.filter(
        (inputCase) => inputCase.expected.status === "rejected",
      ).length,
    },
    null,
    2,
  ),
);
