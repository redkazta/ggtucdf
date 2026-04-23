/**
 * Un solo audio maestro: public/audio/track.mp3.
 * Cada entrada es un *segmento* de uno de los 4 videos en almacenamiento.
 */
export type VideoClip = {
  id: string;
  src: string;
  clipStartSec: number;
  clipEndSec: number;
};

export const TRACK_SRC = "/audio/track.mp3";

/** Los 4 archivos de reel (misma fuente que bouncers y segmentos). Orden: reel 1…4. */
export const REEL_VIDEO_URLS = [
  "https://coilzxaisyuvcsdbywrk.supabase.co/storage/v1/object/public/videos/IMG_9343.MOV",
  "https://coilzxaisyuvcsdbywrk.supabase.co/storage/v1/object/public/videos/IMG_9350.MOV",
  "https://coilzxaisyuvcsdbywrk.supabase.co/storage/v1/object/public/videos/IMG_9490.MOV",
  "https://coilzxaisyuvcsdbywrk.supabase.co/storage/v1/object/public/videos/IMG_9569.MOV",
] as const;

/** H.264 en `public/videos/` — mucho más baratos que los MOV; solo para minireels flotantes. */
export const REEL_BOUNCER_VIDEO_URLS = [
  "/videos/1.mp4",
  "/videos/2.mp4",
  "/videos/3.mp4",
  "/videos/4.mp4",
] as const;

export const VIDEO_CLIPS: VideoClip[] = [
  {
    id: "1-hook",
    src: REEL_VIDEO_URLS[0],
    clipStartSec: 0,
    clipEndSec: 5.2,
  },
  {
    id: "1-mid",
    src: REEL_VIDEO_URLS[1],
    clipStartSec: 8,
    clipEndSec: 14.5,
  },
  {
    id: "2-open",
    src: REEL_VIDEO_URLS[2],
    clipStartSec: 0,
    clipEndSec: 7,
  },
  {
    id: "2-late",
    src: REEL_VIDEO_URLS[3],
    clipStartSec: 12,
    clipEndSec: 22,
  },
  {
    id: "3-short",
    src: REEL_VIDEO_URLS[0],
    clipStartSec: 3,
    clipEndSec: 7.5,
  },
  {
    id: "3-long",
    src: REEL_VIDEO_URLS[1],
    clipStartSec: 0,
    clipEndSec: 11,
  },
  {
    id: "4-a",
    src: REEL_VIDEO_URLS[2],
    clipStartSec: 0,
    clipEndSec: 4.5,
  },
  {
    id: "4-b",
    src: REEL_VIDEO_URLS[3],
    clipStartSec: 16,
    clipEndSec: 25.5,
  },
];
