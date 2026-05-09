import { actionToIntent } from "./intentAdapter";
import { createHeadlessGameRunner } from "./headless";
import { expectCondition } from "./smokeAssert";

const player = {
  username: "IntentAdapterA",
  clientID: "intent-adapter-a",
  isLobbyCreator: true,
};

async function main() {
  const runner = await createHeadlessGameRunner({
    gameID: "arena-intent-adapter-smoke",
    players: [player],
  });

  const spawnIntent = actionToIntent(runner.game, player, {
    type: "spawn",
    x: 10,
    y: 10,
  });
  const waitIntent = actionToIntent(runner.game, player, { type: "wait" });
  const attackIntent = actionToIntent(runner.game, player, {
    type: "attack",
    target: "neutral",
    troops: null,
  });

  expectCondition("spawn intent exists", spawnIntent !== null, { spawnIntent });
  expectCondition("spawn intent type", spawnIntent!.type === "spawn", {
    spawnIntent,
  });
  expectCondition("spawn intent client ID", spawnIntent!.clientID === player.clientID, {
    spawnIntent,
  });
  expectCondition("spawn intent tile", spawnIntent!.tile === runner.game.ref(10, 10), {
    spawnIntent,
  });

  expectCondition("wait action returns no intent", waitIntent === null, {
    waitIntent,
  });

  expectCondition("attack intent exists", attackIntent !== null, { attackIntent });
  expectCondition("attack intent type", attackIntent!.type === "attack", {
    attackIntent,
  });
  expectCondition("attack intent client ID", attackIntent!.clientID === player.clientID, {
    attackIntent,
  });
  expectCondition(
    "attack intent target",
    attackIntent!.targetID === runner.game.terraNullius().id(),
    { attackIntent },
  );
  expectCondition("attack intent troops", attackIntent!.troops === null, {
    attackIntent,
  });

  console.log("OpenFront Agent Arena intent adapter smoke check passed.");
  console.log(
    JSON.stringify(
      {
        checkedActions: 3,
        spawnIntent: {
          type: spawnIntent!.type,
          clientID: spawnIntent!.clientID,
          tile: spawnIntent!.tile,
        },
        waitIntent,
        attackIntent: {
          type: attackIntent!.type,
          clientID: attackIntent!.clientID,
          targetID: attackIntent!.targetID,
          troops: attackIntent!.troops,
        },
      },
      null,
      2,
    ),
  );
}

await main();
