"use client";

import { useEffect } from "react";

/**
 * Locks document scroll while `locked` is true.
 * Restores the exact previous overflow value on unlock.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
