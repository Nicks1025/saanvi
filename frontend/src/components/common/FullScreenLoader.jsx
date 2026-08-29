import React from 'react';
import { Loader2 } from 'lucide-react';

const FullScreenLoader = ({ message = "Initializing your workspace..." }) => {
  return (
    <div style={styles.container}>
      <div style={styles.overlay} />
      <div style={styles.content}>
        <div style={styles.logoWrapper}>
          <img src="/saanvi_logo.png" alt="Saanvi Logo" style={styles.logo} />
        </div>
        <Loader2 size={36} color="#4f46e5" style={styles.spinner} className="animate-spin" />
        <h3 style={styles.message}>{message}</h3>
        <p style={styles.subMessage}>Securely connecting your profile and variables.</p>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    zIndex: 99999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.05) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(37, 99, 235, 0.05) 0px, transparent 50%),
      linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)
    `,
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  logoWrapper: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  spinner: {
    marginBottom: '0.5rem',
  },
  message: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subMessage: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0,
  }
};

export default FullScreenLoader;
