import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import SignupPage from './pages/signup';

import { AuthProvider, useAuth } from './store/AuthContext';
import FullScreenLoader from './components/common/FullScreenLoader';
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';
import { ChatProvider } from './store/ChatProvider';
import { ThemeProvider } from './store/ThemeContext';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import DashboardPage from './pages/dashboard';
import SettingsPage from './pages/settings';
import WordSearchPage from './pages/games/words/word-search';
import WordSearchPlayPage from './pages/games/words/word-search/play';
import UnoGamePage from './pages/games/cards';
import NotFoundPage from './pages/not-found';
import UsersPage from './pages/admin/users';
import UserDetailsPage from './pages/admin/users/details';
import AddUserPage from './pages/admin/users/add';
import RolesPage from './pages/admin/roles';
import RoleDetailsPage from './pages/admin/roles/details';
import SystemHealthPage from './pages/admin/health';
import SqlEditorPage from './pages/admin/sql-editor';
import EmailTemplatesPage from './pages/admin/email-templates';
import CreateEmailTemplatePage from './pages/admin/email-templates/create';
import ViewEmailTemplatePage from './pages/admin/email-templates/view';
import EditEmailTemplatePage from './pages/admin/email-templates/edit';
import DynamicVariablesPage from './pages/admin/dynamic-variables';
import WorkflowsPage from './pages/admin/workflows';
import WorkflowCreatePage from './pages/admin/workflows/create';
import WorkflowEditPage from './pages/admin/workflows/edit';
import WorkflowViewPage from './pages/admin/workflows/view';
import SystemEventsPage from './pages/admin/system-events';

import ChatPage from './pages/chat';

const AppRoot = () => {
  const { isSessionInitializing } = useAuth();
  
  if (isSessionInitializing) {
    return <FullScreenLoader />;
  }
  
  return (
    <div className="app-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Outlet />
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppRoot />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "admin/users", element: <UsersPage /> },
      { path: "admin/users/add", element: <AddUserPage /> },
      { path: "admin/users/:uuid", element: <UserDetailsPage /> },
      { path: "admin/roles", element: <RolesPage /> },
      { path: "admin/roles/:uuid", element: <RoleDetailsPage /> },
      { path: "admin/health", element: <SystemHealthPage /> },
      { path: "admin/sql-editor", element: <SqlEditorPage /> },
      { path: "admin/email-templates", element: <EmailTemplatesPage /> },
      { path: "admin/email-templates/create", element: <CreateEmailTemplatePage /> },
      { path: "admin/email-templates/:uuid/view", element: <ViewEmailTemplatePage /> },
      { path: "admin/email-templates/:uuid/edit", element: <EditEmailTemplatePage /> },
      { path: "admin/dynamic-variables", element: <DynamicVariablesPage /> },
      { path: "admin/workflows", element: <WorkflowsPage /> },
      { path: "admin/workflow/create", element: <WorkflowCreatePage /> },
      { path: "admin/workflow/:id/edit", element: <WorkflowEditPage /> },
      { path: "admin/workflow/:id/view", element: <WorkflowViewPage /> },
      { path: "admin/system-events", element: <SystemEventsPage /> },

      { path: "games/word-search", element: <WordSearchPage /> },
      { path: "games/word-search/play", element: <WordSearchPlayPage /> },
      { path: "games/uno", element: <UnoGamePage /> },
      { path: "games/uno/:roomId", element: <UnoGamePage /> },
      { path: "games/uno/:roomId/winner", element: <UnoGamePage /> },
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
