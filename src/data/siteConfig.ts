export const HERO_VIDEO_URL =
  "https://krntknduwbqqecvhkurt.supabase.co/storage/v1/object/public/ggt/ggtfinal_wild_48mb.mp4";

export const TRACK_SRC = "/audio/track.mp3";

export const KAZTA_IG_LOGO = "/brand/kazta-logo.png";
export const KAZTA_INSTAGRAM_URL = "https://www.instagram.com/young_kazta/";

export const YOUTUBE_URL = "https://www.youtube.com/@Garguttt";
export const YOUTUBE_CHANNEL_ID = "@Garguttt";
export const SPOTIFY_URL =
  "https://open.spotify.com/intl-es/track/4KvIxXUbDzMicaBr2opF9e?si=ece662d11f1a48c0";
export const SPOTIFY_ARTIST_URL = "https://open.spotify.com/artist/3IWeUxh0WKXHNXJ6ahJUtX";
export const SPOTIFY_TRACK_ID = "4KvIxXUbDzMicaBr2opF9e";
export const SPOTIFY_EMBED_ARTIST = "https://open.spotify.com/embed/artist/3IWeUxh0WKXHNXJ6ahJUtX";
export const SPOTIFY_EMBED_TRACK = `https://open.spotify.com/embed/track/${SPOTIFY_TRACK_ID}`;
export const INSTAGRAM_URL = "https://www.instagram.com/garguttt/";
export const TIKTOK_URL = "https://www.tiktok.com/@gargutttt";

export const SITE_URL = "https://garguttieneunchingodeferia.com";
export const SITE_TITLE = "Garguttieneunchingodeferia";
export const SITE_DESCRIPTION =
  "Garguttieneunchingodeferia — Escucha 'YO TE KIERO SOLO' ya disponible. Música urbana desde Guadalajara, México.";
export const SITE_KEYWORDS = [
  "Garguttieneunchingodeferia",
  "YO TE KIERO SOLO",
  "Gargut",
  "música urbana",
  "Guadalajara",
  "México",
  "rap mexicano",
  "trap",
  "Spotify",
];
export const SITE_AUTHOR = "Gargut";
export const SITE_THEME_COLOR = "#000000";
export const OG_IMAGE_URL =
  "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02e7dd3698ba2b17ceb4ceda9f";

export const ARTIST_ORIGIN = "Guadalajara, México";
export const ARTIST_MONTHLY_LISTENERS = "1.7K";
export const ARTIST_FOLLOWERS = 272;

export interface Track {
  title: string;
  year: number;
  streams?: number;
  type: "solo" | "colab";
  spotifyUrl: string;
  coverUrl: string;
  collaborators?: string[];
}

export const DISCOGRAPHY: Track[] = [
  {
    title: "Zackly Copula Freestyle",
    year: 2025,
    streams: 21089,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/2WWA4JDyzFaBmckntw902Z",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0211b23fa45a4128167e5770bf",
    collaborators: ["Jack Salchicha", "Red Lean"],
  },
  {
    title: "Yo te kiero solo",
    year: 2026,
    streams: 14572,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/4DNc4mnyRFDCYpIL9IRqqZ",
    coverUrl: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02e7dd3698ba2b17ceb4ceda9f",
    collaborators: ["Buzk", "ESSENZY", "YESH!"],
  },
  {
    title: "POLLY POCKET",
    year: 2025,
    streams: 4082,
    type: "solo",
    spotifyUrl: "https://open.spotify.com/artist/3IWeUxh0WKXHNXJ6ahJUtX",
    coverUrl: "",
  },
  {
    title: "El Primer Artista",
    year: 2026,
    streams: 2168,
    type: "solo",
    spotifyUrl: "https://open.spotify.com/album/5iTz24kQ5Dmo4FxeW3Vn8s",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e024437e50c9119dbda16a0270c",
  },
  {
    title: "Experiencia Espiritual",
    year: 2026,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/2uqLu8WowZ9Ra7zDETFfZD",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0275915238051dd0872c7fb841",
    collaborators: ["zacklyvibes"],
  },
  {
    title: "Soy Artista o Eso Parece",
    year: 2026,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/28Vdtjsr3wqlsqSX4Ls2J8",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e05bfc9872e18ed532f17846",
    collaborators: ["zacklyvibes", "Micro"],
  },
  {
    title: "Red House",
    year: 2025,
    type: "solo",
    spotifyUrl: "https://open.spotify.com/album/1ldXLvpl5KXoagtRZVRaCD",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c500c9ad3eae300e75905f5e",
  },
  {
    title: "Artesania",
    year: 2025,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/2jDHDV8aF0NNy6ocjAKxt0",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f5c3d4834127785782d78e5d",
    collaborators: ["zacklyvibes"],
  },
  {
    title: "Confleis",
    year: 2025,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/0DcIQchijG7NTD123YoSVp",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02abe79f9b92cdfd2fd75935ef",
    collaborators: ["zacklyvibes"],
  },
  {
    title: "FENTATRIP",
    year: 2025,
    type: "colab",
    spotifyUrl: "https://open.spotify.com/album/3h4Oh8SX72pbVHOeAZjfkk",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0234030a7b2ecab98dde19c75a",
    collaborators: ["zacklyvibes"],
  },
  {
    title: "Gargut Nuevo",
    year: 2025,
    type: "solo",
    spotifyUrl: "https://open.spotify.com/album/2IgyqLhvBZliOHUGwH5E0P",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02031e3cfd1af6ebf410017029",
  },
];

export const SCENE = [
  { name: "zacklyvibes", url: "https://open.spotify.com/artist/1AxJkszDd8MM9WMqAaFRvg" },
  { name: "Buzk", url: "https://open.spotify.com/artist/1m8fKXHojdHLEJximLnB0W" },
  { name: "Jack Salchicha", url: "https://open.spotify.com/artist/5MO5koEdauhb0PXeoCUihQ" },
  { name: "ESSENZY", url: "https://open.spotify.com/artist/78fOQfZyFbO2AukijcStia" },
  { name: "YESH!", url: "" },
  { name: "Micro", url: "" },
  { name: "Red Lean", url: "" },
];
