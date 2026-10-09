import type { ReactNode } from "react";
import styles from "./pickon-ui.module.css";

export function PageIntro({
  label,
  title,
  description,
  action,
}: {
  label: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.pageIntro}>
      <div className={styles.introInner}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>{label}</p>
          <h1>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {action && <div className={styles.introAction}>{action}</div>}
      </div>
    </div>
  );
}
