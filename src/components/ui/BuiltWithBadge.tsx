"use client";

import { motion } from "framer-motion";
import { SiAstro, SiShadcnui } from "@icons-pack/react-simple-icons";

export function BuiltWithBadge() {
  return (
    <div className="flex justify-center py-6 pb-safe">
      <div className="relative overflow-hidden rounded-full border border-border/60 bg-muted/30 px-4 py-2">
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.4, ease: "easeInOut", delay: 0.6 }}
        />
        <span className="relative flex items-center gap-2 text-sm text-muted-foreground">
          <span>Built with</span>
          <a
            href="https://astro.build"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            <SiAstro className="h-3.5 w-3.5" />
            Astro
          </a>
          <span className="text-border">+</span>
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            <SiShadcnui className="h-3.5 w-3.5" />
            shadcn/ui
          </a>
        </span>
      </div>
    </div>
  );
}
