# MCP Stage 11 Review

This is the Stage 11 closure review for the local MCP adapter work.

Status: read-only MCP adapter slice is complete. Action/session tools are intentionally deferred.

## Completed

Stage 11 now has a local MCP adapter under:

```text
arena/mcp/openfront-arena-mcp
```

The adapter uses the official TypeScript MCP SDK and exposes:

- `openfront_get_rules`;
- `openfront_list_matches`;
- `openfront_get_match_status`;
- `openfront_get_result`;
- `openfront_get_replay_metadata`;
- `openfront://rules`.

The adapter is covered by:

```text
npm.cmd run arena:mcp-smoke
```

That smoke check is included in:

```text
npm.cmd run arena:check
```

The smoke check verifies:

- MCP tool/resource listing;
- read-only annotations;
- embedded rules access;
- completed match listing;
- match status reading;
- result reading;
- replay metadata reading through Arena API only;
- unknown match errors as MCP tool errors;
- localhost-only HTTP `ARENA_API_URL` validation.

## Safety Boundary

The current MCP adapter does not expose:

- shell access;
- filesystem access;
- direct replay file reads;
- direct OpenFront core access;
- private data access;
- hosted user code execution;
- public network endpoints;
- action/session tools.

The adapter talks only to the configured localhost Arena API server over HTTP.

## Deferred

These Stage 11 ideas are not implemented:

- `openfront_join_match`;
- `openfront_get_observation`;
- `openfront_submit_action`;
- `openfront_resign`;
- MCP resources for live current match/session state.

They are deferred because the current Arena API runs synchronous matches through HTTP `/decide` agents. MCP action tools need a pull-style session model with pending observations, action tickets, deadlines, and duplicate/late action handling.

The design gate for that future work is:

```text
docs/MCP_SESSION_MODEL.md
```

## Closure Criteria

The read-only Stage 11 slice can be treated as closed when:

- `npm.cmd run arena:check` passes after the latest MCP code package;
- docs mention that action/session tools are not implemented yet;
- `docs/MCP_SESSION_MODEL.md` exists as the future design gate;
- no Stage 11 work has changed `src/core`, the game loop, or game rules.

Current status: all of the above are true.

## Next Architecture Gate

The next implementation step that would enable MCP action tools is not inside the MCP adapter itself. It is an Arena API/session architecture step.

Before implementing it, decide and approve:

- whether to add local Arena API session endpoints now or postpone them;
- whether sessions belong before or after database persistence;
- how match sessions advance when one or more agents are MCP-controlled;
- how timeouts, late actions, duplicate actions, and resign are recorded in replay audit.

The post-Stage 11 architecture choice is framed in:

```text
docs/POST_STAGE11_ARCHITECTURE_DECISION.md
```

Until then, the MCP adapter should stay read-only.
