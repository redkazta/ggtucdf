import { dropConfig } from "../data/dropConfig";
import { getSupabaseAdmin } from "./supabase";

export interface DropSettings {
  latestReleaseName: string;
  latestReleaseUrl: string;
  nextDropName: string;
  nextDropDate: string | null;
  showCountdown: boolean;
  updatedAt: string | null;
}

export interface DropSettingsResult {
  settings: DropSettings;
  /** True when Supabase is configured, even if the row does not exist yet. */
  configured: boolean;
  source: "supabase" | "fallback";
  error?: string;
}

export const FALLBACK_DROP_SETTINGS: DropSettings = {
  latestReleaseName: dropConfig.latestReleaseName,
  latestReleaseUrl: dropConfig.latestReleaseUrl,
  nextDropName: dropConfig.nextDropName,
  nextDropDate: dropConfig.nextDropDate,
  showCountdown: dropConfig.showCountdown,
  updatedAt: null,
};

interface DropSettingsRow {
  latest_release_name: string;
  latest_release_url: string;
  next_drop_name: string | null;
  next_drop_date: string | null;
  show_countdown: boolean;
  updated_at: string | null;
}

function mapRow(row: DropSettingsRow): DropSettings {
  return {
    latestReleaseName: row.latest_release_name,
    latestReleaseUrl: row.latest_release_url,
    nextDropName: row.next_drop_name ?? "",
    nextDropDate: row.next_drop_date,
    showCountdown: Boolean(row.show_countdown),
    updatedAt: row.updated_at,
  };
}

export async function loadDropSettings(): Promise<DropSettingsResult> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      settings: FALLBACK_DROP_SETTINGS,
      configured: false,
      source: "fallback",
    };
  }

  const { data, error } = await supabase
    .from("drop_settings")
    .select(
      "latest_release_name, latest_release_url, next_drop_name, next_drop_date, show_countdown, updated_at"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[dropSettings] Supabase read failed:", error);
    return {
      settings: FALLBACK_DROP_SETTINGS,
      configured: true,
      source: "fallback",
      error:
        error.code === "42P01"
          ? "Falta la tabla drop_settings. Ejecuta supabase/drop_settings.sql en Supabase."
          : "No se pudieron leer los ajustes. Revisa la service role key y que la tabla drop_settings exista.",
    };
  }

  if (!data) {
    return {
      settings: FALLBACK_DROP_SETTINGS,
      configured: true,
      source: "fallback",
    };
  }

  return {
    settings: mapRow(data as DropSettingsRow),
    configured: true,
    source: "supabase",
  };
}

/**
 * Converts an ISO date to the value expected by <input type="datetime-local">
 * in Guadalajara time (UTC-6). Mexico no longer observes daylight saving time.
 */
export function toDatetimeLocalValue(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date
    .toLocaleString("sv-SE", { timeZone: "America/Mexico_City", hour12: false })
    .slice(0, 16)
    .replace(" ", "T");
}

/**
 * Accepts an ISO 8601 string or a datetime-local value. datetime-local values
 * are interpreted as Guadalajara time (UTC-6). Returns a UTC ISO string.
 */
export function normalizeNextDropDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;

  const raw = value.trim();
  if (!raw) return null;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return undefined;

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const withTimezone = hasTimezone
    ? raw
    : `${raw}${raw.length === 16 ? ":00" : ""}-06:00`;

  const timestamp = Date.parse(withTimezone);
  if (!Number.isFinite(timestamp)) return undefined;

  return new Date(timestamp).toISOString();
}
