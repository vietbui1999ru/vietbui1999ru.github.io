/**
 * Experience section content
 */

export type ExperienceJob = {
  name: string;
  date: string;
  content: string;
  info?: { content: string };
  featuredItems?: {
    fontAwesomeIcons?: Array<{
      icon: string;
      url?: string;
      tooltip?: string;
    }>;
  };
};

export type ExperienceCompany = {
  company: string;
  companyUrl: string;
  jobs: ExperienceJob[];
};

export const EXPERIENCE_ITEMS: ExperienceCompany[] = [
  {
    company: "Carboncopies",
    companyUrl: "https://carboncopies.org",
    jobs: [
      {
        name: "Complex Systems Research Engineer",
        date: "July 2025 - present",
        content:
          "I am currently working as a Research Engineer at Carboncopies Remote, USA. Currently working on a project that will be used to emulate single biophysical brain neuron and networks of neurons using BrainGenix.",
        info: { content: "Working as a Research Engineer" },
        featuredItems: {
          fontAwesomeIcons: [
            {
              icon: "fa-brands fa-python",
              url: "https://python.org/",
              tooltip: "Engine built with Python",
            },
            { icon: "fa-brands fa-gitlab", url: "https://gitlab.com/", tooltip: "GitLab" },
          ],
        },
      },
    ],
  },
  {
    company: "University of Dayton",
    companyUrl: "https://udayton.edu",
    jobs: [
      {
        name: "Research Assistant & Teaching Assistant",
        date: "Aug 2023 - Aug 2025",
        content:
          "I studied and was funded as a Research Assistant for The Department of Computer Science's Reliable Autonomous Lab in developing Formal Verification Frameworks in Rocq Proof Assistant for verifying simulated theoretical Softwares and Networking. I was a co-author in a Research Paper published to KSE2024 focused on reducing model bias with Reinforcement Learning with white-noise injections. I also helped undergraduate students as a Lab Assistant for Intro to Computer Science, and I was a Project Mentor for an infrastructure collision detection research project using Jetson Nano with CUDA and Python.",
        info: { content: "Worked as a Research Assistant" },
        featuredItems: {
          fontAwesomeIcons: [
            { icon: "fa-brands fa-python", url: "https://python.org/", tooltip: "Python" },
            { icon: "fa-brands fa-github", url: "https://github.com/", tooltip: "GitHub" },
            { icon: "fa-solid fa-microchip", url: "https://nvidia.com/", tooltip: "NVIDIA" },
          ],
        },
      },
    ],
  },
  {
    company: "Augustana College",
    companyUrl: "https://augustana.edu",
    jobs: [
      {
        name: "Research Assistant & Peer Tutor",
        date: "Aug 2020 - May 2023",
        content:
          "I participated in the college's funded Independent Research (Beling Scholar) during the Summer and presented my research at Illinois Mathematics Association of America (MAA) on the topic of deriving and calculating the elliptic integral of a non-linear system of a swinging pendulum. I worked part-time as a Peer Tutor for the department of Computer Science & Mathematics to provide 1-on-1 study sessions for students in Data Structures & Algorithms, Intro to Statistics, Math Modelling, Differential Equations, Discrete Math, & Calculus 1-3, and was a drop-in tutor for Computer Science & Mathematics for over 300+ students over the 3 year period.",
        info: {
          content:
            "Worked, Researched, and Tutored students during my Bachelors.",
        },
        featuredItems: {
          fontAwesomeIcons: [
            { icon: "fa-solid fa-flask", tooltip: "Research" },
            { icon: "fa-solid fa-book", tooltip: "Tutoring" },
            { icon: "fa-solid fa-people-group", tooltip: "Students" },
            { icon: "fa-solid fa-person-chalkboard", tooltip: "Presentation" },
          ],
        },
      },
    ],
  },
];
