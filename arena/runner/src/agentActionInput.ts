import { validateAgentActionShape } from "./agentContractValidation";
import type { AgentAction, AgentInputValidation } from "./types";

export type AgentActionInputResult =
  | {
      status: "accepted";
      action: AgentAction;
    }
  | {
      status: "rejected";
      path: string;
      reason: string;
    };

function rejectedInput(
  validation: Extract<AgentInputValidation, { status: "rejected" }>,
): AgentActionInputResult {
  return validation;
}

export function parseAgentActionInput(value: unknown): AgentActionInputResult {
  const shapeValidation = validateAgentActionShape(value);

  if (shapeValidation.status === "rejected") {
    return rejectedInput(shapeValidation);
  }

  return {
    status: "accepted",
    action: value as AgentAction,
  };
}
