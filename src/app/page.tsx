import Home from "@/app/home/Home";
import About from "@/app/about/About";
import Experience from "@/app/experience/Experience";
import Education from "@/app/education/Education";
import Projects from "@/app/projects/Projects";
import Achievements from "@/app/achievements/Achievements";
import Contact from "@/app/contact/Contact";
import Blog from "@/app/blog/Blog";
import Gallery from "@/app/gallery/Gallery";
export default function App() {
  return (
    <>
      <Home />
      <About />
      <Projects />
      <Experience />
      <Education />
      <Blog />
      <Gallery />
      <Achievements />
      <Contact />
    </>
  );
}
