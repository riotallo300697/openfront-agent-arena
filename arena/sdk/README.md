# OpenFront Agent Arena SDK Helpers

This folder contains local SDK helpers for the current Arena API server.

Current status:

- TypeScript helper: `arena/sdk/typescript/arenaClient.ts`;
- Python helper: `arena/sdk/python/arena_client.py`;
- no npm or PyPI packages are published yet;
- helpers target the local Arena API server only.

Start the local Arena API server:

```text
npm.cmd run arena:server
```

For manual match demos, start the two local example agents in another terminal:

```text
npm.cmd run arena:http-example-server
```

Useful checks:

```text
npm.cmd run arena:sdk-typescript-smoke
npm.cmd run arena:sdk-python-smoke
```

The TypeScript helper supports REST calls and spectator events. The Python helper currently supports REST calls only; Python WebSocket support is a later small slice.
