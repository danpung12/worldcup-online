"use client";

import {
  ArrowLeft,
  LogOut,
  MousePointer2,
  Plus,
  Share2,
  UserRound,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import styles from "./home.module.css";

export function HomeHeader({
  authUser,
  onBack,
  title,
  compact = false,
  onHome,
  onCreate,
  onLogin,
  onLogout,
  onShare,
}: {
  authUser: AuthUser | null;
  onBack?: () => void;
  title?: string;
  compact?: boolean;
  onHome: () => void;
  onCreate: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onShare: () => void;
}) {
  return (
    <header
      className={`${styles.header} ${compact ? styles.compactHeader : ""}`}
    >
      <div className={`${styles.container} ${styles.headerInner}`}>
        <div className={styles.headerIdentity}>
          {onBack && (
            <button
              type="button"
              className={styles.backButton}
              onClick={onBack}
              aria-label="뒤로"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={styles.brand}
            onClick={onHome}
            aria-label="픽온 홈"
          >
            <span className={styles.brandMark}>
              <MousePointer2 size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <span>PickOn</span>
          </button>
          {compact && <span className={styles.headerTitle}>{title}</span>}
        </div>
        <nav className={styles.headerActions} aria-label="주요 메뉴">
          <button
            type="button"
            className={styles.shareButton}
            onClick={onShare}
            aria-label="홈 링크 공유"
            title="홈 링크 공유"
          >
            <Share2 size={18} aria-hidden="true" />
          </button>
          {!compact && (
            <>
              <button
                type="button"
                className={styles.createButton}
                onClick={onCreate}
              >
                <Plus size={17} aria-hidden="true" />
                <span>만들기</span>
              </button>
              <span className={styles.headerDivider} aria-hidden="true" />
              {authUser ? (
                <div className={styles.account}>
                  <UserRound size={17} aria-hidden="true" />
                  <span className={styles.nickname} title={authUser.nickname}>
                    {authUser.nickname}
                  </span>
                  <button
                    type="button"
                    className={styles.logoutButton}
                    aria-label="로그아웃"
                    title="로그아웃"
                    onClick={onLogout}
                  >
                    <LogOut size={17} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.loginButton}
                  onClick={onLogin}
                  aria-label="카카오 로그인"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 4C6.48 4 2 7.45 2 11.7c0 2.72 1.84 5.12 4.62 6.48l-.72 2.62c-.1.37.32.66.64.45l3.17-2.08c.73.11 1.5.17 2.29.17 5.52 0 10-3.45 10-7.7C22 7.45 17.52 4 12 4Z" />
                  </svg>
                  <span>로그인</span>
                </button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
