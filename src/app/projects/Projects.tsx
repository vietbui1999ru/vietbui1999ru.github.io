"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink } from "lucide-react";
import { PROJECTS_ITEMS, PROJECTS_TITLE } from "./projectsData";

const Projects = () => {
	return (
		<section id="projects" className="relative min-h-screen w-full">
			<div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
				<SectionHeading
					title={PROJECTS_TITLE}
					className="mb-12"
				/>

				<div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
					{PROJECTS_ITEMS.map((project) => (
						<Card key={project.title} className="flex flex-col overflow-hidden">
							<CardHeader className="flex flex-row items-start justify-between gap-4">
								<div className="space-y-1.5">
									<CardTitle className="text-lg leading-tight">{project.title}</CardTitle>
								</div>
								<div className="flex shrink-0 gap-1">
									{project.links?.map((link, i) => (
										<Button
											key={i}
											variant="ghost"
											size="icon"
											className="size-8"
											asChild
										>
											<a
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												aria-label="GitHub"
											>
												<Github className="size-4" />
											</a>
										</Button>
									))}
								</div>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col gap-4">
								<CardDescription className="text-sm leading-relaxed flex-1">
									{project.content}
								</CardDescription>
								{project.badges?.length ? (
									<div className="flex flex-wrap gap-1.5">
										{project.badges.map((badge) => (
											<Badge key={badge} variant="secondary" className="text-xs">
												{badge}
											</Badge>
										))}
									</div>
								) : null}
								{project.links?.length ? (
									<div className="flex gap-2 pt-2">
										{project.links.map((link, i) => (
											<Button key={i} variant="outline" size="sm" asChild>
												<a
													href={link.url}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1.5"
												>
													<Github className="size-3.5" />
													View code
													<ExternalLink className="size-3" />
												</a>
											</Button>
										))}
									</div>
								) : null}
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
};

export default Projects;
