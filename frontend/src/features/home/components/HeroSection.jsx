import React from 'react';
import Link from 'next/link';
import { 
  Gamepad2, 
  Calculator, 
  Users, 
  Mic, 
  Sparkles, 
  ArrowRight,
  Flame,
  ShieldCheck,
  Zap,
  TrendingUp,
  Volume2,
  Layers
} from 'lucide-react';

const HeroSection = () => {

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

  return (
    <section className="home-hero-section">
      {/* Ambient background glow accents */}
      <div className="hero-glow-blob hero-glow-1" aria-hidden="true" />
      <div className="hero-glow-blob hero-glow-2" aria-hidden="true" />
      <div className="hero-glow-blob hero-glow-3" aria-hidden="true" />

      <div className="home-hero-inner">
        {/* Left Column: Hero Copy & Actions */}
        <div className="hero-content-col">
          {/* Eyebrow badge */}
          <div className="hero-pill-badge">
            <span className="badge-pulse-dot" />
            <span className="badge-text">The Modern Multi-Experience Hub</span>
            <span className="badge-tag">Saanvi v2.0</span>
          </div>

          <h1 className="hero-headline">
            Play. Calculate. <br />
            <span className="text-gradient-purple">Discover Together.</span>
          </h1>

          <p className="hero-subtext">
            Experience real-time multiplayer games with live voice chat, run accurate 
            financial planning calculations with instant estimators, and discover smart 
            digital tools — all seamlessly combined under one modern platform.
          </p>

          <div className="hero-cta-group">
            <Link href="/games/uno" className="hero-btn-primary" id="hero-cta-play-uno">
              <Gamepad2 size={20} />
              <span>Play UNO Multiplayer</span>
              <ArrowRight size={18} />
            </Link>

            <button 
              type="button" 
              onClick={() => scrollToSection('finance-section')} 
              className="hero-btn-secondary"
              id="hero-cta-explore-finance"
            >
              <Calculator size={19} />
              <span>Explore Calculators</span>
            </button>
          </div>

          {/* Quick value props list */}
          <div className="hero-features-strip">
            <div className="hero-feat-item">
              <div className="feat-icon-bubble green">
                <Users size={16} />
              </div>
              <span>Up to 8 Players</span>
            </div>

            <div className="hero-feat-item">
              <div className="feat-icon-bubble purple">
                <Mic size={16} />
              </div>
              <span>Real-Time Voice Chat</span>
            </div>

            <div className="hero-feat-item">
              <div className="feat-icon-bubble blue">
                <ShieldCheck size={16} />
              </div>
              <span>Accurate Offline Math</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Visual Stage */}
        <div className="hero-visual-col" aria-label="Interactive visual showcase">
            <div className="uno-arena-preview-card">
              {/* Table Arena Header */}
              <div className="arena-header-row">
                <div className="arena-room-pill">
                  <span className="room-code-label">Room:</span>
                  <span className="room-code-val">SNV-489</span>
                </div>
                <div className="arena-audio-pill">
                  <Volume2 size={14} className="text-emerald" />
                  <span>Voice Connected</span>
                </div>
              </div>

              {/* Central Play Table Representation */}
              <div className="arena-table-surface">
                {/* Discard Pile with Cards */}
                <div className="arena-discard-zone">
                  {/* Under card (Red Skip) */}
                  <div className="arena-card card-under card-red">
                    <span className="corner">⊘</span>
                    <div className="oval">⊘</div>
                  </div>
                  {/* Top card (Wild Draw Four) */}
                  <div className="arena-card card-top card-wild-draw">
                    <span className="corner">+4</span>
                    <div className="oval wild">
                      <div className="q r" />
                      <div className="q b" />
                      <div className="q y" />
                      <div className="q g" />
                      <span className="center-num">+4</span>
                    </div>
                  </div>
                </div>

                {/* Draw Pile */}
                <div className="arena-draw-pile">
                  <div className="draw-card-back">
                    <span className="draw-logo">UNO</span>
                  </div>
                  <span className="draw-label">Draw Pile</span>
                </div>

                {/* Direction indicator */}
                <div className="arena-direction-ring" title="Turn Direction: Clockwise">
                  <div className="ring-arrow">↻</div>
                </div>
              </div>

              {/* Player hand mini preview */}
              <div className="arena-hand-preview">
                <div className="hand-label">
                  <span>Your Hand</span>
                  <span className="card-count-badge">5 Cards</span>
                </div>
                <div className="hand-cards-row">
                  <div className="mini-card card-red"><span className="mini-num">7</span></div>
                  <div className="mini-card card-blue"><span className="mini-num">3</span></div>
                  <div className="mini-card card-yellow"><span className="mini-num">⇄</span></div>
                  <div className="mini-card card-green"><span className="mini-num">⊘</span></div>
                  <div className="mini-card card-wild"><span className="mini-num">★</span></div>
                </div>
              </div>

              {/* Arena footer badges */}
              <div className="arena-card-footer">
                <div className="arena-spec-item">
                  <Layers size={14} />
                  <span>Standard 108 Card Deck</span>
                </div>
                <div className="arena-spec-item">
                  <Sparkles size={14} />
                  <span>Sound Effects & Haptics</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
