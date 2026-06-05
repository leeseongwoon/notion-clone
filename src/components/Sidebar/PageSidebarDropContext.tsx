"use client";

import { createContext, useContext } from "react";

const PageSidebarDropContext = createContext<string | null>(null);

export function PageSidebarDropProvider({
  folderDropTargetId,
  children,
}: {
  folderDropTargetId: string | null;
  children: React.ReactNode;
}) {
  return (
    <PageSidebarDropContext.Provider value={folderDropTargetId}>
      {children}
    </PageSidebarDropContext.Provider>
  );
}

export function useFolderDropTarget(pageId: string): boolean {
  const targetId = useContext(PageSidebarDropContext);
  return targetId === pageId;
}
