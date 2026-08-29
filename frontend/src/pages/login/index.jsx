import React, { useEffect } from 'react';
import HomeNavbar from '../../features/home/components/HomeNavbar';
import LoginFeature from '../../features/login/LoginFeature';

/**
 * Route: /login
 */
const LoginPage = () => {
  useEffect(() => {
    document.title = "Sign In — Saanvi";
  }, []);

  return (
    <div className="saanvi-public-page login-page-wrapper">
      <HomeNavbar />
      <div className="login-page-container">
        <LoginFeature />
      </div>
    </div>
  );
};

export default LoginPage;
