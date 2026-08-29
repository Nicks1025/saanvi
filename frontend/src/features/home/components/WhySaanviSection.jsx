import React from 'react';
import { 
  Sparkles, 
  Gamepad2, 
  ShieldCheck, 
  Zap, 
  Users, 
  Layers,
  Smartphone,
  Lock
} from 'lucide-react';

const WhySaanviSection = () => {
  const pillars = [
    {
      id: 'pillar-all-in-one',
      title: 'Unified Multi-Experience',
      desc: 'No need for fragmented apps. Switch seamlessly from intense multiplayer card battles to precision financial calculators in seconds.',
      icon: Layers,
      accent: 'purple'
    },
    {
      id: 'pillar-realtime',
      title: 'Real-Time Low Latency',
      desc: 'Built on a high-speed Socket.IO and WebRTC backbone providing sub-second card turn synchronizations and spatial voice communication.',
      icon: Zap,
      accent: 'blue'
    },
    {
      id: 'pillar-math',
      title: '100% Transparent Math',
      desc: 'Our financial estimators use standard financial compounding and amortization formulas without misleading ads or hidden assumptions.',
      icon: ShieldCheck,
      accent: 'emerald'
    },
    {
      id: 'pillar-multiplayer',
      title: 'Built for Friends & Family',
      desc: 'Create custom rooms with shareable codes. Jump in from any desktop, tablet, or phone without installing heavy software packages.',
      icon: Users,
      accent: 'amber'
    },
    {
      id: 'pillar-privacy',
      title: 'Private & Secure by Design',
      desc: 'Encrypted user credentials, role-based access control (RBAC), and zero unsolicited tracking of your financial inputs.',
      icon: Lock,
      accent: 'rose'
    },
    {
      id: 'pillar-responsive',
      title: 'Fluid Across All Screens',
      desc: 'Tailored touch-friendly controls for mobile devices and expansive multi-column dashboard layouts on desktop displays.',
      icon: Smartphone,
      accent: 'indigo'
    }
  ];

  return (
    <section className="home-section why-saanvi-section" id="why-section">
      <div className="section-header-block text-center">
        <div className="section-pill-tag">
          <Sparkles size={14} />
          <span>Platform Values</span>
        </div>
        <h2 className="section-main-heading">
          Why People Choose Saanvi
        </h2>
        <p className="section-sub-heading">
          Engineered from the ground up to combine social connection, entertainment, and everyday financial utility.
        </p>
      </div>

      <div className="why-cards-grid">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div key={pillar.id} className={`why-card theme-${pillar.accent}`}>
              <div className="why-icon-bubble">
                <Icon size={22} />
              </div>
              <h3 className="why-card-title">{pillar.title}</h3>
              <p className="why-card-desc">{pillar.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WhySaanviSection;
