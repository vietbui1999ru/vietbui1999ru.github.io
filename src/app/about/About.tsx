"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	ABOUT_CURRENT_ROLE,
	ABOUT_HOBBIES,
	ABOUT_INTERESTS,
	ABOUT_PARAGRAPHS,
	ABOUT_TAGLINE,
} from "./aboutData";
import {
	AboutCard,
	AboutParagraphReveal,
	AboutSectionHeading,
} from "./components";
import { Briefcase, Gamepad2, Sparkles } from "lucide-react";

// ——— Customize scroll-driven split-text reveal (edit here) ———
const ABOUT_REVEAL_CONFIG = {
	/** When drive starts: 0 = paragraph top at viewport bottom; increase to start earlier. */
	scrollOffsetStart: 0,
	/** When drive ends: 1 = paragraph bottom at viewport top; decrease to end later. */
	scrollOffsetEnd: 1,
	/** Horizontal slide distance in px (words start off-screen left or right). */
	slideOffset: 40,
	/** Stagger: progress step per word (0..1). Larger = words reveal further apart in scroll. */
	staggerPerWord: 0.03,
	/** How much progress (0..1) each word takes to fully reveal. */
	revealSpan: 0.12,
	/** Two-color gradient for paragraph text (max 2 colors). */
	gradient: "linear-gradient(90deg, var(--primary), var(--accent))",
} as const;

const About = () => {
	return (
		<section id="about" className="relative min-h-screen w-full">
			<div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
				<AboutSectionHeading
					title="About Me"
					subtitle={ABOUT_TAGLINE}
					className="mb-12"
				/>

				{/* Even index: left-to-right; odd index: right-to-left */}
				<div className="space-y-10 mb-12">
					{ABOUT_PARAGRAPHS.map((text, i) => (
						<AboutParagraphReveal
							key={i}
							text={text}
							direction={i % 2 === 0 ? "ltr" : "rtl"}
							gradient={ABOUT_REVEAL_CONFIG.gradient}
							scrollOffsetStart={ABOUT_REVEAL_CONFIG.scrollOffsetStart}
							scrollOffsetEnd={ABOUT_REVEAL_CONFIG.scrollOffsetEnd}
							slideOffset={ABOUT_REVEAL_CONFIG.slideOffset}
							staggerPerWord={ABOUT_REVEAL_CONFIG.staggerPerWord}
							revealSpan={ABOUT_REVEAL_CONFIG.revealSpan}
						/>
					))}
				</div>

				<Separator className="my-10" />

				<AboutCard
					title={ABOUT_CURRENT_ROLE.title}
					description={`${ABOUT_CURRENT_ROLE.org} · ${ABOUT_CURRENT_ROLE.location}`}
					icon={<Briefcase className="size-5" />}
					className="mb-8"
				/>

				<AboutCard
					title="Interests & focus"
					icon={<Sparkles className="size-5" />}
					className="mb-8"
				>
					<div className="flex flex-wrap gap-2">
						{ABOUT_INTERESTS.map((label) => (
							<Badge key={label} variant="secondary">
								{label}
							</Badge>
						))}
					</div>
				</AboutCard>

				<AboutCard
					title="When I'm not coding"
					icon={<Gamepad2 className="size-5" />}
				>
					<div className="flex flex-wrap gap-2">
						{ABOUT_HOBBIES.map((hobby) => (
							<Badge key={hobby} variant="outline">
								{hobby}
							</Badge>
						))}
					</div>
				</AboutCard>
			</div>
		</section>
	);
};

export default About;
