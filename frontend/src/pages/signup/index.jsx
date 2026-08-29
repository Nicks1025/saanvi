import React, { useEffect } from 'react';
import HomeNavbar from '../../features/home/components/HomeNavbar';
import SignupFeature from '../../features/signup/SignupFeature';
import '../../features/signup/signup.css';

/**
 * Route: /signup
 * Auth layout: public header + signup form.
 */
const SignupPage = () => {
  useEffect(() => {
    document.title = "Create Account — Saanvi";
  }, []);

  return (
    <div className="saanvi-public-page auth-page-layout">
      <HomeNavbar />
      <div className="signup-content-wrapper">
        <SignupFeature />
      </div>
    </div>
  );
};

export default SignupPage;
