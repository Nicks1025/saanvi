"use client";
import React, { useEffect, useState } from 'react';

/**
 * RedirectLoader
 * A full-screen animated progress bar loading page shown while
 * the user is being redirected (e.g. after login → dashboard).
 *
 * Props:
 *   message     {string}  Primary message displayed below the bar
 *   subMessage  {string}  Smaller secondary text
 *   duration    {number}  How long (ms) to animate to 85% — default 1800
 */
const RedirectLoader = ({
  message = 'Redirecting to dashboard…',
  subMessage = 'Securely loading your workspace.',
  duration = 1800,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const TARGET = 85;
    let raf;

    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min(TARGET, (elapsed / duration) * TARGET);
      setProgress(pct);
      if (pct < TARGET) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  return (
    <div style={styles.container}>
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <div style={styles.content}>
        <div style={styles.logoWrap}>
          <img src="/saanvi_logo.png" alt="Saanvi" style={styles.logo} />
        </div>

        {/* Progress bar */}
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${progress}%`,
              transition: 'width 0.1s linear',
            }}
          />
          <div style={styles.barShimmer} />
        </div>

        <p style={styles.message}>{message}</p>
        <p style={styles.subMessage}>{subMessage}</p>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes redirect-fadein {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .redirect-loader-content {
          animation: redirect-fadein 0.4s ease both;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1030 50%, #0f0f1a 100%)',
    zIndex: 99999,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '400px',
    background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '500px',
    height: '300px',
    background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.1rem',
    width: '100%',
    maxWidth: '360px',
    padding: '0 2rem',
    animation: 'redirect-fadein 0.4s ease both',
  },
  logoWrap: {
    width: '60px',
    height: '60px',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(124, 58, 237, 0.25)',
  },
  logo: {
    width: '38px',
    height: '38px',
    objectFit: 'contain',
  },
  barTrack: {
    position: 'relative',
    width: '100%',
    height: '5px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    inset: '0 auto 0 0',
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
    boxShadow: '0 0 14px rgba(124, 58, 237, 0.65)',
  },
  barShimmer: {
    position: 'absolute',
    inset: 0,
    width: '40%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
    animation: 'shimmer 1.4s ease-in-out infinite',
    borderRadius: '999px',
  },
  message: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: '-0.01em',
    textAlign: 'center',
  },
  subMessage: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
};

export default RedirectLoader;
