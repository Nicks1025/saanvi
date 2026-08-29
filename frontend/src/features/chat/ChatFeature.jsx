import React, { useState } from 'react';
import './chat.css';
import './messages.css';

import { useChatSocket } from './hooks/useChatSocket';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatRequestsModal from './components/ChatRequestsModal';

const ChatFeature = () => {
  const chatRealtime = useChatSocket();
  const [showRequests, setShowRequests] = useState(false);

  const isMobileChatOpen = !!chatRealtime.activeConversation;

  return (
    <div className={`chat-container page-container ${isMobileChatOpen ? 'mobile-chat-open' : ''}`} style={{ flex: 1, minHeight: 0, padding: 0 }}>
      <ChatSidebar 
        chatRealtime={chatRealtime} 
        onShowRequests={() => setShowRequests(true)} 
      />
      <ChatWindow 
        chatRealtime={chatRealtime} 
      />
      <ChatRequestsModal 
        isOpen={showRequests} 
        onClose={() => setShowRequests(false)} 
        chatRealtime={chatRealtime} 
      />
    </div>
  );
};

export default ChatFeature;
