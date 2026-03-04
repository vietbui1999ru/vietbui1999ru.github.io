/**
 * Education section content
 */

export type EducationItem = {
  title: string;
  school: { name: string; url: string };
  date: string;
  /** Optional legacy single-column content string */
  content?: string;
  /**
   * Preferred: two-column bullet layout for the education card.
   * Each inner array represents one column.
   */
  columns?: string[][];
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
    columns: [
      [
        "Systems Programming",
        "Safety & Security",
        "Artificial Intelligence",
        "Database Design",
        "Software Development",
      ],
      [
        "Automata Theory",
        "Algorithm Design & Analysis",
        "Operating Systems",
        "Formal Verification Methods",
        "Funded Research and Thesis",
      ],
    ],
  },
  {
    title:
      "Bachelor of Science in Computer Science & Applied Mathematics (Dual Degree)",
    school: { name: "Augustana College", url: "https://augustana.edu" },
    date: "2019 - 2023",
    columns: [
      [
        "Linear Algebra",
        "Calculus I–III",
        "Discrete Mathematics",
        "Advanced Statistics",
        "Numerical Analysis",
        "Partial Differential Equations",
        "Mathematical Modelling",
        "Differential Equations",
        "Funded Independent Research (Beling Scholar)",
      ],
      [
        "Machine Learning",
        "Artificial Intelligence",
        "Advanced Algorithms & Data Structures",
        "Software Development",
        "Computer Systems",
        "Web Programming",
        "Competitive Programming (4/100 in Illinois Regional ACM-ICPC)",
        "MAA, CS & Math Honor Societies, GDSC Event Chair",
      ],
    ],
  },
];
