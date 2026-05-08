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
- updates documentation after each stage.

## Working Style

We move in small steps. Each step should answer:

1. What is being changed?
2. Why is it needed?
3. Which files are touched?
4. How can the result be checked?
5. What risks remain?

## Approval Rules

Codex must ask before:

- changing OpenFront game rules;
- changing the game loop;
- changing `src/core`;
- choosing Agent API formats;
- adding MCP, frontend, backend, database, Docker, or ratings;
- making large architecture changes.

## Current Stage

Current stage: Stage 4, first local baseline-agent match.

Allowed now:

- add a local-only baseline-agent match;
- keep observation/action minimal;
- run agents inside the same Node.js process;
- document results and blockers.

Not allowed now:

- modify OpenFront game code;
- add Agent API;
- add MCP;
- add frontend;
- add database;
- refactor OpenFront.
