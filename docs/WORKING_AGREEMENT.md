# Working Agreement

This document describes how we work on OpenFront Agent Arena.

## Roles

The human coordinates the project:

- chooses priorities;
- approves architecture decisions;
- checks whether the result makes sense as a product;
- decides when to move to the next stage.

Codex implements coherent, reviewable packages:

- reads the relevant files first;
- explains changes in simple language;
- proposes options when there is an architecture choice;
- avoids changing OpenFront game logic unless explicitly approved;
- moves forward according to `docs/PROJECT_PLAN.md` without asking for file-by-file confirmation;
- updates documentation after each coherent package, while keeping context usage small.

## Working Style

We move in coherent, checkable packages. Each package should answer:

1. What is being changed?
2. Why is it needed?
3. Which files are touched?
4. How can the result be checked?
5. What risks remain?

To save review time and context window space, a "step" should usually be a coherent package, not a single-line micro-change. Prefer grouping closely related safe runner/server/doc changes when they share one purpose and can be checked together with `npm.cmd run arena:check`.

Examples of good packages:

- harden runner checks and update their docs;
- refactor local runner config and update replay checks that depend on it;
- add one new local-only runner capability plus focused validation and docs.

Codex should choose and implement safe next changes from `docs/PROJECT_PLAN.md` without asking for confirmation each time. Still keep separate approval for large architecture choices, OpenFront core changes, frontend, MCP, database, ratings, or anything listed below.

After every completed step, Codex should immediately propose the next concrete step. The proposal should be short and practical, so the human can continue without having to ask what comes next.

## Context Budget Rules

The chat context window is a project resource. Codex should actively conserve it.

Default behavior:

- read only the files and sections needed for the current package;
- prefer targeted search and small excerpts over full-file reads;
- avoid printing long command logs, full documents, or large diffs into the chat;
- capture long check output and report only pass/fail plus the failing tail when needed;
- keep final answers short and focused on changed files, checks, and next step;
- avoid re-reading `docs/DEVELOPMENT_LOG.md` unless a handoff, commit, or new-chat summary is being prepared.

Documentation rule:

- update the docs that are directly affected by the package;
- do not add a `docs/DEVELOPMENT_LOG.md` entry after every small package by default;
- instead, write a compact `DEVELOPMENT_LOG` summary before committing to GitHub, before starting a new chat, or when a meaningful milestone needs a handoff;
- if a package is risky or changes project direction, update `DEVELOPMENT_LOG` immediately.

Commit rule:

- treat commits as meaningful rollback points, not as a required action after every small documentation edit;
- prefer committing completed code packages, meaningful milestones, or coherent documentation batches;
- small documentation-only edits can stay uncommitted until they naturally join the next meaningful package, unless they are needed for handoff, stage closure, or a project-direction decision;
- when Codex suggests a commit, it should explain why that commit is a useful checkpoint.

Check rule:

- run `npm.cmd run arena:check` after completed code packages;
- do not run `npm.cmd run arena:check` for documentation-only packages;
- when skipping the check for a documentation-only package, say so explicitly in the final summary.

## Approval Rules

Codex must ask only before large architecture choices or work that falls into one of these categories:

- changing OpenFront game rules;
- changing the game loop;
- changing `src/core`;
- choosing Agent API formats;
- adding MCP, frontend, backend, database, Docker, or ratings;
- making large architecture changes.

This is the approval boundary. Codex does not need to ask before ordinary implementation, tests, smoke checks, directly affected documentation, or `docs/DEVELOPMENT_LOG.md` updates when the work stays inside the current approved stage. Codex should do those changes and report them afterward.

## Current Stage

Current stage: Stage 12 persistence foundation.

Already proven:

- headless OpenFront runner;
- local baseline-agent match;
- JSONL replay audit;
- `AgentObservation` and `AgentAction` contract;
- local HTTP example agent;
- mixed HTTP/local match;
- focused runner and replay smoke checks;
- local Arena API server health, match execution, read endpoints, duplicate matchID handling, and unreachable-agent replay audit.
- local WebSocket spectator event stream;
- local TypeScript SDK helper over the current Arena API server.
- local Python REST SDK helper over the current Arena API server.
- first full `docs/AGENT_RULES.md` version for people and LLM agents.
- first read-only MCP adapter slice using the official TypeScript MCP SDK.
- post-Stage 11 decision: Stage 12 persistence first, local session endpoints next.

Allowed now:

- add local persistence for completed Arena API match records and results;
- keep replay JSONL as files and persist only replay metadata/path;
- keep the current synchronous `POST /arena/matches` flow;
- use a local JSONL match store as the first persistence boundary before PostgreSQL;
- use `docs/POSTGRES_SCHEMA_PROPOSAL.md` as the review document before adding PostgreSQL, Docker Compose, or migrations;
- use `docs/POSTGRES_LOCAL_SETUP.md` for local PostgreSQL startup and migration commands;
- treat `docs/MCP_STAGE11_REVIEW.md` as the read-only MCP closure note;
- keep `docs/MCP_SESSION_MODEL.md` as the design gate for future action/session MCP tools;
- use `docs/POST_STAGE11_ARCHITECTURE_DECISION.md` as the record that Stage 12 persistence is first and local session endpoints are next;
- add first local Arena API session lifecycle endpoints without MCP action tools;
- defer action/session MCP implementation until Arena API observation/action endpoints exist and the architecture step is approved;
- reuse the current runner, HTTP client, replay writer, and replay checks;
- keep match storage in memory and replay files;
- update docs and checks after each package.

Not allowed now without explicit approval:

- modify OpenFront game code;
- modify `src/core`;
- change game loop or game rules;
- add frontend;
- add database;
- add ratings or tournaments;
- expose a public endpoint;
- run user-submitted code on the server.
