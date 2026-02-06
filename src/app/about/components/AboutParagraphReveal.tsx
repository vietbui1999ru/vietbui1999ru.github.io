"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

const WORD_TOKEN_PATTERN = /\S+\s*/g;

export type RevealDirection = "ltr" | "rtl";

export type AboutParagraphRevealConfig = {
	/** Scroll offset: when drive starts (0 = paragraph top at viewport bottom). [start, end] in 0..1. */
	scrollOffsetStart?: number;
	/** Scroll offset: when drive ends (1 = paragraph bottom at viewport top). */
	scrollOffsetEnd?: number;
	/** Horizontal slide distance in px (words start off-screen left or right). */
	slideOffset?: number;
	/** Stagger: how much progress (0..1) each word waits before starting reveal. */
	staggerPerWord?: number;
	/** How much progress (0..1) each word takes to fully reveal. */
	revealSpan?: number;
};

const defaultConfig: Required<AboutParagraphRevealConfig> = {
	scrollOffsetStart: 0,
	scrollOffsetEnd: 1,
	slideOffset: 40,
	staggerPerWord: 0.03,
	revealSpan: 0.12,
};

type AboutParagraphRevealProps = AboutParagraphRevealConfig & {
	text: string;
	/** "ltr" = reveal left-to-right; "rtl" = right-to-left. Use even/odd index in list. */
	direction: RevealDirection;
	/** Two-color gradient for text, e.g. "linear-gradient(90deg, #a855f7, #3b82f6)". */
	gradient?: string;
	className?: string;
	/** "words" | "chars" — split and reveal per word or per character. */
	type?: "words" | "chars";
};

/**
 * One paragraph container: scroll-driven split-text reveal (left-to-right or right-to-left) with gradient text.
 * Pass direction based on list index: even => "ltr", odd => "rtl".
 */
export function AboutParagraphReveal({
	text,
	direction,
	gradient = "linear-gradient(90deg, var(--primary), var(--accent))",
	className,
	type = "words",
	scrollOffsetStart = defaultConfig.scrollOffsetStart,
	scrollOffsetEnd = defaultConfig.scrollOffsetEnd,
	slideOffset = defaultConfig.slideOffset,
	staggerPerWord = defaultConfig.staggerPerWord,
	revealSpan = defaultConfig.revealSpan,
}: AboutParagraphRevealProps) {
	const ref = React.useRef<HTMLParagraphElement>(null);

	const { scrollYProgress } = useScroll({
		target: ref,
		offset: [
			`${scrollOffsetStart * 100}% end`,
			`${scrollOffsetEnd * 100}% start`,
		],
	});

	const tokens = React.useMemo(() => {
		if (type === "words") {
			return (text.match(WORD_TOKEN_PATTERN) ?? []) as string[];
		}
		return text.split("");
	}, [text, type]);

	return (
		<p
			ref={ref}
			className={cn(
				"text-xl sm:text-2xl leading-relaxed font-medium",
				className
			)}
			style={{
				backgroundImage: gradient,
				backgroundClip: "text",
				WebkitBackgroundClip: "text",
				color: "transparent",
				backgroundSize: "100% 100%",
			}}
		>
			{tokens.map((token, i) => (
				<AboutParagraphRevealWord
					key={i}
					index={i}
					total={tokens.length}
					token={token}
					scrollYProgress={scrollYProgress}
					direction={direction}
					slideOffset={slideOffset}
					staggerPerWord={staggerPerWord}
					revealSpan={revealSpan}
					type={type}
				/>
			))}
		</p>
	);
}

type AboutParagraphRevealWordProps = {
	index: number;
	total: number;
	token: string;
	scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
	direction: RevealDirection;
	slideOffset: number;
	staggerPerWord: number;
	revealSpan: number;
	type: "words" | "chars";
};

function AboutParagraphRevealWord({
	index,
	total,
	token,
	scrollYProgress,
	direction,
	slideOffset,
	staggerPerWord,
	revealSpan,
	type,
}: AboutParagraphRevealWordProps) {
	// RTL: reveal from end to start (last word first); LTR: reading order (first word first)
	const contentIndex = direction === "rtl" ? total - 1 - index : index;
	const start = contentIndex * staggerPerWord;
	const end = start + revealSpan;

	const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
	// ltr: words start to the left (x < 0), slide in to 0; rtl: words start to the right (x > 0), slide in to 0
	const xStart = direction === "rtl" ? slideOffset : -slideOffset;
	const x = useTransform(scrollYProgress, [start, end], [xStart, 0]);

	return (
		<motion.span
			style={{
				display: "inline-block",
				whiteSpace: type === "chars" ? "pre" : "normal",
				opacity,
				x,
			}}
		>
			{token}
			{type === "words" ? "\u00A0" : null}
		</motion.span>
	);
}
