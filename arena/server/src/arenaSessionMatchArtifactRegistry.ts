import type { ArenaSessionMatchArtifact } from "./arenaSessionMatchArtifact";

export type ArenaSessionMatchArtifactRegistry = {
  getByMatchID(matchID: string): ArenaSessionMatchArtifact | null;
  getBySessionID(sessionID: string): ArenaSessionMatchArtifact | null;
  list(): ArenaSessionMatchArtifact[];
  set(artifact: ArenaSessionMatchArtifact): void;
};

export function createArenaSessionMatchArtifactRegistry({
  artifacts,
}: {
  artifacts?: Iterable<ArenaSessionMatchArtifact>;
} = {}): ArenaSessionMatchArtifactRegistry {
  const artifactsBySessionID = new Map<string, ArenaSessionMatchArtifact>();
  const sessionIDsByMatchID = new Map<string, string>();

  function set(artifact: ArenaSessionMatchArtifact) {
    const previousArtifact = artifactsBySessionID.get(artifact.sessionID);
    if (previousArtifact !== undefined) {
      sessionIDsByMatchID.delete(previousArtifact.matchID);
    }

    artifactsBySessionID.set(artifact.sessionID, artifact);
    sessionIDsByMatchID.set(artifact.matchID, artifact.sessionID);
  }

  for (const artifact of artifacts ?? []) {
    set(artifact);
  }

  return {
    getByMatchID(matchID) {
      const sessionID = sessionIDsByMatchID.get(matchID);
      if (sessionID === undefined) {
        return null;
      }

      return artifactsBySessionID.get(sessionID) ?? null;
    },
    getBySessionID(sessionID) {
      return artifactsBySessionID.get(sessionID) ?? null;
    },
    list() {
      return Array.from(artifactsBySessionID.values());
    },
    set,
  };
}
