"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotionStore } from "@/store/useNotionStore";
import { getPageDisplayIcon, isFolderPage } from "@/lib/pages";
import styles from "./FolderView.module.css";

interface FolderViewProps {
  folderId: string;
}

export function FolderView({ folderId }: FolderViewProps) {
  const router = useRouter();
  const folder = useNotionStore((s) => s.pages[folderId]);
  const pages = useNotionStore((s) => s.pages);
  const createPage = useNotionStore((s) => s.createPage);
  const createFolder = useNotionStore((s) => s.createFolder);

  if (!folder || !isFolderPage(folder)) {
    return null;
  }

  const children = folder.childIds
    .map((id) => pages[id])
    .filter((p): p is NonNullable<typeof p> => !!p);

  const handleNewPage = () => {
    const id = createPage(folderId);
    router.push(`/${id}`);
  };

  const handleNewFolder = () => {
    const id = createFolder(folderId);
    router.push(`/${id}`);
  };

  return (
    <div className={styles.folderView}>
      <p className={styles.folderMeta}>
        {children.length}개 항목 · 폴더
      </p>

      <div className={styles.toolbar}>
        <button type="button" className={styles.toolBtn} onClick={handleNewPage}>
          + 페이지
        </button>
        <button type="button" className={styles.toolBtn} onClick={handleNewFolder}>
          + 하위 폴더
        </button>
      </div>

      {children.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden>
            📁
          </span>
          <p>이 폴더가 비어 있습니다.</p>
          <p className={styles.emptyHint}>페이지나 하위 폴더를 추가해 보세요.</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {children.map((child) => (
            <li key={child.id}>
              <Link href={`/${child.id}`} className={styles.card}>
                <span className={styles.cardIcon} aria-hidden>
                  {getPageDisplayIcon(child)}
                </span>
                <span className={styles.cardTitle}>
                  {child.title || "제목 없음"}
                </span>
                <span className={styles.cardType}>
                  {isFolderPage(child) ? "폴더" : "페이지"}
                  {child.passwordHash ? " · 🔒" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
