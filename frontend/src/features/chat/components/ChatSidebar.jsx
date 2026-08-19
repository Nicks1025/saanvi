import React from 'react';
import { useAuth } from '../../../store/AuthContext';
import { MessageSquare, Users, UserPlus, Check, CheckCheck, Image as ImageIcon, Video, Mic, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SButton from '../../../components/common/SButton';

const ChatSidebar = ({ chatRealtime, onShowRequests }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, onlineUsers } = chatRealtime;

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h2>{t('chat.title')}</h2>
        <div style={{display: 'flex', gap: '8px'}}>
          <SButton onClick={onShowRequests} title={t('chat.chatRequests')} aria-label={t('chat.chatRequests')} color="ghost" size="xs">
             <UserPlus size={20} />
          </SButton>
          <SButton title={t('chat.newGroup')} aria-label={t('chat.newGroup')} color="ghost" size="xs">
             <Users size={20} />
          </SButton>
        </div>
      </div>
      
      <div className="chat-list">
        {conversations.map(conv => {
          let name = conv.name;
          let avatar = conv.profile_image_url;
          let isOnline = false;

          if (!conv.is_group) {
             const otherMember = conv.members?.find(m => m.uuid !== user.uuid);
             name = otherMember ? otherMember.display_name : t('chat.unknown');
             avatar = otherMember?.profile_image_url;
             isOnline = otherMember ? onlineUsers[otherMember.uuid] : false;
          }

          let lastMessageText = conv.last_message ? conv.last_message.message : t('chat.noMessagesYet', 'No messages yet');
          let messageIcon = null;
          let tickIcon = null;

          if (conv.last_message) {
            const attachments = conv.last_message.attachments || [];
            if (attachments.length > 0) {
               const type = attachments[0].attachment_type || attachments[0].mime_type || '';
               if (type.includes('image') || type === 'image') {
                  messageIcon = <ImageIcon size={14} className="last-msg-icon" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                  lastMessageText = lastMessageText || t('chat.image', 'Image');
               } else if (type.includes('video') || type === 'video') {
                  messageIcon = <Video size={14} className="last-msg-icon" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                  lastMessageText = lastMessageText || t('chat.video', 'Video');
               } else if (type.includes('audio') || type === 'voice') {
                  messageIcon = <Mic size={14} className="last-msg-icon" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                  lastMessageText = lastMessageText || t('chat.voice', 'Voice');
               } else {
                  messageIcon = <FileText size={14} className="last-msg-icon" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                  lastMessageText = lastMessageText || t('chat.file', 'File');
               }
            }

            if (lastMessageText && lastMessageText.length > 30) {
                lastMessageText = lastMessageText.substring(0, 30) + '...';
            }

            if (conv.last_message.sender_uuid === user.uuid) {
                const receipts = conv.last_message.receipts || [];
                const deliveredCount = receipts.filter(r => r.delivered_at).length;
                const seenCount = receipts.filter(r => r.seen_at).length;
                
                // Exclude sender from target count
                const targetCount = conv.members ? conv.members.length - 1 : 1;

                if (seenCount > 0 && (seenCount >= targetCount || !conv.is_group)) {
                    tickIcon = <CheckCheck size={14} className="msg-tick seen-tick" style={{ color: '#3b82f6', marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                } else if (deliveredCount > 0) {
                    tickIcon = <CheckCheck size={14} className="msg-tick delivered-tick" style={{ color: '#9ca3af', marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                } else {
                    tickIcon = <Check size={14} className="msg-tick sent-tick" style={{ color: '#9ca3af', marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />;
                }
            }
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
                  <div className="chat-list-item-message-text" style={{ display: 'flex', alignItems: 'center' }}>
                    {tickIcon}
                    {messageIcon}
                    <span>{lastMessageText}</span>
                  </div>
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
