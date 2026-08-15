import React from 'react';
import { useAuth } from '../../../store/AuthContext';
import { MessageSquare, Users, UserPlus } from 'lucide-react';

const ChatSidebar = ({ chatRealtime, onShowRequests }) => {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, onlineUsers } = chatRealtime;

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h2>Chats</h2>
        <div style={{display: 'flex', gap: '8px'}}>
          <button onClick={onShowRequests} title="Chat Requests" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
             <UserPlus size={20} />
          </button>
          <button title="New Group" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
             <Users size={20} />
          </button>
        </div>
      </div>
      
      <div className="chat-list">
        {conversations.map(conv => {
          let name = conv.name;
          let avatar = conv.profile_image_url;
          let isOnline = false;

          if (!conv.is_group) {
             const otherMember = conv.members?.find(m => m.uuid !== user.uuid);
             name = otherMember ? otherMember.display_name : 'Unknown';
             avatar = otherMember?.profile_image_url;
             isOnline = otherMember ? onlineUsers[otherMember.uuid] : false;
          }

          return (
            <div 
              key={conv.uuid} 
              className={`chat-list-item ${activeConversation === conv.uuid ? 'active' : ''}`}
              onClick={() => setActiveConversation(conv.uuid)}
            >
              <div className="chat-list-item-avatar">
                {avatar ? <img src={avatar} alt={name} /> : (name ? name.charAt(0).toUpperCase() : '?')}
                {isOnline && !conv.is_group && (
                  <span style={{
                    position: 'absolute', width: '12px', height: '12px', background: '#10b981', 
                    borderRadius: '50%', border: '2px solid white', transform: 'translate(14px, 14px)'
                  }}></span>
                )}
              </div>
              <div className="chat-list-item-content">
                <div className="chat-list-item-header">
                  <span className="chat-list-item-name">{name || 'Unnamed Group'}</span>
                  {conv.last_message && (
                    <span className="chat-list-item-time">
                       {new Date(conv.last_message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="chat-list-item-message">
                  {conv.last_message ? conv.last_message.message : 'No messages yet'}
                  {Number(conv.unread_count) > 0 && (
                    <span className="unread-badge">{conv.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatSidebar;
