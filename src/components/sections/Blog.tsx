"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: Date;
  draft?: boolean;
};

type BlogProps = {
  posts: BlogPost[];
};

const BLOG_SECTION_TITLE = "Blog";
const BLOG_SECTION_SUBTITLE = "Recent posts and writing.";

const Blog = ({ posts }: BlogProps) => {
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <section id="blog" className="relative min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          title={BLOG_SECTION_TITLE}
          subtitle={BLOG_SECTION_SUBTITLE}
          className="mb-12"
        />

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Card key={post.slug} className="overflow-hidden flex flex-col">
                <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                  <FileText className="size-10 text-muted-foreground/50" />
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(post.date)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {post.description}
                  </p>
                  <a
                    href={`/blog/${post.slug}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "inline-flex"
                    )}
                  >
                    Read more
                  </a>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="overflow-hidden flex flex-col col-span-full">
              <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                <FileText className="size-10 text-muted-foreground/50" />
              </div>
              <CardHeader className="flex-1">
                <CardTitle className="text-lg">Coming soon</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Jan 2, 2006
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    1 min read
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  Blog posts will appear here. Parse from YAML or CMS later.
                </p>
                <a
                  href="/blog/coming-soon"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "inline-flex"
                  )}
                >
                  Read more
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/blog"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            View all posts
          </a>
        </div>
      </div>
    </section>
  );
};

export default Blog;
