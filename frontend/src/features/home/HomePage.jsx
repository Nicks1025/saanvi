import React, { useEffect } from 'react';
import HomeNavbar from './components/HomeNavbar';
import HeroSection from './components/HeroSection';
import CategoryGrid from './components/CategoryGrid';
import MoreGamesSection from './components/MoreGamesSection';
import FinanceSection from './components/FinanceSection';
import WhySaanviSection from './components/WhySaanviSection';
import HomeFooter from './components/HomeFooter';
import './home.css';

const HomePage = () => {
  useEffect(() => {
    // Ensure title is clear
    document.title = "Saanvi — Play, Explore & Grow";

    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          const navOffset = 80;
          const pos = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
          window.scrollTo({ top: pos, behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="saanvi-home-wrapper" id="saanvi-home-root">
      {/* Top sticky navigation */}
      <HomeNavbar />

      {/* Main Content Sections */}
      <main className="saanvi-home-main">
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Platform Category Overview */}
        <CategoryGrid />


        {/* 4. Complete Games Catalog (Available Now & Pipeline) */}
        <MoreGamesSection />

        {/* 5. Interactive Finance Suite & Calculators */}
        <FinanceSection />

        {/* 6. Why Saanvi Pillars */}
        <WhySaanviSection />
      </main>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
};

export default HomePage;
