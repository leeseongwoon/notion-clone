"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clampSidebarWidth,
  loadSidebarPrefs,
  saveSidebarPrefs,
  SIDEBAR_WIDTH_DEFAULT,
} from "@/lib/sidebarPrefs";

export function useSidebarLayout() {
  const [width, setWidth] = useState(SIDEBAR_WIDTH_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = loadSidebarPrefs();
    setWidth(prefs.width);
    setCollapsed(prefs.collapsed);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveSidebarPrefs({ width, collapsed });
  }, [width, collapsed, ready]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const startResize = useCallback(
    (clientX: number) => {
      const startX = clientX;
      const startWidth = width;

      const onMove = (ev: MouseEvent) => {
        setWidth(clampSidebarWidth(startWidth + (ev.clientX - startX)));
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width]
  );

  return {
    width,
    collapsed,
    toggleCollapsed,
    startResize,
    setCollapsed,
  };
}
