"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/button";
import { Trophy, ExternalLink } from "lucide-react";
import { ACHIEVEMENTS_ITEMS } from "./achievementsData";

const Achievements = () => {
	return (
		<section id="achievements" className="relative min-h-screen w-full">
			<div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
				<SectionHeading
					title="Achievements"
					subtitle="Milestones and recognitions."
					className="mb-12"
				/>

				<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
					{ACHIEVEMENTS_ITEMS.map((item) => (
						<Card key={item.title} className="overflow-hidden">
							<div className="aspect-video w-full overflow-hidden bg-muted">
								{/* Placeholder for image; use next/image when image path is resolved */}
								<div
									className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center bg-cover bg-center"
									style={
										item.image
											? { backgroundImage: `url(${item.image})` }
											: undefined
									}
								>
									{!item.image && (
										<Trophy className="size-12 text-muted-foreground/50" />
									)}
								</div>
							</div>
							<CardHeader>
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
									<Trophy className="size-5" />
								</div>
								<CardTitle className="text-lg">{item.title}</CardTitle>
								<CardDescription className="text-sm leading-relaxed">
									{item.content}
								</CardDescription>
							</CardHeader>
							{item.url && (
								<CardContent className="pt-0">
									<Button variant="outline" size="sm" asChild>
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5"
										>
											View
											<ExternalLink className="size-3.5" />
										</a>
									</Button>
								</CardContent>
							)}
						</Card>
					))}
				</div>
			</div>
		</section>
	);
};

export default Achievements;
