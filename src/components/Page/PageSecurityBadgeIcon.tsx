import type { PageSecurityBadge } from "@/lib/pageLock";
import styles from "./PageSecurityBadgeIcon.module.css";

interface PageSecurityBadgeIconProps {
  badge: PageSecurityBadge;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function PageSecurityBadgeIcon({
  badge,
  size = "sm",
  showLabel = true,
  className,
}: PageSecurityBadgeIconProps) {
  return (
    <span
      className={[
        styles.badge,
        badge.locked ? styles.locked : styles.unlocked,
        size === "md" ? styles.md : styles.sm,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={badge.title}
    >
      <span className={styles.emoji} aria-hidden>
        {badge.emoji}
      </span>
      {showLabel ? <span className={styles.label}>{badge.label}</span> : null}
    </span>
  );
}
