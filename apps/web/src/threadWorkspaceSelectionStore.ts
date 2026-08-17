import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { create } from "zustand";

import type { DraftThreadEnvMode } from "./composerDraftStore";

export interface ThreadWorkspaceSelection {
  branch: string | null;
  worktreePath: string | null;
  envMode: DraftThreadEnvMode;
  startFromOrigin: boolean;
}

interface ThreadWorkspaceSelectionStore {
  readonly byThreadKey: Readonly<Record<string, ThreadWorkspaceSelection>>;
  readonly setSelection: (threadRef: ScopedThreadRef, selection: ThreadWorkspaceSelection) => void;
  readonly clearSelection: (threadRef: ScopedThreadRef) => void;
}

export const useThreadWorkspaceSelectionStore = create<ThreadWorkspaceSelectionStore>((set) => ({
  byThreadKey: {},
  setSelection: (threadRef, selection) => {
    const threadKey = scopedThreadKey(threadRef);
    set((state) => ({
      byThreadKey: {
        ...state.byThreadKey,
        [threadKey]: selection,
      },
    }));
  },
  clearSelection: (threadRef) => {
    const threadKey = scopedThreadKey(threadRef);
    set((state) => {
      if (state.byThreadKey[threadKey] === undefined) return state;
      const { [threadKey]: _removed, ...byThreadKey } = state.byThreadKey;
      return { byThreadKey };
    });
  },
}));
