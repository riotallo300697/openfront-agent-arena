# Python SDK Helper

Local helper for the current Arena API server. This is not a published PyPI package yet.

The helper uses only Python standard library modules.

## Basic Usage

```python
from arena_client import ArenaClient

client = ArenaClient("http://127.0.0.1:5000")

health = client.health()
print(health)

match = client.create_match(
    {
        "matchID": "sdk-readme-match",
        "map": "tests/testdata/maps/plains",
        "maxTicks": 3,
        "agentDecisionTimeoutMs": 1000,
        "agents": [
            {
                "clientID": "agent-a",
                "name": "ExampleAgentA",
                "endpoint": "http://127.0.0.1:5001/decide",
                "spawn": {"x": 10, "y": 10},
            },
            {
                "clientID": "agent-b",
                "name": "ExampleAgentB",
                "endpoint": "http://127.0.0.1:5002/decide",
                "spawn": {"x": 30, "y": 30},
            },
        ],
    }
)

print(match["result"])
print(client.get_replay(match["matchID"]))
print(client.list_session_artifact_summaries())
```

## Supported Methods

- `health()`;
- `create_match(request)`;
- `list_matches()`;
- `get_match(match_id)`;
- `get_result(match_id)`;
- `get_replay(match_id)`;
- `list_session_artifacts()`;
- `get_session_artifact(session_id)`;
- `list_session_artifact_summaries()`;
- `get_session_artifact_summary(session_id)`.

Python spectator WebSocket helpers are not included yet.

## Check

```text
npm.cmd run arena:sdk-python-smoke
```
