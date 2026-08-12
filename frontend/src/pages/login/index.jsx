import React from 'react';
import LoginFeature from '../../features/login/LoginFeature';

/**
 * Route: /login
 */
const LoginPage = () => {
  return (
    <div className="login-page-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
      <LoginFeature />
    </div>
  );
};

export default LoginPage;
