import DepartmentsPanel from "./sections/DepartmentsPanel";
import FeaturedServicesSection from "./sections/FeaturedServicesSection";
import FeaturedShopsSection from "./sections/FeaturedShopsSection";
import HeroSection from "./sections/HeroSection";
import { useHomeData } from "./useHomeData";

export default function Home() {
  const {
    departments,
    isLoadingDepartments,
    departmentsError,
    featuredShops,
    isLoadingShops,
    shopsError,
    featuredServices,
    isLoadingServices,
    servicesError
  } = useHomeData();

  return (
    <section className="ogani-home">
      <div className="hero-layout">
        <DepartmentsPanel
          departments={departments}
          isLoadingDepartments={isLoadingDepartments}
          departmentsError={departmentsError}
        />
        <HeroSection />
      </div>

      <FeaturedShopsSection
        featuredShops={featuredShops}
        isLoadingShops={isLoadingShops}
        shopsError={shopsError}
      />

      <FeaturedServicesSection
        featuredServices={featuredServices}
        isLoadingServices={isLoadingServices}
        servicesError={servicesError}
      />
    </section>
  );
}
