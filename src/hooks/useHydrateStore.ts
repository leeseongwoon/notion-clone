"use client";

import { useEffect } from "react";
import { useNotionStore } from "@/store/useNotionStore";
import { migratePersistedState } from "@/lib/migrateBlocks";
import { loadFromStorage } from "@/lib/storage";

export function useHydrateStore() {
  const hydrate = useNotionStore((s) => s.hydrate);
  const hydrated = useNotionStore((s) => s.hydrated);

  useEffect(() => {
    const raw = loadFromStorage();
    hydrate(raw ? migratePersistedState(raw) : null);
  }, [hydrate]);

  return hydrated;
}
