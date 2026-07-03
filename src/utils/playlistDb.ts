const DB_NAME = "LearnStudyPlaylistDB";
const DB_VERSION = 1;

export interface LoadedPlaylistState {
  playlistId: string;
  playlistUrl: string;
  lastWatchedVideo: string; // video ID
  resumeTimestamp: number;   // seconds
  watchProgress: number;     // progress percentage (0 - 100)
  updatedAt: string;         // ISO timestamp
}

export class PlaylistDb {
  private static db: IDBDatabase | null = null;

  private static getDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("playlists")) {
          db.createObjectStore("playlists", { keyPath: "playlistId" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  static async savePlaylistState(state: LoadedPlaylistState): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("playlists", "readwrite");
      const store = transaction.objectStore("playlists");
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getPlaylistState(playlistId: string): Promise<LoadedPlaylistState | null> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const transaction = db.transaction("playlists", "readonly");
      const store = transaction.objectStore("playlists");
      const request = store.get(playlistId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  static async getAllPlaylistStates(): Promise<LoadedPlaylistState[]> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const transaction = db.transaction("playlists", "readonly");
      const store = transaction.objectStore("playlists");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  static async deletePlaylistState(playlistId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("playlists", "readwrite");
      const store = transaction.objectStore("playlists");
      const request = store.delete(playlistId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
