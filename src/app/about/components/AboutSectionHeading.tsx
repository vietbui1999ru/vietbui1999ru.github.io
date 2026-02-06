"use client";

import { cn } from "@/lib/utils";

type AboutSectionHeadingProps = {
	title: string;
	subtitle?: string;
	className?: string;
	titleClassName?: string;
	subtitleClassName?: string;
};

/**
 * Reusable section heading for About (or other sections).
 * Customize title/subtitle styling via className props.
 */
export function AboutSectionHeading({
	title,
	subtitle,
	className,
	titleClassName,
	subtitleClassName,
}: AboutSectionHeadingProps) {
	return (
		<header className={cn("space-y-2 text-center", className)}>
			<h2
				className={cn(
					"text-3xl font-semibold tracking-tight text-foreground md:text-4xl",
					titleClassName
				)}
			>
				{title}
			</h2>
			{subtitle ? (
				<p
					className={cn(
						"text-muted-foreground text-lg max-w-2xl mx-auto",
						subtitleClassName
					)}
				>
					{subtitle}
				</p>
			) : null}
		</header>
	);
}
