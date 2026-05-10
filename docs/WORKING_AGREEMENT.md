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

Current stage: Stage 10 Agent Rules documentation.

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

Allowed now:

- refine `docs/AGENT_RULES.md` against the current implemented API;
- add examples that match current `AgentObservation` and `AgentAction`;
- cross-link rules from directly related docs;
- reuse the current runner, HTTP client, replay writer, and replay checks;
- keep match storage in memory and replay files;
- update docs and checks after each package.

Not allowed now without explicit approval:

- modify OpenFront game code;
- modify `src/core`;
- change game loop or game rules;
- add MCP;
- add frontend;
- add database;
- add ratings or tournaments;
- expose a public endpoint;
- run user-submitted code on the server.
