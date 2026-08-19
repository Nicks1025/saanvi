import React from 'react';
import AppLayout from '../../components/layout/AppLayout';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import ChatFeature from '../../features/chat/ChatFeature';

const ChatPage = () => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ChatFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default ChatPage;
