import { useEffect, useState, useCallback, useRef } from 'react';
import { chatService } from '../chat.service';
import { useAuth } from '../../../store/AuthContext';
import socketService from '../../../services/socket.client';

export const useChatSocket = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  
  const typingTimeoutRef = useRef({});
  const fetchedUserUuidRef = useRef(null);

  // Initialize and connect Socket
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (user && token) {
      socketService.connect(token);
    }
    return () => {
      // We don't necessarily disconnect here unless the auth unmounts,
      // but it's safe to keep the connection alive while ChatFeature is active.
      // socketService.disconnect();
    };
  }, [user]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations();
      if (res.success) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, []);

  // Load conversations
  useEffect(() => {
    if (user && user.uuid && fetchedUserUuidRef.current !== user.uuid) {
      fetchedUserUuidRef.current = user.uuid;
      fetchConversations();
    }
  }, [user?.uuid, fetchConversations]);

  // Handle incoming messages and status updates
  useEffect(() => {
    if (!user) return;

    const handleMessageReceive = (newMessage) => {
      setMessages(prev => {
        const convMessages = prev[newMessage.conversation_uuid] || [];
        if (convMessages.find(m => m.uuid === newMessage.uuid)) return prev; // deduplicate
        
        return {
          ...prev,
          [newMessage.conversation_uuid]: [newMessage, ...convMessages]
        };
      });

      // Update conversations list last_message
      setConversations(prev => prev.map(c => {
        if (c.uuid === newMessage.conversation_uuid) {
          let newUnreadCount = c.unread_count || 0;
          if (newMessage.sender_uuid !== user.uuid && activeConversation !== newMessage.conversation_uuid) {
              newUnreadCount = Number(newUnreadCount) + 1;
          }
          return { ...c, unread_count: newUnreadCount, last_message: { uuid: newMessage.uuid, message: newMessage.message, sent_at: newMessage.sent_at, sender_uuid: newMessage.sender_uuid } };
        }
        return c;
      }));

      // If not sent by me, mark as delivered (if we are not currently active)
      if (newMessage.sender_uuid !== user.uuid) {
         if (activeConversation === newMessage.conversation_uuid) {
             socketService.emit('message:seen', { message_uuid: newMessage.uuid, conversation_uuid: newMessage.conversation_uuid });
         } else {
             socketService.emit('message:delivered', { message_uuid: newMessage.uuid, conversation_uuid: newMessage.conversation_uuid });
         }
      }
    };

    const handleMessageStatus = (payload) => {
      const { message_uuid, user_uuid, status, delivered_at, seen_at } = payload;
      setMessages(prev => {
         const updated = { ...prev };
         for (let conv of Object.keys(updated)) {
             updated[conv] = updated[conv].map(msg => {
                 if (msg.uuid === message_uuid) {
                     const existingReceipts = msg.receipts || [];
                     const filtered = existingReceipts.filter(r => r.user_uuid !== user_uuid);
                     return { ...msg, receipts: [...filtered, { user_uuid, delivered_at, seen_at }] };
                 }
                 return msg;
             });
         }
         return updated;
      });
    };

    const handleConversationNew = (newConv) => {
      setConversations(prev => {
        if (prev.find(c => c.uuid === newConv.uuid)) return prev;
        return [newConv, ...prev];
      });
    };

    socketService.on('message:receive', handleMessageReceive);
    socketService.on('message:status_update', handleMessageStatus);
    socketService.on('conversation:new', handleConversationNew);

    return () => {
      socketService.off('message:receive', handleMessageReceive);
      socketService.off('message:status_update', handleMessageStatus);
      socketService.off('conversation:new', handleConversationNew);
    };
  }, [user, activeConversation]);

  // Load messages for active conversation and manage presence/typing
  useEffect(() => {
    if (!activeConversation || !user) return;

    const loadMessages = async () => {
      try {
        const res = await chatService.getMessages(activeConversation);
        if (res.success) {
          setMessages(prev => ({ ...prev, [activeConversation]: res.data }));
          
          setConversations(prev => prev.map(c => {
            if (c.uuid === activeConversation) return { ...c, unread_count: 0 };
            return c;
          }));

          // Mark all unseen messages as seen
          const unseen = res.data.filter(m => m.sender_uuid !== user.uuid && (!m.receipts || !m.receipts.find(r => r.user_uuid === user.uuid && r.seen_at)));
          unseen.forEach(m => {
            socketService.emit('message:seen', { message_uuid: m.uuid, conversation_uuid: activeConversation });
          });
        }
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };
    loadMessages();

    // Trigger presence sync
    socketService.emit('presence:sync', {});

    const handleTypingUpdate = (payload) => {
      if (payload.conversation_uuid !== activeConversation) return;
      if (payload.user_uuid === user.uuid) return;

      setTypingUsers(prev => ({ ...prev, [payload.user_uuid]: payload.is_typing }));
      
      if (payload.is_typing) {
        if (typingTimeoutRef.current[payload.user_uuid]) {
            clearTimeout(typingTimeoutRef.current[payload.user_uuid]);
        }
        typingTimeoutRef.current[payload.user_uuid] = setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [payload.user_uuid]: false }));
        }, 3000);
      }
    };

    const handlePresenceOnline = (payload) => {
       setOnlineUsers(prev => ({ ...prev, [payload.user_uuid]: true }));
    };

    const handlePresenceOffline = (payload) => {
       setOnlineUsers(prev => ({ ...prev, [payload.user_uuid]: false }));
    };

    socketService.on('typing:update', handleTypingUpdate);
    socketService.on('presence:online', handlePresenceOnline);
    socketService.on('presence:offline', handlePresenceOffline);

    return () => {
      socketService.off('typing:update', handleTypingUpdate);
      socketService.off('presence:online', handlePresenceOnline);
      socketService.off('presence:offline', handlePresenceOffline);
      setTypingUsers({});
    };
  }, [activeConversation, user]);

  const sendMessage = async (conversationUuid, text) => {
    return new Promise((resolve, reject) => {
      socketService.emit('message:send', { conversation_uuid: conversationUuid, message: text }, (response) => {
        if (response && response.error) {
          console.error('Send message failed:', response.error);
          return reject(new Error(response.error));
        }
        
        if (response && response.data) {
          // Optimistically update
          setMessages(prev => {
            const convMessages = prev[conversationUuid] || [];
            if (convMessages.find(m => m.uuid === response.data.uuid)) return prev;
            return {
              ...prev,
              [conversationUuid]: [response.data, ...convMessages]
            };
          });
          
          setConversations(prev => prev.map(c => {
            if (c.uuid === conversationUuid) {
              return { ...c, last_message: { uuid: response.data.uuid, message: response.data.message, sent_at: response.data.sent_at, sender_uuid: response.data.sender_uuid } };
            }
            return c;
          }));
          resolve(response.data);
        }
      });
    });
  };

  const sendTyping = () => {
    if (activeConversation) {
       socketService.emit('typing:start', { conversation_uuid: activeConversation });
       // Optional: add a debounce to emit typing:stop after a few seconds of no keystrokes
       if (typingTimeoutRef.current['self']) clearTimeout(typingTimeoutRef.current['self']);
       typingTimeoutRef.current['self'] = setTimeout(() => {
           socketService.emit('typing:stop', { conversation_uuid: activeConversation });
       }, 2000);
    }
  };

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages: messages[activeConversation] || [],
    sendMessage,
    sendTyping,
    typingUsers,
    onlineUsers,
    reloadConversations: fetchConversations,
  };
};
