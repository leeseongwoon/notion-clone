"use client";

import { useEffect, useRef } from "react";
import type { PersistedState } from "@/types";
import { useNotionStore, getSnapshotForSave } from "@/store/useNotionStore";
import { saveToStorage } from "@/lib/storage";

const DEBOUNCE_MS = 400;

function pickPersisted(state: ReturnType<typeof useNotionStore.getState>): PersistedState {
  return {
    pages: state.pages,
    blocks: state.blocks,
    blockIdsByPage: state.blockIdsByPage,
    rootPageIds: state.rootPageIds,
    expandedPageIds: state.expandedPageIds,
  };
}

function persistedEquals(a: PersistedState, b: PersistedState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useAutoSave() {
  const hydrated = useNotionStore((s) => s.hydrated);
  const setSaveStatus = useNotionStore((s) => s.setSaveStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const scheduleSave = () => {
      setSaveStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveToStorage(getSnapshotForSave());
        setSaveStatus("saved");
      }, DEBOUNCE_MS);
    };

    const unsub = useNotionStore.subscribe((state, prevState) => {
      if (!state.hydrated) return;
      if (persistedEquals(pickPersisted(state), pickPersisted(prevState))) {
        return;
      }
      scheduleSave();
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hydrated, setSaveStatus]);
}
