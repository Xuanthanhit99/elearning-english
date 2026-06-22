import FeaturedCoursesSection from "@/src/Components/HomePage/FeaturedCoursesSection";
import Footer from "@/src/Components/HomePage/Footer";
import { FreeFeaturesSection } from "@/src/Components/HomePage/FreeFeaturesSection";
import HomePage from "@/src/Components/HomePage/HomePage";
import { RoadmapSection } from "@/src/Components/HomePage/RoadmapSection";
import TestimonialsSection from "@/src/Components/HomePage/TestimonialsSection";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center border-[#f2dfc8] bg-[#fff4e8]">
      <HomePage />
      <FreeFeaturesSection />
      <RoadmapSection />
      <FeaturedCoursesSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
