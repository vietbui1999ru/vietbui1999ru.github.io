"use client";

import Giscus from "@giscus/react";
import { MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function GiscusComments() {
  return (
    <div className="mt-16">
      <Separator className="mb-10" />

      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Discussion
        </h2>
      </div>

      <Giscus
        repo="vietbui1999ru/vietbui1999ru.github.io"
        repoId="R_kgDOQp69TA"
        category="General"
        categoryId="DIC_kwDOQp69TM4C9SY7"
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        theme="transparent_dark"
        lang="en"
        loading="lazy"
      />
    </div>
  );
}
