import React from 'react';
import AppHeader from '../../components/layout/AppHeader';
import SignupFeature from '../../features/signup/SignupFeature';
import '../../features/signup/signup.css';

/**
 * Route: /signup
 * Auth layout: header (no sidebar toggle / user info) + signup form.
 */
const SignupPage = () => {
  return (
    <div className="auth-page-layout">
      <AppHeader />
      <SignupFeature />
    </div>
  );
};

export default SignupPage;
