import { validateAction } from "./actionValidation";
import { expectJsonEqual } from "./smokeAssert";
import type { ActionValidation, AgentObservation } from "./types";

const map = {
  isValidCoord: (x: number, y: number) =>
    x >= 0 && x < 100 && y >= 0 && y < 100,
};

function buildObservation(hasSpawned: boolean): AgentObservation {
  return {
    tick: 10,
    self: {
      clientID: "validation-agent",
      name: "ValidationAgent",
      hasSpawned,
      tilesOwned: hasSpawned ? 52 : 0,
    },
    players: [],
  };
}

function expectValidation(
  name: string,
  actual: ActionValidation,
  expected: ActionValidation,
) {
  expectJsonEqual(name, actual, expected);
}

const cases = [
  {
    name: "wait is accepted",
    actual: validateAction(map, buildObservation(false), { type: "wait" }),
    expected: { status: "accepted" },
  },
  {
    name: "first spawn is accepted",
    actual: validateAction(map, buildObservation(false), {
      type: "spawn",
      x: 10,
      y: 10,
    }),
    expected: { status: "accepted" },
  },
  {
    name: "repeated spawn is rejected",
    actual: validateAction(map, buildObservation(true), {
      type: "spawn",
      x: 10,
      y: 10,
    }),
    expected: {
      status: "rejected",
      reason: "agent has already spawned",
    },
  },
  {
    name: "fractional spawn coordinate is rejected",
    actual: validateAction(map, buildObservation(false), {
      type: "spawn",
      x: 10.5,
      y: 10,
    }),
    expected: {
      status: "rejected",
      reason: "spawn coordinates must be integers",
    },
  },
  {
    name: "spawn outside map is rejected",
    actual: validateAction(map, buildObservation(false), {
      type: "spawn",
      x: 100,
      y: 10,
    }),
    expected: {
      status: "rejected",
      reason: "spawn coordinates are outside the map",
    },
  },
  {
    name: "attack before spawn is rejected",
    actual: validateAction(map, buildObservation(false), {
      type: "attack",
      target: "neutral",
      troops: null,
    }),
    expected: {
      status: "rejected",
      reason: "agent must spawn before attacking",
    },
  },
  {
    name: "negative attack troops are rejected",
    actual: validateAction(map, buildObservation(true), {
      type: "attack",
      target: "neutral",
      troops: -1,
    }),
    expected: {
      status: "rejected",
      reason: "attack troops must be null or a non-negative number",
    },
  },
  {
    name: "attack after spawn is accepted",
    actual: validateAction(map, buildObservation(true), {
      type: "attack",
      target: "neutral",
      troops: null,
    }),
    expected: { status: "accepted" },
  },
] satisfies {
  name: string;
  actual: ActionValidation;
  expected: ActionValidation;
}[];

for (const validationCase of cases) {
  expectValidation(
    validationCase.name,
    validationCase.actual,
    validationCase.expected,
  );
}

console.log("OpenFront Agent Arena action validation smoke check passed.");
console.log(
  JSON.stringify(
    {
      checkedCases: cases.length,
      acceptedCases: cases.filter(
        (validationCase) => validationCase.expected.status === "accepted",
      ).length,
      rejectedCases: cases.filter(
        (validationCase) => validationCase.expected.status === "rejected",
      ).length,
    },
    null,
    2,
  ),
);
