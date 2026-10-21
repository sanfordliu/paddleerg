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
