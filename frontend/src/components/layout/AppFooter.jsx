import React from 'react';
import './layout.css';

const AppFooter = () => {
  return (
    <footer className="app-footer">
      &copy; {new Date().getFullYear()} Saanvi. All rights reserved.
    </footer>
  );
};

export default AppFooter;
