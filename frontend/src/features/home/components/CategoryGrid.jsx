import React from 'react';
import Link from 'next/link';
import { 
  Gamepad2, 
  Calculator, 
  TrendingUp, 
  Brain, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Clock
} from 'lucide-react';

const CategoryGrid = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const categories = [
    {
      id: 'cat-games',
      title: 'Multiplayer Games',
      subtitle: 'Play solo or with friends',
      description: 'Hop into custom game rooms with real-time Socket.IO sync, audio voice chat, and card animations.',
      icon: Gamepad2,
      accentColor: 'purple',
      badge: 'Live Now',
      badgeType: 'active',
      primaryAction: {
        label: 'Play Games',
        to: '/games/uno'
      },
      secondaryLink: {
        label: 'Explore Games',
        action: () => scrollToSection('games-section')
      },
      tags: ['UNO Tabletop', 'Word Search', 'Voice Chat']
    },
    {
      id: 'cat-finance',
      title: 'Finance & Calculators',
      subtitle: 'Explore smarter financial tools',
      description: 'Interactive estimators for Loan EMI, SIP investments, Lump Sum returns, Fixed Deposits, and Recurring Deposits.',
      icon: Calculator,
      accentColor: 'blue',
      badge: 'Interactive Tools',
      badgeType: 'interactive',
      primaryAction: {
        label: 'Calculate Now',
        action: () => scrollToSection('finance-section')
      },
      tags: ['Loan EMI', 'SIP Growth', 'FD / RD Returns']
    },
    {
      id: 'cat-ipo',
      title: 'IPO & Market Hub',
      subtitle: 'Track IPOs and check information',
      description: 'Discover upcoming IPO schedules, allotment verification gateways, issue price bands, and registrar links.',
      icon: TrendingUp,
      accentColor: 'emerald',
      badge: 'Hub Preview',
      badgeType: 'preview',
      primaryAction: {
        label: 'Explore IPO Hub',
        action: () => scrollToSection('ipo-section')
      },
      tags: ['Issue Tracker', 'Allotment Gateway', 'GMP Guide']
    },
    {
      id: 'cat-learn',
      title: 'Brain & Word Puzzles',
      subtitle: 'Fun challenges & vocabulary',
      description: 'Timed word puzzles, customizable grid sizes, and themed vocabulary packs to keep your mind sharp.',
      icon: Brain,
      accentColor: 'amber',
      badge: 'Live Now',
      badgeType: 'active',
      primaryAction: {
        label: 'Play Word Search',
        to: '/games/word-search'
      },
      tags: ['Word Grid', 'Timed Rounds', 'Custom Themes']
    }
  ];

  return (
    <section className="home-section category-section" id="categories-section">
      <div className="section-header-block text-center">
        <div className="section-pill-tag">
          <Sparkles size={14} />
          <span>Ecosystem Overview</span>
        </div>
        <h2 className="section-main-heading">
          Explore the Saanvi Universe
        </h2>
        <p className="section-sub-heading">
          Select an area to jump straight into play, calculation, or discovery.
        </p>
      </div>

      <div className="category-cards-grid">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div 
              key={cat.id} 
              id={cat.id}
              className={`category-card theme-${cat.accentColor}`}
            >
              <div className="cat-card-top">
                <div className="cat-icon-frame">
                  <Icon size={24} />
                </div>
                <div className={`cat-status-badge badge-${cat.badgeType}`}>
                  {cat.badgeType === 'active' && <CheckCircle2 size={12} />}
                  {cat.badgeType === 'interactive' && <Sparkles size={12} />}
                  {cat.badgeType === 'preview' && <Clock size={12} />}
                  <span>{cat.badge}</span>
                </div>
              </div>

              <div className="cat-card-body">
                <h3 className="cat-card-title">{cat.title}</h3>
                <div className="cat-card-subtitle">{cat.subtitle}</div>
                <p className="cat-card-desc">{cat.description}</p>
              </div>

              <div className="cat-tags-row">
                {cat.tags.map((tag) => (
                  <span key={tag} className="cat-tag-pill">{tag}</span>
                ))}
              </div>

              <div className="cat-card-footer">
                {cat.primaryAction.to ? (
                  <Link href={cat.primaryAction.to} className="cat-action-btn">
                    <span>{cat.primaryAction.label}</span>
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button 
                    type="button" 
                    onClick={cat.primaryAction.action}
                    className="cat-action-btn"
                  >
                    <span>{cat.primaryAction.label}</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
