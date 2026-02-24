/**
 * Education section content
 */

export type EducationItem = {
  title: string;
  school: { name: string; url: string };
  date: string;
  content: string;
  GPA?: string;
  featuredLink?: { enable?: boolean; name?: string; url: string };
};

export const EDUCATION_ITEMS: EducationItem[] = [
  {
    title: "Master of Computer Science",
    school: {
      name: "University of Dayton, Dayton, OH",
      url: "https://udayton.edu",
    },
    date: "2023 - 2025",
    content: `I developed a novel Research Framework on Formal Verification using Rocq Proof Assistant for Softwares and Systems.
I Published a paper in Reinforcement Learning and reducing model bias even with impostor data injections.
Extracurricular Activities: GDSC, ACM.`,
  },
  {
    title: "Bachelor of Science in Computer Science & Applied Mathematics (Dual Degree)",
    school: { name: "Augustana College", url: "https://augustana.edu" },
    date: "2019 - 2023",
    content: `I actively participated in Applied Mathematics Conferences.
Part of Computer Science & Mathematics Honor Societies.
GDSC Event Chair.`,
  },
];
