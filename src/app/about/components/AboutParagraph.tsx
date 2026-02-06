"use client";

import { cn } from "@/lib/utils";

type AboutParagraphProps = {
	children: React.ReactNode;
	className?: string;
	/** Optional: render as a single <p> or a wrapper div (e.g. for multiple inline elements) */
	as?: "p" | "div";
};

/**
 * Consistent paragraph styling for About content.
 * Edit className to change size, color, or spacing.
 */
export function AboutParagraph({
	children,
	className,
	as: Component = "p",
}: AboutParagraphProps) {
	return (
		<Component
			className={cn(
				"text-muted-foreground text-base leading-relaxed",
				className
			)}
		>
			{children}
		</Component>
	);
}
