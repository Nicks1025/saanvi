"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/features/chat/chat.service';
import socketService from '@/services/socket.client';
import { useAuth } from './AuthContext';
import { chatStorage } from '@/features/chat/chatStorage';
import Cookies from 'js-cookie';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({}); // { [conversationUuid]: Message[] }
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  
  const fetchedUserUuidRef = useRef(null);
  const typingTimeoutRef = useRef({});

  // 1. Manage Socket Connection tied to Auth
  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (isAuthenticated && user && token) {
      socketService.connect(token);
    } else if (!isAuthenticated) {
      // Disconnect and clear cache on logout
      socketService.disconnect();
      setConversations([]);
      setMessages({});
      setTypingUsers({});
      setOnlineUsers({});
      fetchedUserUuidRef.current = null;
    }
  }, [isAuthenticated, user]);

  const fetchConversations = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      await chatStorage.init(user.uuid);
      
      // 1. Load local cache for immediate render
      const localConvs = await chatStorage.getConversations();
      if (localConvs && localConvs.length > 0) {
        setConversations(localConvs);
      }

      // 2. Sync from server
      const res = await chatService.getConversations();
      if (res.success) {
        setConversations(res.data);
        await chatStorage.saveConversations(res.data);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, [user?.uuid]);

  // 2. Fetch Conversations initially
  useEffect(() => {
    if (user && user.uuid && fetchedUserUuidRef.current !== user.uuid) {
      fetchedUserUuidRef.current = user.uuid;
      fetchConversations();
    }
  }, [user?.uuid, fetchConversations]);

  // 3. Global Socket Event Listeners
  useEffect(() => {
    if (!user) return;

    const handleMessageReceive = (newMessage) => {
      // Update global message cache
      setMessages(prev => {
        const convMessages = prev[newMessage.conversation_uuid] || [];
        if (convMessages.find(m => m.uuid === newMessage.uuid)) return prev; // Deduplicate
        
        chatStorage.saveMessage(newMessage).catch(err => console.error('Failed to save message locally', err));
        
        return {
          ...prev,
          [newMessage.conversation_uuid]: [newMessage, ...convMessages]
        };
      });

      // Update unread count and last_message preview silently
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.uuid === newMessage.conversation_uuid) {
            let newUnreadCount = c.unread_count || 0;
            if (newMessage.sender_uuid !== user.uuid) {
                newUnreadCount = Number(newUnreadCount) + 1;
                socketService.emit('message:delivered', { 
                    message_uuid: newMessage.uuid, 
                    conversation_uuid: newMessage.conversation_uuid 
                });
            }
            return { 
              ...c, 
              unread_count: newUnreadCount, 
              last_message: { 
                uuid: newMessage.uuid, 
                message: newMessage.message, 
                sent_at: newMessage.sent_at, 
                sender_uuid: newMessage.sender_uuid,
                attachments: newMessage.attachments || [],
                receipts: newMessage.receipts || []
              } 
            };
          }
          return c;
        });
        
        chatStorage.saveConversations(updated).catch(err => console.error('Failed to save conversations locally', err));
        return updated;
      });
    };

    const handleMessageStatus = (payload) => {
      const { message_uuid, user_uuid, delivered_at, seen_at } = payload;
      setMessages(prev => {
         const updated = { ...prev };
         const messagesToSave = [];
         
         for (let conv of Object.keys(updated)) {
             updated[conv] = updated[conv].map(msg => {
                 if (msg.uuid === message_uuid) {
                     const existingReceipts = msg.receipts || [];
                     const existingReceipt = existingReceipts.find(r => r.user_uuid === user_uuid) || {};
                     const filtered = existingReceipts.filter(r => r.user_uuid !== user_uuid);
                     const newMsg = { 
                         ...msg, 
                         receipts: [
                             ...filtered, 
                             { 
                                 user_uuid, 
                                 delivered_at: delivered_at || existingReceipt.delivered_at, 
                                 seen_at: seen_at || existingReceipt.seen_at 
                             }
                         ] 
                     };
                     messagesToSave.push(newMsg);
                     return newMsg;
                 }
                 return msg;
             });
         }
         
         if (messagesToSave.length > 0) {
             chatStorage.saveMessages(messagesToSave).catch(err => console.error('Local status save error', err));
         }
         return updated;
      });
      
      // Update sidebar last_message status if it matches
      setConversations(prev => {
         const updatedConv = prev.map(c => {
             if (c.last_message && c.last_message.uuid === message_uuid) {
                 const existingReceipts = c.last_message.receipts || [];
                 const existingReceipt = existingReceipts.find(r => r.user_uuid === user_uuid) || {};
                 const filtered = existingReceipts.filter(r => r.user_uuid !== user_uuid);
                 return {
                     ...c,
                     last_message: {
                         ...c.last_message,
                         receipts: [
                             ...filtered,
                             { 
                                 user_uuid, 
                                 delivered_at: delivered_at || existingReceipt.delivered_at, 
                                 seen_at: seen_at || existingReceipt.seen_at 
                             }
                         ]
                     }
                 };
             }
             return c;
         });
         
         chatStorage.saveConversations(updatedConv).catch(e => console.error('Failed saving status to conversations', e));
         return updatedConv;
      });
    };

    const handleConversationNew = (newConv) => {
      setConversations(prev => {
        if (prev.find(c => c.uuid === newConv.uuid)) return prev;
        return [newConv, ...prev];
      });
    };

    const handleTypingUpdate = (payload) => {
      if (payload.user_uuid === user.uuid) return;
      setTypingUsers(prev => ({ ...prev, [payload.user_uuid]: payload.is_typing }));
      
      if (payload.is_typing) {
        if (typingTimeoutRef.current[payload.user_uuid]) {
            clearTimeout(typingTimeoutRef.current[payload.user_uuid]);
        }
        typingTimeoutRef.current[payload.user_uuid] = setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [payload.user_uuid]: false }));
        }, 3000);
      } else {
        if (typingTimeoutRef.current[payload.user_uuid]) {
            clearTimeout(typingTimeoutRef.current[payload.user_uuid]);
            delete typingTimeoutRef.current[payload.user_uuid];
        }
      }
    };

    const handlePresenceOnline = (payload) => {
       setOnlineUsers(prev => ({ ...prev, [payload.user_uuid]: true }));
    };

    const handlePresenceOffline = (payload) => {
       setOnlineUsers(prev => ({ ...prev, [payload.user_uuid]: false }));
    };

    socketService.on('message:receive', handleMessageReceive);
    socketService.on('message:status_update', handleMessageStatus);
    socketService.on('conversation:new', handleConversationNew);
    socketService.on('typing:update', handleTypingUpdate);
    socketService.on('presence:online', handlePresenceOnline);
    socketService.on('presence:offline', handlePresenceOffline);

    return () => {
      socketService.off('message:receive', handleMessageReceive);
      socketService.off('message:status_update', handleMessageStatus);
      socketService.off('conversation:new', handleConversationNew);
      socketService.off('typing:update', handleTypingUpdate);
      socketService.off('presence:online', handlePresenceOnline);
      socketService.off('presence:offline', handlePresenceOffline);
    };
  }, [user]);

  // Expose cache update functions for optimistic UI and background sync
  const updateMessages = (conversationUuid, newMessagesOrCallback) => {
    setMessages(prev => {
      const existing = prev[conversationUuid] || [];
      const updated = typeof newMessagesOrCallback === 'function' ? newMessagesOrCallback(existing) : newMessagesOrCallback;
      
      // Save updated messages locally (excluding optimistic messages which don't have sent_at usually, but we can save all)
      const nonOptimistic = updated.filter(m => m.status !== 'uploading' && m.status !== 'failed');
      if (nonOptimistic.length > 0) {
          chatStorage.saveMessages(nonOptimistic).catch(err => console.error('Local msg save error', err));
      }
      
      return { ...prev, [conversationUuid]: updated };
    });
  };

  const setConversationUnreadCount = (conversationUuid, count) => {
    setConversations(prev => prev.map(c => 
      c.uuid === conversationUuid ? { ...c, unread_count: count } : c
    ));
  };

  const getCachedMessages = (conversationUuid) => messages[conversationUuid] || [];

  return (
    <ChatContext.Provider value={{
      conversations,
      messages,
      typingUsers,
      onlineUsers,
      reloadConversations: fetchConversations,
      updateMessages,
      setConversationUnreadCount,
      getCachedMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useGlobalChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useGlobalChat must be used within a ChatProvider');
  }
  return context;
};
