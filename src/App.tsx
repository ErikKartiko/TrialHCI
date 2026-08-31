import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import LoopSection from "./components/LoopSection";
import LabsSection from "./components/lab/LabsSection";
import VisionSection from "./components/vision/VisionSection";
import FeedbackGallery from "./components/FeedbackGallery";
import Quiz from "./components/Quiz";
import Footer from "./components/Footer";
import { initLenis } from "./lib/scroll";

export default function App() {
  useEffect(() => {
    initLenis();
  }, []);

  return (
    <div className="noise relative min-h-svh bg-ink font-display text-paper">
      <Navbar />
      <main>
        <Hero />
        <LoopSection />
        <LabsSection />
        <VisionSection />
        <FeedbackGallery />
        <Quiz />
      </main>
      <Footer />
    </div>
  );
}
