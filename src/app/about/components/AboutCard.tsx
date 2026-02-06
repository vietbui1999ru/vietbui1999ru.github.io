"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AboutCardProps = {
	title?: string;
	description?: string;
	icon?: ReactNode;
	children?: ReactNode;
	className?: string;
	contentClassName?: string;
};

/**
 * Reusable card for About subsections (role, interests, hobbies).
 * Pass icon (e.g. Lucide icon), title, optional description, and content.
 */
export function AboutCard({
	title,
	description,
	icon,
	children,
	className,
	contentClassName,
}: AboutCardProps) {
	return (
		<Card className={cn("overflow-hidden", className)}>
			{(title || icon) && (
				<CardHeader className="flex flex-row items-center gap-3">
					{icon ? (
						<div
							className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
							aria-hidden
						>
							{icon}
						</div>
					) : null}
					<div className="space-y-1.5">
						{title ? (
							<CardTitle className="text-lg">{title}</CardTitle>
						) : null}
						{description ? (
							<CardDescription>{description}</CardDescription>
						) : null}
					</div>
				</CardHeader>
			)}
			{children != null && (
				<CardContent className={cn("pt-0", contentClassName)}>
					{children}
				</CardContent>
			)}
		</Card>
	);
}
