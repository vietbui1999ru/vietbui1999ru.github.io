import type { ZodTypeAny } from "astro/zod";

export type BlockDef<C> = { component: C; props: ZodTypeAny };

export type ResolvedBlock<C> = {
  id: string;
  component: C;
  props: Record<string, unknown>;
};

/**
 * Turns a note's `blocks:` list into components and validated props, in order.
 * Throws with the note path and the offending block or field, so a bad vault
 * edit fails the build with a pointer to the note.
 */
export function resolveBlocks<C>(
  note: string,
  blocks: unknown[],
  registry: Record<string, BlockDef<C>>,
): ResolvedBlock<C>[] {
  return blocks.map((raw, index) => {
    const { block, ...rest } = raw as { block?: unknown } & Record<string, unknown>;
    const id = typeof block === "string" ? block : "";
    if (!Object.hasOwn(registry, id)) {
      const known = Object.keys(registry).join(", ");
      throw new Error(
        `${note}: unknown block "${String(block)}" at blocks[${index}]. Known blocks: ${known}`,
      );
    }
    const def = registry[id];
    const parsed = def.props.safeParse(rest);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const unknownKeys = (issue as { keys?: string[] }).keys;
      const field = issue.path.join(".") || unknownKeys?.join(", ") || "(block)";
      throw new Error(`${note}: block "${id}" field "${field}": ${issue.message}`);
    }
    return { id, component: def.component, props: parsed.data as Record<string, unknown> };
  });
}
