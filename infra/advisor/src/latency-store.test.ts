import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hydrateLatencyWindow, persistLatencyWindow } from "./latency-store.ts";
import { LatencyWindow } from "./latency-window.ts";

describe("latency-store", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "cocore-latency-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("persists then re-hydrates a window across a simulated restart", async () => {
    const path = join(dir, "nested", "ack-latency.json");
    const a = new LatencyWindow(100);
    for (const ms of [100, 200, 300, 400]) a.record(ms);

    // mkdir -p the missing parent and write atomically.
    expect(await persistLatencyWindow(a, path, "2026-06-27T00:00:00.000Z")).toBe(true);

    const b = new LatencyWindow(100);
    const n = await hydrateLatencyWindow(b, path);
    expect(n).toBe(4);
    expect(b.snapshot()).toEqual([100, 200, 300, 400]);
    // Restored from disk → served as cached until live traffic arrives.
    expect(b.stats().cached).toBe(true);
    expect(b.stats().p50Ms).toBe(a.stats().p50Ms);
  });

  it("returns 0 (no throw) when the snapshot file is absent", async () => {
    const w = new LatencyWindow(100);
    expect(await hydrateLatencyWindow(w, join(dir, "missing.json"))).toBe(0);
    expect(w.stats().sampleCount).toBe(0);
  });

  it("ignores a corrupt snapshot rather than crashing", async () => {
    const path = join(dir, "corrupt.json");
    await writeFile(path, "{ not json", "utf8");
    const w = new LatencyWindow(100);
    expect(await hydrateLatencyWindow(w, path)).toBe(0);
    expect(w.stats().sampleCount).toBe(0);
  });

  it("filters non-numeric samples on read", async () => {
    const path = join(dir, "dirty.json");
    await writeFile(
      path,
      JSON.stringify({ samples: [100, "x", null, 200, Number.NaN], updatedAt: "z" }),
      "utf8",
    );
    const w = new LatencyWindow(100);
    expect(await hydrateLatencyWindow(w, path)).toBe(2);
    expect(w.snapshot()).toEqual([100, 200]);
  });

  it("writes the documented on-disk shape", async () => {
    const path = join(dir, "shape.json");
    const w = new LatencyWindow(100);
    w.record(42);
    await persistLatencyWindow(w, path, "2026-06-27T12:00:00.000Z");
    const body = JSON.parse(await readFile(path, "utf8")) as {
      samples: number[];
      updatedAt: string;
    };
    expect(body.samples).toEqual([42]);
    expect(body.updatedAt).toBe("2026-06-27T12:00:00.000Z");
  });
});
