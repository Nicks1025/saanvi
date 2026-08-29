import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Gamepad2, 
  Users, 
  Mic, 
  Zap, 
  Flame, 
  ShieldCheck, 
  ArrowRight, 
  Layers,
  Sparkles,
  Volume2
} from 'lucide-react';

const FeaturedUnoSection = () => {
  return (
    <section className="home-section featured-uno-section" id="featured-uno">
      <div className="featured-uno-container">
        {/* Background glow & mesh */}
        <div className="uno-bg-glow" aria-hidden="true" />

        <div className="featured-uno-grid">
          {/* Left Column: Game highlights & Play Action */}
          <div className="uno-info-col">
            <div className="uno-eyebrow">
              <span className="uno-dot" />
              <span>Flagship Multiplayer Game</span>
            </div>

            <h2 className="uno-heading">
              Saanvi Cards: <br />
              <span className="text-gradient-uno">Multiplayer UNO</span>
            </h2>

            <p className="uno-lead-text">
              Enter the ultimate digital card arena. Create private rooms, invite friends 
              with short room codes, strategize over integrated voice chat, and battle 
              with up to 8 players in real time.
            </p>

            {/* Core Feature Matrix */}
            <div className="uno-feature-list">
              <div className="uno-feature-row">
                <div className="uno-feat-icon bg-purple-tint">
                  <Users size={18} />
                </div>
                <div className="uno-feat-text">
                  <strong>2 to 8 Player Custom Rooms</strong>
                  <span>Create or join public lobbies or private password-protected rooms.</span>
                </div>
              </div>

              <div className="uno-feature-row">
                <div className="uno-feat-icon bg-red-tint">
                  <Mic size={18} />
                </div>
                <div className="uno-feat-text">
                  <strong>Integrated Voice Chat</strong>
                  <span>Talk with your opponents in real-time with WebRTC spatial audio.</span>
                </div>
              </div>

              <div className="uno-feature-row">
                <div className="uno-feat-icon bg-yellow-tint">
                  <Flame size={18} />
                </div>
                <div className="uno-feat-text">
                  <strong>Stackable Action Cards</strong>
                  <span>Defend yourself against Draw +2 and Wild +4 attacks by stacking cards.</span>
                </div>
              </div>

              <div className="uno-feature-row">
                <div className="uno-feat-icon bg-green-tint">
                  <Zap size={18} />
                </div>
                <div className="uno-feat-text">
                  <strong>Lightning Fast Socket.IO Engine</strong>
                  <span>Smooth card flight trajectories, turn timers, and instant sync.</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="uno-action-buttons">
              <Link to="/games/uno" className="uno-play-btn" id="featured-uno-play-btn">
                <Gamepad2 size={22} />
                <span>Play UNO Now</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Right Column: Visual UNO Interactive Table Showcase */}
          <div className="uno-showcase-col">
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
      </div>
    </section>
  );
};

export default FeaturedUnoSection;
