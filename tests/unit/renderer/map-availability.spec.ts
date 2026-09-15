// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentPresence } from "@main/content/content-state";
import { MapData } from "@main/content/maps/map-data";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { settledListeners, mapAddedListeners, mapDeletedListeners, installedOnDisk, fetchedMaps, maps, nonLiveMaps, table } = vi.hoisted(() => {
    const settledListeners: Array<(refs: ContentPresence[]) => void> = [];
    const mapAddedListeners: Array<(springName: string) => void> = [];
    const mapDeletedListeners: Array<(springName: string) => void> = [];
    const fetchedMaps: { value: [MapData[], Array<{ springName: string; isInstalled?: boolean; isDownloading?: boolean }>] } = { value: [[], []] };
    const maps = new Map<string, MapData>();
    const nonLiveMaps = new Map<string, { springName: string }>();

    const table = <T extends { springName: string }>(entries: Map<string, T>) => ({
        toArray: async () => [...entries.values()],
        count: async () => entries.size,
        get: async (springName: string) => entries.get(springName),
        put: async (map: T) => entries.set(map.springName, map),
        update: async (springName: string, changes: Partial<T>) => entries.set(springName, { ...entries.get(springName), ...changes } as T),
        where: () => ({ equals: () => ({ modify: vi.fn() }) }),
        toCollection: () => ({ modify: async () => 0 }),
    });

    return { settledListeners, mapAddedListeners, mapDeletedListeners, installedOnDisk: { names: [] as string[] }, fetchedMaps, maps, nonLiveMaps, table };
});

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/db", () => ({ db: { maps: table(maps), nonLiveMaps: table(nonLiveMaps) } }));
vi.mock("@renderer/store/contents.store", () => ({
    onContentSettled: (callback: (refs: ContentPresence[]) => void) => settledListeners.push(callback),
}));
vi.stubGlobal(
    "window",
    Object.assign(window, {
        maps: {
            onMapAdded: (callback: (springName: string) => void) => mapAddedListeners.push(callback),
            onMapDeleted: (callback: (springName: string) => void) => mapDeletedListeners.push(callback),
            getInstalledMapNames: async () => installedOnDisk.names,
            fetchAllMaps: async () => fetchedMaps.value,
            fetchMissingMapImages: vi.fn(),
        },
    })
);

import { initMapsStore, mapsStore, syncMapsMetadata } from "@renderer/store/maps.store";

const map = (id: string, present: boolean): ContentPresence => ({ type: "map", id, present });

describe("map availability", () => {
    let settled: (refs: ContentPresence[]) => void;

    beforeEach(async () => {
        settledListeners.length = 0;
        mapAddedListeners.length = 0;
        mapDeletedListeners.length = 0;
        installedOnDisk.names = [];
        fetchedMaps.value = [[], []];
        maps.clear();
        nonLiveMaps.clear();
        mapsStore.isInitialized = false;
        mapsStore.availableMapNames = new Set();

        await initMapsStore();
        settled = settledListeners[0];
    });

    it("marks a downloaded map available", () => {
        settled([map("Quicksilver 1.2", true)]);

        expect(mapsStore.availableMapNames.has("Quicksilver 1.2")).toBe(true);
    });

    // A settled ref is one the queue is done with, which covers removals as much as downloads. Reading it
    // as "arrived" put deleted maps back into the list.
    it("stops listing a removed map", () => {
        settled([map("Quicksilver 1.2", true)]);

        settled([map("Quicksilver 1.2", false)]);

        expect(mapsStore.availableMapNames.has("Quicksilver 1.2")).toBe(false);
    });

    it("leaves other content types alone", () => {
        settled([{ type: "engine", id: "2025.06.21", present: true }]);

        expect(mapsStore.availableMapNames.size).toBe(0);
    });

    it("takes the watcher's word too", () => {
        mapAddedListeners.forEach((listener) => listener("Tabula 1.0"));
        expect(mapsStore.availableMapNames.has("Tabula 1.0")).toBe(true);

        mapDeletedListeners.forEach((listener) => listener("Tabula 1.0"));
        expect(mapsStore.availableMapNames.has("Tabula 1.0")).toBe(false);
    });

    it("creates a launch-safe local-only record for an installed map absent from metadata", async () => {
        fetchedMaps.value = [[], [{ springName: "Industral_Area", isInstalled: true }]];

        await syncMapsMetadata();

        expect(maps.get("Industral_Area")).toMatchObject({
            springName: "Industral_Area",
            displayName: "Industral Area",
            isInstalled: true,
            isLocalOnly: true,
            mapWidth: 16,
            mapHeight: 16,
            startboxesSet: [],
        });
        expect(mapsStore.availableMapNames.has("Industral_Area")).toBe(true);
    });
});
