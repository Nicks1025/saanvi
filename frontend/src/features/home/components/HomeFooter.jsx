import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../store/AuthContext';
import { 
  Gamepad2, 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  ArrowUp,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Brain
} from 'lucide-react';

const HomeFooter = () => {
  const { isAuthenticated, user } = useAuth();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
    <footer className="home-footer-container">
      <div className="home-footer-inner">
        {/* Top CTA Banner */}
        <div className="footer-callout-card">
          <div className="callout-left">
            <h3 className="callout-title">Ready to Jump Into the Action?</h3>
            <p className="callout-sub">
              Create a multiplayer UNO room with friends or run your financial calculations right now.
            </p>
          </div>
          <div className="callout-right">
            <Link to="/games/uno" className="callout-btn-primary">
              <Gamepad2 size={20} />
              <span>Launch UNO Room</span>
            </Link>
            {!isAuthenticated && (
              <Link to="/signup" className="callout-btn-secondary">
                <span>Create Free Account</span>
              </Link>
            )}
          </div>
        </div>

        {/* Main Footer Links Grid */}
        <div className="footer-main-columns">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img src="/saanvi_logo.png" alt="Saanvi" className="footer-logo-img" />
              <span className="footer-brand-text">Saanvi.</span>
            </div>
            <p className="footer-brand-desc">
              A modern all-in-one digital platform combining real-time multiplayer tabletop games, 
              approachable financial estimators, and discovery tools.
            </p>
            <div className="footer-system-status">
              <span className="status-indicator-dot" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Column 1: Games */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">
              <Gamepad2 size={16} />
              <span>Games & Play</span>
            </h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/games/uno" className="footer-link">
                  Multiplayer UNO (Cards)
                </Link>
              </li>
              <li>
                <Link to="/games/word-search" className="footer-link">
                  Word Search Puzzles
                </Link>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToSection('games-section')}
                  className="footer-link-btn"
                >
                  Game Studio Pipeline
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Finance & IPO */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">
              <Calculator size={16} />
              <span>Calculators & IPO</span>
            </h4>
            <ul className="footer-links-list">
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToSection('finance-section')}
                  className="footer-link-btn"
                >
                  SIP Wealth Estimator
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToSection('finance-section')}
                  className="footer-link-btn"
                >
                  Loan EMI Calculator
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToSection('finance-section')}
                  className="footer-link-btn"
                >
                  FD & RD Planners
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToSection('ipo-section')}
                  className="footer-link-btn"
                >
                  IPO Allotment Gateways
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Account & Platform */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">
              <ShieldCheck size={16} />
              <span>Account & Hub</span>
            </h4>
            <ul className="footer-links-list">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/dashboard" className="footer-link">
                      User Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/settings" className="footer-link">
                      Profile Settings
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="footer-link">
                      Account Sign In
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="footer-link">
                      Register Account
                    </Link>
                  </li>
                </>
              )}
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToSection('why-section')}
                  className="footer-link-btn"
                >
                  Why Choose Saanvi
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Back to Top */}
        <div className="footer-bottom-bar">
          <div className="footer-copy-text">
            &copy; {new Date().getFullYear()} Saanvi Platform. All rights reserved.
          </div>
          <button 
            type="button" 
            onClick={scrollToTop} 
            className="footer-back-to-top"
            aria-label="Back to top"
          >
            <span>Back to top</span>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
