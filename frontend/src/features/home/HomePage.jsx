import React, { useEffect } from 'react';
import HomeNavbar from './components/HomeNavbar';
import HeroSection from './components/HeroSection';
import CategoryGrid from './components/CategoryGrid';
import MoreGamesSection from './components/MoreGamesSection';
import FinanceSection from './components/FinanceSection';
import WhySaanviSection from './components/WhySaanviSection';
import HomeFooter from './components/HomeFooter';
import { ArrowPuzzleGame } from '@/features/games/puzzles/arrow-puzzle/ArrowPuzzleGame';
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

        {/* Quick Play Daily Puzzle */}
        <section className="home-section" style={{ padding: '1rem 5% 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div className="section-header-block text-center" style={{ marginBottom: 0 }}>
            <h2 className="section-main-heading" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Quick Play</h2>
            <p className="section-sub-heading" style={{ marginBottom: 0 }}>Jump right into our daily mini-games. No menus, no waiting.</p>
          </div>
          <div style={{ width: '100%', maxWidth: '450px', height: '480px', display: 'flex' }}>
            <ArrowPuzzleGame initialShape="Square" initialLevel={1} liteMode={true} />
          </div>
        </section>

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
