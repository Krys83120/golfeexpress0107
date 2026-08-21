import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { EconomicsComparison } from "@/components/EconomicsComparison";
import { HowItWorks } from "@/components/HowItWorks";
import { CommercantsCategories } from "@/components/CommercantsCategories";
import { AppDownload } from "@/components/AppDownload";
import { JoinUs } from "@/components/JoinUs";
import { Faq } from "@/components/Faq";
import { ProsCarousel } from "@/components/ProsCarousel";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <EconomicsComparison />
        <HowItWorks />
        <CommercantsCategories />
        <AppDownload />
        <JoinUs />
        <Faq />
      </main>
      {/* Carrousel des commerçants inscrits (logo + lien vers leur fiche
          pro), juste au-dessus du footer -- voir ProsCarousel.tsx. */}
      <ProsCarousel />
      <Footer />
    </>
  );
}
