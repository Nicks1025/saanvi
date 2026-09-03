import React, { useState, useEffect } from 'react';
import {  useRouter, usePathname  } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/AuthContext';
import { 
  Gamepad2, 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Menu, 
  X, 
  ArrowRight,
  Shield,
  Home
} from 'lucide-react';
import '../home.css';

const HomeNavbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useRouter();
  const pathname = usePathname();
  const location = { pathname, search: typeof window !== "undefined" ? window.location.search : "" };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isLoginPage = location.pathname === '/login';
  const isSignupPage = location.pathname === '/signup';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHomeClick = () => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate.push('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate.push(`/#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 60;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className={`home-nav-container ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="home-nav-inner">
        {/* Brand Logo */}
        <Link href="/" className="home-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="brand-logo-wrapper">
            <img src="/saanvi_logo.png" alt="Saanvi Logo" className="brand-logo-img" />
          </div>
          <span className="brand-title">
            Saanvi
            <span className="brand-dot">.</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="home-nav-links" aria-label="Main Navigation">
          <button 
            type="button" 
            onClick={handleHomeClick} 
            className={`nav-link-btn ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('games-section')} 
            className="nav-link-btn"
          >
            <Gamepad2 size={16} className="nav-icon" />
            Games
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('finance-section')} 
            className="nav-link-btn"
          >
            <Calculator size={16} className="nav-icon" />
            Finance
          </button>

          <button 
            type="button" 
            onClick={() => scrollToSection('why-section')} 
            className="nav-link-btn"
          >
            <Sparkles size={16} className="nav-icon" />
            Why Saanvi
          </button>
        </nav>

        {/* Desktop Auth Controls */}
        <div className="home-nav-auth">
          {isAuthenticated && user ? (
            <div className="nav-user-controls">
              <Link href="/dashboard" className="nav-user-badge" title="Go to Dashboard">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="nav-avatar" />
                ) : (
                  <div className="nav-avatar-fallback">
                    <User size={15} />
                  </div>
                )}
                <span className="nav-user-name">
                  {user.displayName || user.firstName || user.email?.split('@')[0] || 'User'}
                </span>
              </Link>
              
              <Link href="/dashboard" className="nav-action-btn btn-outline" title="Dashboard">
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              <button 
                type="button" 
                onClick={logout} 
                className="nav-action-btn btn-ghost" 
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="nav-guest-controls">
              {isLoginPage ? (
                <Link href="/signup" className="nav-action-btn btn-primary">
                  <span>Get Started</span>
                  <ArrowRight size={15} />
                </Link>
              ) : isSignupPage ? (
                <Link href="/login" className="nav-action-btn btn-primary">
                  <span>Sign In</span>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="nav-action-btn btn-ghost">
                    Sign In
                  </Link>
                  <Link href="/signup" className="nav-action-btn btn-primary">
                    <span>Get Started</span>
                    <ArrowRight size={15} />
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          type="button"
          className="home-nav-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="home-mobile-drawer">
          <div className="mobile-drawer-links">
            <button 
              type="button" 
              onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="mobile-drawer-item"
            >
              <Home size={18} />
              <span>Home</span>
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('games-section')}
              className="mobile-drawer-item"
            >
              <Gamepad2 size={18} />
              <span>Games & UNO</span>
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('finance-section')}
              className="mobile-drawer-item"
            >
              <Calculator size={18} />
              <span>Finance Tools</span>
            </button>

            <button 
              type="button" 
              onClick={() => scrollToSection('why-section')}
              className="mobile-drawer-item"
            >
              <Sparkles size={18} />
              <span>Why Saanvi</span>
            </button>
          </div>

          <div className="mobile-drawer-auth">
            {isAuthenticated && user ? (
              <div className="mobile-user-box">
                <div className="mobile-user-details">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Avatar" className="nav-avatar" />
                  ) : (
                    <div className="nav-avatar-fallback">
                      <User size={16} />
                    </div>
                  )}
                  <div>
                    <div className="mobile-user-name">
                      {user.displayName || user.firstName || user.email}
                    </div>
                    <div className="mobile-user-role">
                      {user.role || 'Member'}
                    </div>
                  </div>
                </div>

                <div className="mobile-user-actions">
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-btn btn-primary"
                  >
                    <LayoutDashboard size={18} />
                    <span>Open Dashboard</span>
                  </Link>
                  <button 
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="mobile-btn btn-outline"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-guest-actions">
                {isLoginPage ? (
                  <Link 
                    to="/signup" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="mobile-btn btn-primary"
                  >
                    <span>Create Account</span>
                    <ArrowRight size={18} />
                  </Link>
                ) : isSignupPage ? (
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="mobile-btn btn-primary"
                  >
                    <span>Sign In</span>
                  </Link>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="mobile-btn btn-outline"
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/signup" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="mobile-btn btn-primary"
                    >
                      <span>Create Account</span>
                      <ArrowRight size={18} />
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default HomeNavbar;
