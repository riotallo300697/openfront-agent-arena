# Local Match Result

This document describes the current local baseline-agent match result.

The local match is not an external Agent API yet. It is a runner contract for the built-in baseline-agent match.

## Result Shape

`npm.cmd run arena:local` prints one final `LocalMatchResult` object:

```text
{
  matchID,
  ticks,
  updates,
  attackIntents,
  rejectedActions,
  agents,
  supportedActions,
  replay
}
```

Current fields:

- `matchID`: local match ID from `localMatchConfig`;
- `ticks`: number of executed game ticks;
- `updates`: number of runner updates emitted;
- `attackIntents`: accepted attack intents sent during the match;
- `rejectedActions`: local agent actions rejected before conversion to OpenFront intents;
- `agents`: final per-agent summary;
- `supportedActions`: current local action types;
- `replay`: generated JSONL replay path.

## Success Contract

The current local baseline-agent match is considered successful when:

- the match reaches `localMatchConfig.maxTicks`;
- runner updates equal the executed tick count;
- both configured baseline agents spawn;
- both configured baseline agents are alive at match end;
- both configured baseline agents own at least one tile;
- at least one attack intent is accepted during the match;
- no built-in baseline-agent actions are rejected;
- the generated replay contains a matching `match_end` record.

## Replay Link

The `match_end` replay record is written from the same `LocalMatchResult` fields used for the console output, excluding `supportedActions` and `replay`.

`npm.cmd run arena:replay` checks that the replay result contract still matches the local baseline-agent expectations.

## Current Check

Run:

```text
npm.cmd run arena:check
```

This runs the local match and then validates the generated replay.
