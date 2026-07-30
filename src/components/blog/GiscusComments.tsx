"use client";

import { useEffect, useState } from "react";
import Giscus from "@giscus/react";
import { OWNER } from "@/config/owner";

export function GiscusComments() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mt-20 border-t-[1.5px] border-ink pt-8">
      <h2 className="mb-6 font-mono text-xs font-medium uppercase tracking-widest text-journal-1">
        discussion
      </h2>

      <Giscus
        repo={OWNER.giscus.repo}
        repoId={OWNER.giscus.repoId}
        category={OWNER.giscus.category}
        categoryId={OWNER.giscus.categoryId}
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        theme={theme}
        lang="en"
        loading="lazy"
      />
    </section>
  );
}
