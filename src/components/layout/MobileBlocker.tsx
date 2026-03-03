"use client";

import * as React from "react";

const MOBILE_MAX_WIDTH = 768;

function detectIsMobile() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const isTouchWidth = window.innerWidth <= MOBILE_MAX_WIDTH;
  const isUaMobile = /android|iphone|ipad|ipod|windows phone/i.test(ua);
  return isTouchWidth || isUaMobile;
}

export function MobileBlocker() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const update = () => {
      setIsMobile(detectIsMobile());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    if (isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow || "";
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 px-6 text-center">
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Coming Soon on Mobile
        </h1>
        <p className="text-sm text-zinc-300">
          Please use a desktop browser for the best experience and full access to this
          portfolio.
        </p>
      </div>
    </div>
  );
}

