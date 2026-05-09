from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen


JsonObject = dict[str, Any]


@dataclass(frozen=True)
class ArenaClientHTTPError(Exception):
    status: int
    body: Any

    @property
    def arena_error(self) -> JsonObject | None:
        if not isinstance(self.body, dict):
            return None

        error = self.body.get("error")
        if not isinstance(error, dict):
            return None

        if not isinstance(error.get("code"), str):
            return None

        if not isinstance(error.get("message"), str):
            return None

        details = error.get("details")
        if not isinstance(details, dict):
            return None

        return {
            "code": error["code"],
            "message": error["message"],
            "details": details,
        }

    def __str__(self) -> str:
        arena_error = self.arena_error
        if arena_error is None:
            return f"Arena API request failed with status {self.status}"

        return (
            f"Arena API request failed with status {self.status}: "
            f"{arena_error['code']}"
        )


class ArenaClient:
    def __init__(self, base_url: str, timeout_seconds: float = 10.0) -> None:
        self.base_url = base_url.rstrip("/") + "/"
        self.timeout_seconds = timeout_seconds

    def health(self) -> JsonObject:
        return self._request_json("arena/health")

    def create_match(self, request: JsonObject) -> JsonObject:
        return self._request_json("arena/matches", method="POST", body=request)

    def list_matches(self) -> JsonObject:
        return self._request_json("arena/matches")

    def get_match(self, match_id: str) -> JsonObject:
        return self._request_json(f"arena/matches/{quote(match_id)}")

    def get_result(self, match_id: str) -> JsonObject:
        return self._request_json(f"arena/matches/{quote(match_id)}/result")

    def get_replay(self, match_id: str) -> JsonObject:
        return self._request_json(f"arena/matches/{quote(match_id)}/replay")

    def _request_json(
        self,
        path: str,
        *,
        method: str = "GET",
        body: JsonObject | None = None,
    ) -> JsonObject:
        request_body = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(
            urljoin(self.base_url, path),
            data=request_body,
            headers={"content-type": "application/json"},
            method=method,
        )

        try:
            with urlopen(
                request,
                timeout=self.timeout_seconds,
            ) as response:
                return _read_json_response(response.read())
        except HTTPError as error:
            raise ArenaClientHTTPError(
                status=error.code,
                body=_read_json_response(error.read()),
            ) from error


def _read_json_response(raw_body: bytes) -> JsonObject:
    body = json.loads(raw_body.decode("utf-8"))
    if not isinstance(body, dict):
        raise ValueError("Arena API response body must be a JSON object")

    return body
