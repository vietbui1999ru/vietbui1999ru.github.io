import { describe, it, expect } from "vitest";
import {
  blogSchema,
  roleSchema,
  companySchema,
  projectSchema,
  educationSchema,
  gallerySchema,
  clippingSchema,
  aboutSchema,
} from "@/content/schemas";

describe("blogSchema", () => {
  it("accepts minimal valid frontmatter", () => {
    const parsed = blogSchema.parse({
      title: "x",
      description: "y",
      date: "2026-04-16",
    });
    expect(parsed.draft).toBe(false);
  });
  it("rejects missing title", () => {
    expect(() => blogSchema.parse({ description: "y", date: "2026-04-16" })).toThrow();
  });
  it("coerces date strings", () => {
    const parsed = blogSchema.parse({ title: "x", description: "y", date: "2026-04-16" });
    expect(parsed.date).toBeInstanceOf(Date);
  });
});

describe("roleSchema", () => {
  it("requires role, company, date_start, summary", () => {
    expect(() => roleSchema.parse({})).toThrow();
  });
  it("allows date_end null (current role)", () => {
    const parsed = roleSchema.parse({
      role: "r",
      company: "c",
      date_start: "2026-01-01",
      date_end: null,
      summary: "s",
    });
    expect(parsed.date_end).toBeNull();
  });
  it("defaults graph_node to true", () => {
    const parsed = roleSchema.parse({
      role: "r",
      company: "c",
      date_start: "2026-01-01",
      summary: "s",
    });
    expect(parsed.graph_node).toBe(true);
  });
});

describe("companySchema", () => {
  it("defaults graph_node to false (R2)", () => {
    const parsed = companySchema.parse({ name: "c" });
    expect(parsed.graph_node).toBe(false);
  });
});

describe("clippingSchema", () => {
  it("defaults publish + share to false", () => {
    const parsed = clippingSchema.parse({ title: "t" });
    expect(parsed.publish).toBe(false);
    expect(parsed.share).toBe(false);
    expect(parsed.graph_node).toBe(true);
  });
});

describe("projectSchema", () => {
  const base = {
    title: "My Project",
    summary: "Short description.",
    date: "2026-01-15",
  };

  it("accepts minimal valid frontmatter", () => {
    const parsed = projectSchema.parse(base);
    expect(parsed.featured).toBe(false);
    expect(parsed.draft).toBe(false);
    expect(parsed.status).toBe("shipped");
  });

  it("rejects missing title", () => {
    expect(() => projectSchema.parse({ ...base, title: undefined })).toThrow();
  });

  it("rejects missing summary", () => {
    expect(() => projectSchema.parse({ ...base, summary: undefined })).toThrow();
  });

  it("coerces date strings", () => {
    const parsed = projectSchema.parse(base);
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it("featured defaults to false", () => {
    expect(projectSchema.parse(base).featured).toBe(false);
  });

  it("draft defaults to false", () => {
    expect(projectSchema.parse(base).draft).toBe(false);
  });

  it("accepts full valid frontmatter", () => {
    const parsed = projectSchema.parse({
      ...base,
      featured: true,
      draft: false,
      status: "active",
      badges: ["React", "TypeScript"],
      cover: "hero.png",
      images: ["hero.png", "https://example.com/img.png"],
      links: [{ icon: "github", url: "https://github.com/foo/bar" }],
    });
    expect(parsed.featured).toBe(true);
    expect(parsed.badges).toHaveLength(2);
  });

  it("rejects invalid status", () => {
    expect(() => projectSchema.parse({ ...base, status: "unpublished" })).toThrow();
  });
});

describe("aboutSchema", () => {
  it("requires title + tagline", () => {
    expect(() => aboutSchema.parse({ title: "t" })).toThrow();
  });
});


describe("educationSchema", () => {
  it("requires institution, degree, date_start, summary", () => {
    expect(() => educationSchema.parse({ institution: "u" })).toThrow();
  });
  it("defaults graph_node to true", () => {
    const parsed = educationSchema.parse({
      institution: "u",
      degree: "d",
      date_start: "2020-09-01",
      summary: "s",
    });
    expect(parsed.graph_node).toBe(true);
  });
});

describe("gallerySchema", () => {
  it("requires title, date, image", () => {
    expect(() => gallerySchema.parse({ title: "t" })).toThrow();
  });
  it("defaults graph_node to true", () => {
    const parsed = gallerySchema.parse({
      title: "t",
      date: "2026-04-16",
      image: "/x.jpg",
      order: 1,
    });
    expect(parsed.graph_node).toBe(true);
  });
});
