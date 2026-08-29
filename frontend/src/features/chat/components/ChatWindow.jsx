import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../store/AuthContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import InlineWallpaperCropper from './InlineWallpaperCropper';
import SButton from '../../../components/common/SButton';
import { Users, MoreVertical, MessageSquare, ArrowLeft } from 'lucide-react';
import { chatService } from '../chat.service';
import { toast } from 'react-hot-toast';
import { CHAT_THEMES } from '../chatThemes';
import { useTranslation } from 'react-i18next';

const ChatWindow = ({ chatRealtime }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeConversation, conversations, messages, typingUsers, onlineUsers } = chatRealtime;
  
  const [showMenu, setShowMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [adjusterData, setAdjusterData] = useState(null); // the wallpaper data to adjust
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Local override to show immediate changes
  const [localWallpaperUrl, setLocalWallpaperUrl] = useState(null);

  useEffect(() => {
    setLocalWallpaperUrl(null);
    if (adjusterData?.url) {
      URL.revokeObjectURL(adjusterData.url);
    }
    setAdjusterData(null);
  }, [activeConversation]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowThemeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleWallpaperSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create a local URL for the selected image
    const localUrl = URL.createObjectURL(file);
    
    // IMMEDIATELY open the adjuster without uploading
    setAdjusterData({
      isNew: true,
      file: file,
      url: localUrl,
      transform: { tx: 0, ty: 0, sx: 1, sy: 1 }
    });

    setShowMenu(false);
    e.target.value = '';
  };

  const handleAdjusterCancel = () => {
    if (adjusterData?.url && adjusterData.isNew) {
      URL.revokeObjectURL(adjusterData.url);
    }
    setAdjusterData(null);
  };

  const handleAdjusterSave = async (data) => {
    try {
      const toastId = toast.loading(t('chat.applyingBackground'));
      let finalBackgroundData;

      if (data.isNew) {
        // Upload process
        const res = await chatService.generateWallpaperUploadUrl(activeConversation, data.file.name, data.file.type, data.file.size);
        const uploadData = res.data || res;
        
        const uploadRes = await fetch(uploadData.url, { method: 'PUT', body: data.file, headers: { 'Content-Type': data.file.type } });
        if (!uploadRes.ok) throw new Error('Upload failed');
        
        finalBackgroundData = JSON.stringify({
          type: 'wallpaper',
          storageKey: uploadData.storageKey,
          transform: data.transform
        });
      } else {
        // Just updating transform of existing wallpaper
        finalBackgroundData = JSON.stringify({
          type: 'wallpaper',
          storageKey: data.storageKey,
          transform: data.transform
        });
      }

      const res = await chatService.updateBackground(activeConversation, finalBackgroundData);
      setLocalWallpaperUrl(res.data?.wallpaper_url || res.wallpaper_url);
      setAdjusterData(null);
      toast.success(t('chat.wallpaperApplied'), { id: toastId });
    } catch (err) {
      toast.error(t('chat.failedWallpaper'));
    }
  };

  const handleSelectTheme = async (themeId) => {
    try {
      const bgData = themeId === 'default' ? null : `theme:${themeId}`;
      const res = await chatService.updateBackground(activeConversation, bgData);
      setLocalWallpaperUrl(res.data?.wallpaper_url || res.wallpaper_url);
      setShowMenu(false);
      setShowThemeMenu(false);
    } catch (err) {
      toast.error(t('chat.failedTheme'));
    }
  };

  if (!activeConversation) {
    return (
      <div className="chat-window chat-window--empty">
        <div className="chat-window-empty-state">
           <MessageSquare size={48} className="chat-window-empty-icon" />
           <h3>{t('chat.selectConversation')}</h3>
        </div>
      </div>
    );
  }

  const conv = conversations.find(c => c.uuid === activeConversation);
  if (!conv) return null;

  let title = conv.name;
  let subtitle = '';
  
  if (conv.is_group) {
     subtitle = t('chat.membersCount', { count: conv.members?.length || 0 });
  } else {
     const otherMember = conv.members?.find(m => m.uuid !== user.uuid);
     title = otherMember ? otherMember.display_name : t('chat.unknown');
     subtitle = otherMember && onlineUsers[otherMember.uuid] ? t('chat.online') : t('chat.offline');
  }

  // Determine typing indicator text
  const typingNames = Object.keys(typingUsers)
    .filter(uuid => typingUsers[uuid])
    .map(uuid => {
        const member = conv.members?.find(m => m.uuid === uuid);
        return member ? member.display_name : t('chat.unknown');
    });
  
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    const isAtTop = Math.abs(scrollTop) + clientHeight >= scrollHeight - 50; 
    if (isAtTop && !chatRealtime.loadingMore && chatRealtime.hasMore) {
      chatRealtime.loadMoreMessages();
    }
  };

  let typingText = '';
  if (typingNames.length === 1) typingText = t('chat.isTyping', { names: typingNames[0] });
  else if (typingNames.length > 1) typingText = t('chat.areTyping', { names: typingNames.join(', ') });

  return (
    <div className="chat-window">
      <div className="chat-window-header">
         <button className="chat-mobile-back-btn" onClick={() => chatRealtime.setActiveConversation(null)}>
           <ArrowLeft size={20} />
         </button>
         <div className="chat-list-item-avatar chat-list-item-avatar--no-margin">
            {conv.profile_image_url ? <img src={conv.profile_image_url} alt="avatar" /> : (conv.is_group ? <Users /> : (title ? title.charAt(0).toUpperCase() : '?'))}
         </div>
         <div className="chat-window-header-info">
            <div className="chat-window-header-name">{title || 'Unnamed'}</div>
            <div className="chat-window-header-status">{subtitle}</div>
         </div>
         
         <div className="chat-window-actions" ref={menuRef}>
            <SButton
              color="ghost"
              size="s"
              icon={<MoreVertical size={20} />}
              onClick={() => setShowMenu(!showMenu)}
              label="More options"
              title="More options"
              className="chat-header-more-btn"
            />
            
            {showMenu && (
              <div className="chat-dropdown-menu">
                 {showThemeMenu ? (
                   <div className="chat-theme-grid">
                     {CHAT_THEMES.map(theme => (
                       <div
                         key={theme.id}
                         className={`chat-theme-item chat-theme-${theme.id}`}
                         onClick={() => handleSelectTheme(theme.id)}
                         role="button"
                         tabIndex={0}
                         onKeyDown={(e) => e.key === 'Enter' && handleSelectTheme(theme.id)}
                       >
                         {theme.label}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <>
                     <SButton
                       color="ghost"
                       size="s"
                       text={t('chat.theme')}
                       onClick={() => setShowThemeMenu(true)}
                       className="chat-dropdown-menu-item"
                     />
                     <SButton
                       color="ghost"
                       size="s"
                       text={t('chat.wallpaper')}
                       onClick={() => fileInputRef.current?.click()}
                       className="chat-dropdown-menu-item"
                     />
                   </>
                 )}
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              className="chat-file-input-hidden"
              accept="image/*"
              onChange={handleWallpaperSelect}
            />
         </div>
      </div>



      <div className="chat-messages-wrapper">
        <div className="chat-messages-area">
          {(() => {
            const bgData = localWallpaperUrl !== null ? localWallpaperUrl : conv.wallpaper_url;
            if (!bgData) return null;

            if (bgData.startsWith('theme:')) {
               const themeName = bgData.split(':')[1];
               return <div className={`chat-wallpaper-container chat-theme-${themeName}`} />;
            } else if (bgData.startsWith('{')) {
               try {
                 const parsed = JSON.parse(bgData);
                 if (parsed.type === 'wallpaper' && parsed.url) {
                    return (
                      <div className="chat-wallpaper-container chat-theme-default">
                        <img 
                          className="chat-wallpaper-img" 
                          src={parsed.url} 
                          alt="wallpaper" 
                          style={{
                            transform: `translate(${parsed.transform?.tx || 0}px, ${parsed.transform?.ty || 0}px) scale(${parsed.transform?.sx || 1}, ${parsed.transform?.sy || 1})`
                          }}
                        />
                      </div>
                    );
                 }
               } catch(e) {}
            }
            return null;
          })()}
          <div className="chat-messages" onScroll={handleScroll}>
            {(() => {
              const clusteredMessages = [];
              const isMediaMsg = (m) => {
                if (m.attachments && m.attachments.length === 1) {
                  const type = m.attachments[0].attachment_type || m.attachments[0].mime_type || '';
                  return type.includes('image') || type === 'image';
                }
                return false;
              };

              for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const isMsgPending = msg.status === 'uploading' || msg.status === 'failed';
                
                if (isMediaMsg(msg) && !msg.message) {
                  const clusterAttachments = [{ ...msg.attachments[0], _messageUuid: msg.uuid, _status: msg.status, _progress: msg.progress }];
                  const clusterIds = [msg.uuid];
                  let j = i + 1;
                  while (j < messages.length && isMediaMsg(messages[j]) && !messages[j].message) {
                    const nextMsg = messages[j];
                    if (nextMsg.sender_uuid !== msg.sender_uuid) break;
                    const timeDiff = Math.abs(new Date(msg.sent_at) - new Date(nextMsg.sent_at));
                    if (timeDiff > 60000) break;
                    
                    const isNextPending = nextMsg.status === 'uploading' || nextMsg.status === 'failed';
                    if (isMsgPending !== isNextPending) break;
                    
                    clusterAttachments.unshift({ ...nextMsg.attachments[0], _messageUuid: nextMsg.uuid, _status: nextMsg.status, _progress: nextMsg.progress });
                    clusterIds.unshift(nextMsg.uuid);
                    j++;
                  }
                  if (clusterAttachments.length > 1) {
                    clusteredMessages.push({
                      ...msg,
                      uuid: msg.uuid,
                      attachments: clusterAttachments,
                      _clusterIds: clusterIds
                    });
                    i = j - 1;
                    continue;
                  }
                }
                clusteredMessages.push(msg);
              }
              
              return clusteredMessages.map((msg, index) => {
                const currentDate = new Date(msg.sent_at).toDateString();
                const nextDate = clusteredMessages[index + 1] ? new Date(clusteredMessages[index + 1].sent_at).toDateString() : null;
                
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                let dateLabel = '';
                if (currentDate === today.toDateString()) dateLabel = t('chat.today');
                else if (currentDate === yesterday.toDateString()) dateLabel = t('chat.yesterday');
                else dateLabel = new Date(msg.sent_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <React.Fragment key={msg.uuid}>
                    <MessageBubble 
                        message={msg} 
                        isOwn={msg.sender_uuid === user.uuid}
                        conversation={conv}
                    />
                    {currentDate !== nextDate && (
                      <div className="chat-date-separator">
                        <span>{dateLabel}</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </div>

          {adjusterData && (
             <InlineWallpaperCropper 
               wallpaperData={adjusterData} 
               onClose={handleAdjusterCancel} 
               onSave={handleAdjusterSave}
             />
          )}
        </div>
        {typingText && (
          <div className="chat-typing-indicator">
            {typingText}
          </div>
        )}
        <ChatInput chatRealtime={chatRealtime} user={user} />
      </div>
    </div>
  );
};

export default ChatWindow;
