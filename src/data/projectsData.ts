/**
 * Projects section content
 *
 * TODO: Update each project's links[].url to the correct repository.
 * Currently all projects point to the same placeholder URL.
 */

export type ProjectItem = {
  title: string;
  content: string;
  badges?: string[];
  links?: Array<{ icon: string; url: string }>;
};

export const PROJECTS_TITLE = "What I've been working on recently";

export const PROJECTS_ITEMS: ProjectItem[] = [
  {
    title: "Multi-VM Homelab with Monitoring",
    content:
      "I Architected multi-VM infrastructure managing 15+ devices with 99.5% uptime through automated health monitoring, Prometheus metrics, and systematic capacity planning. Deployed Grafana dashboards for real-time monitoring, reducing MTTR by 50% through automated alerting on system hardware and software anomalies.",
    badges: [
      "Proxmox",
      "Prometheus",
      "Grafana",
      "Terraform",
      "Ansible",
      "WireGuard",
      "Docker",
      "Nginx",
      "Bash",
    ],
    links: [
      {
        icon: "fab fa-github",
        url: "https://github.com/vietbui1999ru/codecrafters-shell-go",
      },
    ],
  },
  {
    title: "Software-Defined Ethernet Switch",
    content:
      "Engineered Layer 2 Ethernet switch in Go implementing IEEE 802.3 with zero-deadlock concurrent design, achieving 99%+ packet reliability through systematic edge case testing. Optimized packet forwarding via load testing and profiling, reducing broadcast traffic by 80% through intelligent MAC learning.",
    badges: ["Go", "IEEE 802.3", "L2 Networking", "Concurrency", "Performance Testing"],
    links: [
      {
        icon: "fab fa-github",
        url: "https://github.com/vietbui1999ru/codecrafters-shell-go",
      },
    ],
  },
  {
    title: "Scalable Spotify Web Application",
    content:
      "Architected RESTful API on AWS handling 1000+ daily requests with 99.5% uptime, reducing response time by 73% through database optimization and connection pooling. Deployed containerized application with Docker and CI/CD pipelines, implementing Nginx load balancing to support 50+ concurrent users.",
    badges: [
      "TypeScript",
      "Next.js",
      "Express",
      "React",
      "MongoDB",
      "Docker",
      "Nginx",
      "CI/CD",
    ],
    links: [
      {
        icon: "fab fa-github",
        url: "https://github.com/vietbui1999ru/codecrafters-shell-go",
      },
    ],
  },
  {
    title: "Go Shell with Automated Testing",
    content:
      "Developed Unix-like shell in Go emphasizing safety and performance, optimizing file I/O by 15% through profiling and implementing comprehensive unit tests. Automated continuous testing using GitHub Actions CI/CD with syntax linting and coverage reporting.",
    badges: ["Go", "Testing", "GitHub Actions", "YAML", "CI/CD"],
    links: [
      {
        icon: "fab fa-github",
        url: "https://github.com/vietbui1999ru/codecrafters-shell-go",
      },
    ],
  },
];
