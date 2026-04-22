/**
 * Un solo audio maestro (rola completa): public/audio/track.mp3.
 * Cada entrada es un *segmento* de uno de los 4 reels: trozos de distinta duración en el archivo de video
 * y, opcionalmente, el tramo de la rola con el que “comparar” para Elegido / brillo (alignedSong*).
 * Cuando cambies a una rola más larga, ajusta solo alignedSongStartSec / alignedSongEndSec.
 */
export type VideoClip = {
  id: string;
  src: string;
  clipStartSec: number;
  clipEndSec: number;
  alignedSongStartSec?: number;
  alignedSongEndSec?: number;
};

export const TRACK_SRC = "/audio/track.mp3";

/** Segmentos de distinta duración sobre los mismos 4 MP4; ventanas de canción alineadas al track actual (~26s). */
export const VIDEO_CLIPS: VideoClip[] = [
  { id: "1-hook", src: "/videos/1.mp4", clipStartSec: 0, clipEndSec: 5.2, alignedSongStartSec: 0, alignedSongEndSec: 5.2 },
  { id: "1-mid", src: "/videos/1.mp4", clipStartSec: 8, clipEndSec: 14.5, alignedSongStartSec: 8, alignedSongEndSec: 14.5 },
  { id: "2-open", src: "/videos/2.mp4", clipStartSec: 0, clipEndSec: 7, alignedSongStartSec: 2, alignedSongEndSec: 9 },
  { id: "2-late", src: "/videos/2.mp4", clipStartSec: 12, clipEndSec: 22, alignedSongStartSec: 14, alignedSongEndSec: 24 },
  { id: "3-short", src: "/videos/3.mp4", clipStartSec: 3, clipEndSec: 7.5, alignedSongStartSec: 6, alignedSongEndSec: 10.5 },
  { id: "3-long", src: "/videos/3.mp4", clipStartSec: 0, clipEndSec: 11, alignedSongStartSec: 11, alignedSongEndSec: 22 },
  { id: "4-a", src: "/videos/4.mp4", clipStartSec: 0, clipEndSec: 4.5, alignedSongStartSec: 18, alignedSongEndSec: 22.5 },
  { id: "4-b", src: "/videos/4.mp4", clipStartSec: 16, clipEndSec: 25.5, alignedSongStartSec: 1, alignedSongEndSec: 10.5 },
];
