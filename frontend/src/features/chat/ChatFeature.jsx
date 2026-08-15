import React, { useState } from 'react';
import './chat.css';
import { useChatSocket } from './hooks/useChatSocket';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatRequestsModal from './components/ChatRequestsModal';

const ChatFeature = () => {
  const chatRealtime = useChatSocket();
  const [showRequests, setShowRequests] = useState(false);

  return (
    <div className="chat-container">
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
