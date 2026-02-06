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
import { Calendar, Clock, FileText } from "lucide-react";
import { BLOG_SECTION_TITLE, BLOG_SECTION_SUBTITLE, BLOG_RECENT_POSTS } from "./blogData";

const Blog = () => {
	return (
		<section id="blog" className="relative min-h-screen w-full">
			<div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
				<SectionHeading
					title={BLOG_SECTION_TITLE}
					subtitle={BLOG_SECTION_SUBTITLE}
					className="mb-12"
				/>

				<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
					{BLOG_RECENT_POSTS.map((post) => (
						<Card key={post.slug} className="overflow-hidden flex flex-col">
							{post.featuredImage ? (
								<div className="aspect-video w-full overflow-hidden bg-muted">
									<div
										className="h-full w-full bg-muted"
										style={{
											backgroundImage: post.featuredImage ? `url(${post.featuredImage})` : undefined,
											backgroundSize: "cover",
											backgroundPosition: "center",
										}}
									/>
								</div>
							) : (
								<div className="aspect-video w-full flex items-center justify-center bg-muted/50">
									<FileText className="size-10 text-muted-foreground/50" />
								</div>
							)}
							<CardHeader className="flex-1">
								<CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
								<CardDescription className="flex flex-wrap items-center gap-3 text-xs">
									<span className="flex items-center gap-1">
										<Calendar className="size-3" />
										{post.date}
									</span>
									{post.readTime && (
										<span className="flex items-center gap-1">
											<Clock className="size-3" />
											{post.readTime}
										</span>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
									{post.excerpt}
								</p>
								<Button variant="ghost" size="sm" asChild>
									<a href={`/blogs/${post.slug}`}>Read more</a>
								</Button>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="mt-8 text-center">
					<Button variant="outline" asChild>
						<a href="/blogs">View all posts</a>
					</Button>
				</div>
			</div>
		</section>
	);
};

export default Blog;
