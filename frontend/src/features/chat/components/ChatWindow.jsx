import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../store/AuthContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import InlineWallpaperCropper from './InlineWallpaperCropper';
import SButton from '../../../components/common/SButton';
import { Users, MoreVertical, MessageSquare } from 'lucide-react';
import { chatService } from '../chat.service';
import { toast } from 'react-hot-toast';
import { CHAT_THEMES } from '../chatThemes';

const ChatWindow = ({ chatRealtime }) => {
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
      const toastId = toast.loading('Applying background...');
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
      toast.success('Wallpaper applied!', { id: toastId });
    } catch (err) {
      toast.error('Failed to apply wallpaper');
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
      toast.error('Failed to update theme');
    }
  };

  if (!activeConversation) {
    return (
      <div className="chat-window chat-window--empty">
        <div className="chat-window-empty-state">
           <MessageSquare size={48} className="chat-window-empty-icon" />
           <h3>Select a conversation to start messaging</h3>
        </div>
      </div>
    );
  }

  const conv = conversations.find(c => c.uuid === activeConversation);
  if (!conv) return null;

  let title = conv.name;
  let subtitle = '';
  
  if (conv.is_group) {
     subtitle = `${conv.members?.length || 0} members`;
  } else {
     const otherMember = conv.members?.find(m => m.uuid !== user.uuid);
     title = otherMember ? otherMember.display_name : 'Unknown';
     subtitle = otherMember && onlineUsers[otherMember.uuid] ? 'Online' : 'Offline';
  }

  // Determine typing indicator text
  const typingNames = Object.keys(typingUsers)
    .filter(uuid => typingUsers[uuid])
    .map(uuid => {
        const member = conv.members?.find(m => m.uuid === uuid);
        return member ? member.display_name : 'Someone';
    });
  
  let typingText = '';
  if (typingNames.length === 1) typingText = `${typingNames[0]} is typing...`;
  else if (typingNames.length > 1) typingText = `${typingNames.join(', ')} are typing...`;

  return (
    <div className="chat-window">
      <div className="chat-window-header">
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
                       text="Theme"
                       onClick={() => setShowThemeMenu(true)}
                       className="chat-dropdown-menu-item"
                     />
                     <SButton
                       color="ghost"
                       size="s"
                       text="Wallpaper"
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
          <div className="chat-messages">
            {messages.map((msg, index) => {
             const currentDate = new Date(msg.sent_at).toDateString();
             const nextDate = messages[index + 1] ? new Date(messages[index + 1].sent_at).toDateString() : null;
             
             const today = new Date();
             const yesterday = new Date(today);
             yesterday.setDate(yesterday.getDate() - 1);
             
             let dateLabel = '';
             if (currentDate === today.toDateString()) dateLabel = 'Today';
             else if (currentDate === yesterday.toDateString()) dateLabel = 'Yesterday';
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
          })}
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
        <ChatInput chatRealtime={chatRealtime} />
      </div>
    </div>
  );
};

export default ChatWindow;
