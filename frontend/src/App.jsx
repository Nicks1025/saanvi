import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/login';

import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import DashboardPage from './pages/dashboard';
import SettingsPage from './pages/settings';
import WordSearchPage from './pages/games/words/word-search';
import WordSearchPlayPage from './pages/games/words/word-search/play';
import NotFoundPage from './pages/not-found';

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div className="app-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Outlet />
      </div>
    ),
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "games/word-search", element: <WordSearchPage /> },
      { path: "games/word-search/play", element: <WordSearchPlayPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right">
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div 
                  onClick={() => toast.dismiss(t.id)} 
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' }}
                >
                  {icon}
                  {message}
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
