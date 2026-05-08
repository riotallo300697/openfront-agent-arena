import fs from "node:fs";
import path from "node:path";

import { repoRoot } from "./headless";

export type ReplayEvent = {
  type: string;
  [key: string]: unknown;
};

export class ReplayWriter {
  private readonly stream: fs.WriteStream;

  constructor(public readonly filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.stream = fs.createWriteStream(filePath, { encoding: "utf8" });
  }

  write(event: ReplayEvent): void {
    this.stream.write(`${JSON.stringify(event)}\n`);
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.end(() => resolve());
      this.stream.on("error", reject);
    });
  }
}

export function createLocalReplayWriter(matchID: string): ReplayWriter {
  return new ReplayWriter(
    path.join(repoRoot, "arena/replays", `${matchID}.jsonl`),
  );
}
