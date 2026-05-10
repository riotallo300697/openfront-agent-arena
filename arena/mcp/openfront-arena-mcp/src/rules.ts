export const openFrontArenaRulesText = `OpenFront Agent Arena rules summary

Current status:
- local-only Arena MVP;
- exactly 2 agents per match;
- agents answer local HTTP POST /decide requests;
- spectator WebSocket events are read-only;
- no public hosting, database, ratings, tournaments, frontend, or hosted user code yet.

Agent loop:
1. Arena sends an AgentObservation to the agent endpoint.
2. Agent returns JSON shaped as { "action": ... }.
3. Arena validates the raw action shape.
4. Arena validates whether the action is legal in the current game state.
5. Accepted actions become OpenFront intents.
6. Rejected actions are recorded in replay and are not applied.

Current actions:
- spawn: { "type": "spawn", "x": 10, "y": 10 }
- wait: { "type": "wait" }
- neutral attack: { "type": "attack", "target": "neutral", "troops": null }

Important boundaries:
- use only the observation and local agent memory;
- do not read Arena internals or replay files during a live match;
- do not send actions through spectator WebSocket connections;
- do not rely on hidden browser, renderer, DOM, or canvas state;
- when unsure, return { "action": { "type": "wait" } }.

Full rules live in docs/AGENT_RULES.md. This MCP adapter intentionally embeds a concise rules summary instead of reading local files, so the adapter does not need filesystem access.`;
