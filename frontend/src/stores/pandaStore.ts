import { create } from "zustand";
import type { Panda, SimulationState, Trade, WSEvent } from "@/types";

interface PandaStore {
  pandas: Panda[];
  activePandaId: string | null;
  simulation: SimulationState | null;
  recentTrades: Trade[];
  lastWSEvent: WSEvent | null;

  setActivePanda: (id: string) => void;
  setPandas: (pandas: Panda[]) => void;
  updatePandaEmotion: (id: string, emotion: Panda["emotionState"]) => void;
  setSimulation: (sim: SimulationState | null) => void;
  appendTrade: (trade: Trade) => void;
  setLastWSEvent: (event: WSEvent) => void;
}

export const usePandaStore = create<PandaStore>((set) => ({
  pandas: [],
  activePandaId: null,
  simulation: null,
  recentTrades: [],
  lastWSEvent: null,

  setActivePanda: (id) => set({ activePandaId: id }),

  setPandas: (pandas) => set({ pandas }),

  updatePandaEmotion: (id, emotion) =>
    set((state) => ({
      pandas: state.pandas.map((p) =>
        p.id === id ? { ...p, emotionState: emotion } : p
      ),
    })),

  setSimulation: (simulation) => set({ simulation }),

  appendTrade: (trade) =>
    set((state) => ({
      recentTrades: [trade, ...state.recentTrades].slice(0, 100),
    })),

  setLastWSEvent: (event) => set({ lastWSEvent: event }),
}));
