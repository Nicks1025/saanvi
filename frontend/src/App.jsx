import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/login';
import SignupPage from './pages/signup';

import { AuthProvider } from './store/AuthContext';
import { ChatProvider } from './store/ChatProvider';
import { ThemeProvider } from './store/ThemeContext';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import DashboardPage from './pages/dashboard';
import SettingsPage from './pages/settings';
import WordSearchPage from './pages/games/words/word-search';
import WordSearchPlayPage from './pages/games/words/word-search/play';
import NotFoundPage from './pages/not-found';
import UsersPage from './pages/admin/users';
import UserDetailsPage from './pages/admin/users/details';
import RolesPage from './pages/admin/roles';
import RoleDetailsPage from './pages/admin/roles/details';
import SystemHealthPage from './pages/admin/health';
import ChatPage from './pages/chat';

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
      { path: "signup", element: <SignupPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "admin/users", element: <UsersPage /> },
      { path: "admin/users/:uuid", element: <UserDetailsPage /> },
      { path: "admin/roles", element: <RolesPage /> },
      { path: "admin/roles/:uuid", element: <RoleDetailsPage /> },
      { path: "admin/health", element: <SystemHealthPage /> },
      { path: "games/word-search", element: <WordSearchPage /> },
      { path: "games/word-search/play", element: <WordSearchPlayPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
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
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
