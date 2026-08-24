import ContactSection from "@/components/landingPage/ContactSection";
import HeroSection from "@/components/landingPage/HeroSection";
import MenuSection from "@/components/landingPage/MenuItems";
import RestaurantsList from "@/components/landingPage/ResturantsList";
// import Image from "next/image";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <RestaurantsList />
      <MenuSection />
      <ContactSection />
    </div>
  );
}
