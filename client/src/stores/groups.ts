/**
 * Groups Store — Zustand store for group chat management
 */

import { create } from 'zustand';
import type { GroupData } from '@/lib/api';

interface GroupsState {
  groups: GroupData[];
  activeGroupId: string | null;

  setGroups: (groups: GroupData[]) => void;
  addGroup: (group: GroupData) => void;
  updateGroup: (id: string, updates: Partial<GroupData>) => void;
  removeGroup: (id: string) => void;
  setActiveGroup: (id: string | null) => void;
}

export const useGroupsStore = create<GroupsState>()((set) => ({
  groups: [],
  activeGroupId: null,

  setGroups: (groups) => set({ groups }),

  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),

  updateGroup: (id, updates) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      activeGroupId: state.activeGroupId === id ? null : state.activeGroupId,
    })),

  setActiveGroup: (id) => set({ activeGroupId: id }),
}));
