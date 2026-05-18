from __future__ import annotations

import argparse
import json
import sys
from typing import Any
from urllib.request import Request, urlopen

from arena_client import ArenaClient, ArenaClientHTTPError


MATCH_ID = "arena-sdk-python-smoke"


def post_agent_decision(endpoint: str, client_id: str, name: str) -> dict[str, Any]:
    request = Request(
        endpoint,
        data=json.dumps(
            {
                "observation": {
                    "tick": 0,
                    "self": {
                        "clientID": client_id,
                        "name": name,
                        "hasSpawned": False,
                        "tilesOwned": 0,
                    },
                    "players": [],
                }
            }
        ).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )

    with urlopen(request, timeout=5) as response:
        body = json.loads(response.read().decode("utf-8"))
        if not isinstance(body, dict):
            raise AssertionError("agent response must be an object")

        return body


def assert_equal(name: str, actual: Any, expected: Any) -> None:
    if actual != expected:
        raise AssertionError(
            f"{name} failed: {json.dumps({'actual': actual, 'expected': expected})}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--agent-a-endpoint", required=True)
    parser.add_argument("--agent-b-endpoint", required=True)
    parser.add_argument("--session-artifact-id", required=True)
    parser.add_argument("--session-artifact", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    client = ArenaClient(args.base_url)
    session_artifact = json.loads(args.session_artifact)

    assert_equal(
        "python sdk example agent A spawn",
        post_agent_decision(args.agent_a_endpoint, "agent-a", "ExampleAgentA"),
        {"action": {"type": "spawn", "x": 10, "y": 10}},
    )
    assert_equal(
        "python sdk example agent B spawn",
        post_agent_decision(args.agent_b_endpoint, "agent-b", "ExampleAgentB"),
        {"action": {"type": "spawn", "x": 30, "y": 30}},
    )

    assert_equal(
        "python sdk health",
        client.health(),
        {
            "ok": True,
            "service": "openfront-agent-arena",
            "mode": "local",
        },
    )

    match_request = {
        "matchID": MATCH_ID,
        "map": "tests/testdata/maps/plains",
        "maxTicks": 3,
        "agentDecisionTimeoutMs": 1000,
        "agents": [
            {
                "clientID": "agent-a",
                "name": "ExampleAgentA",
                "endpoint": args.agent_a_endpoint,
                "spawn": {"x": 10, "y": 10},
            },
            {
                "clientID": "agent-b",
                "name": "ExampleAgentB",
                "endpoint": args.agent_b_endpoint,
                "spawn": {"x": 30, "y": 30},
            },
        ],
    }
    created_match = client.create_match(match_request)

    assert_equal("python sdk created match id", created_match["matchID"], MATCH_ID)
    assert_equal("python sdk created match status", created_match["status"], "completed")
    assert_equal("python sdk result ticks", created_match["result"]["ticks"], 3)
    assert_equal(
        "python sdk rejected actions",
        created_match["result"]["rejectedActions"],
        0,
    )
    assert_equal(
        "python sdk replay metadata",
        created_match["replay"],
        {
            "format": "openfront-agent-arena-jsonl",
            "path": created_match["result"]["replay"],
        },
    )

    listed_matches = client.list_matches()
    assert_equal(
        "python sdk list matches",
        [match["matchID"] for match in listed_matches["matches"]],
        [MATCH_ID],
    )
    assert_equal("python sdk get match", client.get_match(MATCH_ID), created_match)
    assert_equal(
        "python sdk get result",
        client.get_result(MATCH_ID),
        created_match["result"],
    )
    assert_equal(
        "python sdk get replay",
        client.get_replay(MATCH_ID),
        {
            "matchID": MATCH_ID,
            "format": "openfront-agent-arena-jsonl",
            "path": created_match["result"]["replay"],
        },
    )
    assert_equal(
        "python sdk list session artifacts",
        client.list_session_artifacts(),
        {"artifacts": [session_artifact]},
    )
    assert_equal(
        "python sdk get session artifact",
        client.get_session_artifact(args.session_artifact_id),
        session_artifact,
    )

    try:
        client.get_match("missing-python-sdk-match")
        raise AssertionError("expected missing match to fail")
    except ArenaClientHTTPError as error:
        assert_equal("python sdk missing match status", error.status, 404)
        assert_equal(
            "python sdk missing match code",
            error.arena_error["code"] if error.arena_error else None,
            "match_not_found",
        )

    try:
        client.get_session_artifact("missing-python-sdk-session-artifact")
        raise AssertionError("expected missing session artifact to fail")
    except ArenaClientHTTPError as error:
        assert_equal("python sdk missing session artifact status", error.status, 404)
        assert_equal(
            "python sdk missing session artifact code",
            error.arena_error["code"] if error.arena_error else None,
            "session_artifact_not_found",
        )

    print("OpenFront Agent Arena Python SDK smoke check passed.")
    print(
        json.dumps(
            {
                "baseUrl": args.base_url,
                "matchID": MATCH_ID,
                "checkedMethods": [
                    "health",
                    "create_match",
                    "list_matches",
                    "get_match",
                    "get_result",
                    "get_replay",
                    "list_session_artifacts",
                    "get_session_artifact",
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        raise
