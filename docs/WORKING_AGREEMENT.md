# Working Agreement

This document describes how we work on OpenFront Agent Arena.

## Roles

The human coordinates the project:

- chooses priorities;
- approves architecture decisions;
- checks whether the result makes sense as a product;
- decides when to move to the next stage.

Codex implements small, reviewable steps:

- reads the relevant files first;
- explains changes in simple language;
- proposes options when there is an architecture choice;
- avoids changing OpenFront game logic unless explicitly approved;
- updates documentation after each coherent package, while keeping context usage small.

## Working Style

We move in small steps. Each step should answer:

1. What is being changed?
2. Why is it needed?
3. Which files are touched?
4. How can the result be checked?
5. What risks remain?

To save review time and context window space, a "step" should usually be a small coherent package, not a single-line micro-change. Prefer grouping 2-4 closely related safe runner/doc changes under one approval when they share one purpose and can be checked together with `npm.cmd run arena:check`.

Examples of good packages:

- harden runner checks and update their docs;
- refactor local runner config and update replay checks that depend on it;
- add one new local-only runner capability plus focused validation and docs.

Still keep separate approval for large architecture choices, OpenFront core changes, frontend, MCP, database, ratings, or anything listed below.

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

## Approval Rules

Codex must ask before:

- changing OpenFront game rules;
- changing the game loop;
- changing `src/core`;
- choosing Agent API formats;
- adding MCP, frontend, backend, database, Docker, or ratings;
- making large architecture changes.

## Current Stage

Current stage: transition from runner/replay foundation to the minimal local Arena API server.

Already proven:

- headless OpenFront runner;
- local baseline-agent match;
- JSONL replay audit;
- `AgentObservation` and `AgentAction` contract;
- local HTTP example agent;
- mixed HTTP/local match;
- focused runner and replay smoke checks.

Allowed now:

- document the minimal local Arena API server contract;
- add a small localhost-only Arena server proof after the contract is agreed;
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
