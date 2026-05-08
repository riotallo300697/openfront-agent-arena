import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DevConfig,
  DevServerConfig,
} from "../../../src/core/configuration/DevConfig";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../../src/core/game/Game";
import { GameMapLoader, MapData } from "../../../src/core/game/GameMapLoader";
import { GameUpdateViewData } from "../../../src/core/game/GameUpdates";
import {
  genTerrainFromBin,
  MapManifest,
} from "../../../src/core/game/TerrainMapLoader";
import { createGameRunner, GameRunner } from "../../../src/core/GameRunner";
import { GameConfig, GameStartInfo } from "../../../src/core/Schemas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "../../..");
export const testMapDir = path.join(repoRoot, "tests/testdata/maps/plains");

export type ArenaPlayerSetup = {
  username: string;
  clientID: string;
  isLobbyCreator?: boolean;
};

export function readTestMapFile(fileName: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(path.join(testMapDir, fileName)));
}

export function readTestMapManifest(): MapManifest {
  return JSON.parse(
    fs.readFileSync(path.join(testMapDir, "manifest.json"), "utf8"),
  ) as MapManifest;
}

export function buildArenaGameConfig(): GameConfig {
  return {
    gameMap: GameMapType.Asia,
    gameMapSize: GameMapSize.Normal,
    gameMode: GameMode.FFA,
    gameType: GameType.Singleplayer,
    difficulty: Difficulty.Medium,
    nations: "disabled",
    donateGold: false,
    donateTroops: false,
    bots: 0,
    infiniteGold: false,
    infiniteTroops: false,
    instantBuild: false,
    randomSpawn: false,
    disableNavMesh: true,
  };
}

export function buildArenaConfig(): DevConfig {
  return new DevConfig(
    new DevServerConfig(),
    buildArenaGameConfig(),
    null,
    false,
  );
}

export async function loadTestGameMaps() {
  const manifest = readTestMapManifest();
  const gameMap = await genTerrainFromBin(
    manifest.map,
    readTestMapFile("map.bin"),
  );
  const miniGameMap = await genTerrainFromBin(
    manifest.map4x,
    readTestMapFile("map4x.bin"),
  );

  return { gameMap, miniGameMap };
}

export class FileSystemTestMapLoader implements GameMapLoader {
  getMapData(_map: GameMapType): MapData {
    return {
      mapBin: async () => readTestMapFile("map.bin"),
      map4xBin: async () => readTestMapFile("map4x.bin"),
      map16xBin: async () => readTestMapFile("map16x.bin"),
      manifest: async () => readTestMapManifest(),
      webpPath: path.join(testMapDir, "thumbnail.webp"),
    };
  }
}

export async function createHeadlessGameRunner({
  gameID,
  players,
  onUpdate,
}: {
  gameID: string;
  players: ArenaPlayerSetup[];
  onUpdate?: (update: GameUpdateViewData) => void;
}): Promise<GameRunner> {
  const gameStartInfo = {
    gameID,
    lobbyCreatedAt: Date.now(),
    config: buildArenaGameConfig(),
    players: players.map((player) => ({
      username: player.username,
      clanTag: null,
      clientID: player.clientID,
      isLobbyCreator: player.isLobbyCreator,
    })),
  } satisfies GameStartInfo;

  return createGameRunner(
    gameStartInfo,
    undefined,
    new FileSystemTestMapLoader(),
    (update) => {
      if ("updates" in update) {
        onUpdate?.(update);
      }
    },
  );
}
