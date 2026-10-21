import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_TILE_IDS, type MetricId } from '@/src/metrics/catalog';

export const MAX_TILES = 6;

interface LayoutState {
  tileIds: MetricId[];
  editing: boolean;
  setEditing: (editing: boolean) => void;
  reorder: (from: number, to: number) => void;
  reorderById: (fromId: MetricId, toId: MetricId) => void;
  /** Swap two tiles by id (grid drag-onto-tile). */
  swapById: (a: MetricId, b: MetricId) => void;
  removeTile: (id: MetricId) => void;
  addTile: (id: MetricId) => void;
  resetLayout: () => void;
}

function clampTiles(ids: MetricId[]): MetricId[] {
  return ids.slice(0, MAX_TILES);
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      tileIds: clampTiles([...DEFAULT_TILE_IDS]),
      editing: false,
      setEditing: (editing) => set({ editing }),
      reorder: (from, to) => {
        const next = [...get().tileIds];
        if (from < 0 || to < 0 || from >= next.length || to >= next.length) return;
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        set({ tileIds: next });
      },
      reorderById: (fromId, toId) => {
        if (fromId === toId) return;
        const next = [...get().tileIds];
        const from = next.indexOf(fromId);
        const to = next.indexOf(toId);
        if (from < 0 || to < 0) return;
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        set({ tileIds: next });
      },
      swapById: (a, b) => {
        if (a === b) return;
        const next = [...get().tileIds];
        const i = next.indexOf(a);
        const j = next.indexOf(b);
        if (i < 0 || j < 0) return;
        next[i] = b;
        next[j] = a;
        set({ tileIds: next });
      },
      removeTile: (id) => set({ tileIds: get().tileIds.filter((t) => t !== id) }),
      addTile: (id) => {
        const { tileIds } = get();
        if (tileIds.includes(id) || tileIds.length >= MAX_TILES) return;
        set({ tileIds: [...tileIds, id] });
      },
      resetLayout: () => set({ tileIds: clampTiles([...DEFAULT_TILE_IDS]), editing: false }),
    }),
    {
      name: 'paddleerg-tile-layout',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ tileIds: s.tileIds }),
      merge: (persisted, current) => {
        const p = persisted as Partial<LayoutState> | undefined;
        const tileIds = clampTiles(
          Array.isArray(p?.tileIds) ? (p.tileIds as MetricId[]) : current.tileIds
        );
        return { ...current, ...p, tileIds };
      },
    }
  )
);
