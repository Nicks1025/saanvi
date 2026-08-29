import React from 'react';
import { useRouteError } from 'react-router-dom';

const GlobalErrorBoundary = () => {
  const error = useRouteError();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h1 style={styles.title}>Oops! Something went wrong.</h1>
        <p style={styles.message}>We've encountered an unexpected error while rendering this page.</p>
        
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>
              <strong>Error:</strong> {error.statusText || error.message}
            </p>
          </div>
        )}
        
        <button 
          onClick={() => window.location.href = '/'}
          style={styles.button}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '2rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2.5rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    backgroundColor: '#fef2f2',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 0.5rem',
  },
  message: {
    fontSize: '1rem',
    color: '#475569',
    margin: '0 0 1.5rem',
    lineHeight: '1.5',
  },
  errorBox: {
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '2rem',
    textAlign: 'left',
    overflowX: 'auto',
  },
  errorText: {
    margin: 0,
    color: '#334155',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
};

export default GlobalErrorBoundary;
