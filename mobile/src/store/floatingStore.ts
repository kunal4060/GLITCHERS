import { create } from 'zustand';

export type MiniWindowType = 'NONE' | 'EMAIL' | 'FINANCE' | 'TASKS' | 'CALENDAR' | 'AI';

interface FloatingState {
  isBubbleVisible: boolean;
  isMenuExpanded: boolean;
  activeMiniWindow: MiniWindowType;
  setBubbleVisible: (visible: boolean) => void;
  setMenuExpanded: (expanded: boolean) => void;
  openMiniWindow: (window: MiniWindowType) => void;
  closeMiniWindow: () => void;
}

export const useFloatingStore = create<FloatingState>((set) => ({
  isBubbleVisible: true,
  isMenuExpanded: false,
  activeMiniWindow: 'NONE',
  setBubbleVisible: (isBubbleVisible) => set({ isBubbleVisible }),
  setMenuExpanded: (isMenuExpanded) => set({ isMenuExpanded }),
  openMiniWindow: (activeMiniWindow) => set({ activeMiniWindow, isMenuExpanded: false }),
  closeMiniWindow: () => set({ activeMiniWindow: 'NONE' }),
}));
