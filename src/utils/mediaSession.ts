// MediaSession Metadata & OS Control Manager

export function updateMediaSessionMetadata(params: {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSeek?: (seconds: number) => void;
}) {
  if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: params.title || "Study Lecture",
      artist: params.artist || "StudyTube AI",
      album: params.album || "Lecture Series",
      artwork: params.artworkUrl
        ? [
            { src: params.artworkUrl, sizes: "96x96", type: "image/jpeg" },
            { src: params.artworkUrl, sizes: "128x128", type: "image/jpeg" },
            { src: params.artworkUrl, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });

    navigator.mediaSession.playbackState = params.isPlaying ? "playing" : "paused";

    if (params.onPlay) {
      navigator.mediaSession.setActionHandler("play", () => {
        params.onPlay?.();
      });
    }
    if (params.onPause) {
      navigator.mediaSession.setActionHandler("pause", () => {
        params.onPause?.();
      });
    }
    if (params.onNext) {
      navigator.mediaSession.setActionHandler("nexttrack", params.onNext);
    } else {
      navigator.mediaSession.setActionHandler("nexttrack", null);
    }
    if (params.onPrev) {
      navigator.mediaSession.setActionHandler("previoustrack", params.onPrev);
    } else {
      navigator.mediaSession.setActionHandler("previoustrack", null);
    }
    if (params.onSeek) {
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          params.onSeek?.(details.seekTime);
        }
      });
    }
  } catch (err) {
    console.warn("MediaSession update error:", err);
  }
}
