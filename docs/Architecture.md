# Game Architecture

The game is split into four components:

1. **client** - Handles rendering and UI for the user

2. **core** - Deterministic simulation. It is pure TypeScript/JavaScript code with no external dependencies. It must be fully deterministic.

3. **server** - Handles coordination and relays of intents/requests

4. **api** - A closed source Cloudflare Worker that handles auth, stats, game data storage, cosmetics, and monetization

## Simulation Architecture

The game simulation logic does not run on the server. Instead, each client runs their own instance of core, which is why it must be deterministic. At the end of each tick, data is sent from core to client via GameUpdates. Core and client run in different threads - the core runs in a worker thread.

## Intents

When a user performs an action, it creates an "Intent" which is sent to the server. The server stores all intents for that tick/turn, and at the end, relays all intents to all clients in a bundle called a "turn". Each client receives the turn and sends it to its core simulation. The core then creates an "Execution" for each intent. Executions are the only thing that can modify the game state.

## Flow

1. Client sends intent to game server
2. Game server sends turn to client
3. Client forwards turn to core
4. Core creates an execution for each intent
5. Core calls `executeNextTick()`
6. All executions run
7. At the end of the tick core sends updates to client
8. Client renders the updates

## Static Assets / CDN

The game server only renders `index.html` and serves the websocket. Every other asset (the Vite JS/CSS bundle, images, map binaries, the worker module) is served from a CDN bucket. Setting `CDN_BASE` to an empty string falls back to same-origin and is the dev default.

### `CDN_BASE` format

- Full origin, no path, no trailing slash: `https://cdn.example.com`
- Set as a build-time variable in `vite.config.ts` (so the manifest is built with absolute URLs) and as a runtime env var on the server (so `RenderHtml.ts` can prefix Vite's emitted `/assets/...` refs at request time).
- Configured in CI via `vars.CDN_BASE` in `.github/workflows/{deploy,release}.yml`.

---

# OpenFront Agent Arena Architecture

This section describes the planned Agent Arena layer. At this stage, these parts are only planned. We are not implementing them yet.

## Headless OpenFront Runner

Runs OpenFront matches without a browser or human player.

The runner will eventually create a match, advance the game step by step, ask agents for actions, apply valid actions, and detect when the match is over.

## Agent API

The interface between the match runner and agents.

Agents will receive an observation, which is a machine-readable description of the current game state. They will respond with an action, such as expand, attack, defend, or wait.

The exact observation and action formats are not decided yet.

## Replay Writer

Saves what happened during a match.

The first version will likely save simple replay files so we can debug matches and later display them in a viewer.

## Baseline Agents

Simple built-in agents used for testing.

Examples may include random, expansion-focused, defensive, and balanced agents. They are useful because they let us test the arena before external agents exist.

## SDK

Small helper libraries for people who want to write agents.

The first SDK slice is a local TypeScript helper in `arena/sdk/typescript/arenaClient.ts`. It wraps the current local Arena API server and spectator event stream without publishing an npm package.

Python remains a later local-helper slice before any packaging work.

## MCP Adapter

A future adapter that lets compatible AI tools interact with the arena.

This should be a thin layer over the Agent API, not a separate system with broad permissions.

## Backend

A future service for managing agents, matches, results, replays, and leaderboards.

This is not part of the current stage.

## Frontend

A future web interface for humans.

It may show agents, matches, results, replay links, and documentation.

## Live Spectator Mode

A future feature for watching matches while they are running.

The first version should be simple: match status, current tick, player metrics, and recent events. A full visual map can come later.

## Leaderboard

A future ranking page for comparing agents.

The MVP will likely start with simple wins, losses, win rate, and later Elo.
