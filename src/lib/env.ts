/**
 * Reads a server-only environment variable.
 *
 * Vercel exposes environment variables through `process.env` at runtime,
 * while Astro/Vite exposes them through `import.meta.env` during development
 * and build. Checking both keeps local development and production working.
 */
export function getServerEnv(
  name: string,
  buildTimeValue: string | undefined = undefined
): string | undefined {
  const runtime = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  const value = runtime?.[name] ?? buildTimeValue;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
