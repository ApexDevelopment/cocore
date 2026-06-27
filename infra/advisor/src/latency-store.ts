// Disk-backed persistence for the advisor's rolling latency windows.
//
// The ack/ttft LatencyWindows live in memory and are otherwise lost on
// restart, which leaves the public latency headline blank ("—") until jobs
// flow again. In production the advisor mounts a volume; this module writes
// the last samples there and reloads them on the next boot so the headline
// shows the last known figures instead of nothing — flagged `cached` until
// live traffic refills the window.
//
// Best-effort by design: a missing/unreadable/corrupt file just leaves the
// window empty (the readout falls back to its usual "no samples" state), and
// a failed write is logged but never crashes the advisor. Writes are atomic
// (temp file + rename) so a crash mid-write can't leave a truncated cache.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { LatencyWindow } from "./latency-window.ts";

/** On-disk shape. Additive: unknown fields are ignored on read, so the
 *  format can grow without breaking older/newer advisors sharing a volume. */
interface PersistedLatency {
  /** Latency samples in ms, oldest-first. */
  samples: number[];
  /** When this snapshot was written (RFC3339, UTC). Informational. */
  updatedAt: string;
}

/** Seed `window` from the snapshot at `path`. Returns the number of samples
 *  hydrated (0 when the file is absent, empty, or unreadable). Never throws —
 *  a cold/corrupt cache simply yields an empty window. */
export async function hydrateLatencyWindow(window: LatencyWindow, path: string): Promise<number> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    // No snapshot yet (first boot / fresh volume) — nothing to hydrate.
    return 0;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedLatency>;
    const samples = Array.isArray(parsed?.samples)
      ? parsed.samples.filter((s): s is number => typeof s === "number" && Number.isFinite(s))
      : [];
    if (samples.length === 0) return 0;
    window.hydrate(samples);
    return samples.length;
  } catch {
    // Corrupt JSON — ignore and start cold rather than crash.
    return 0;
  }
}

/** Atomically write `window`'s current samples to `path`. Creates the parent
 *  directory if needed. Resolves false (without throwing) on any I/O error so
 *  a periodic flush can't take the advisor down. */
export async function persistLatencyWindow(
  window: LatencyWindow,
  path: string,
  nowIso: string,
): Promise<boolean> {
  const body: PersistedLatency = { samples: window.snapshot(), updatedAt: nowIso };
  try {
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, JSON.stringify(body), "utf8");
    await rename(tmp, path);
    return true;
  } catch (e) {
    console.error(`[latency-store] failed to persist ${path}:`, e);
    return false;
  }
}
