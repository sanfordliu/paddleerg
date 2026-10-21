import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_TILE_IDS, type MetricId } from '@/src/metrics/catalog';

interface LayoutState {
  tileIds: MetricId[];
  editing: boolean;
  setEditing: (editing: boolean) => void;
  reorder: (from: number, to: number) => void;
  removeTile: (id: MetricId) => void;
  addTile: (id: MetricId) => void;
  resetLayout: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      tileIds: [...DEFAULT_TILE_IDS],
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
        if (get().tileIds.includes(id)) return;
        set({ tileIds: [...get().tileIds, id] });
      },
      resetLayout: () => set({ tileIds: [...DEFAULT_TILE_IDS], editing: false }),
    }),
    {
      name: 'paddleerg-tile-layout',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ tileIds: s.tileIds }),
    }
  )
);
