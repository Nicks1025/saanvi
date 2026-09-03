import { useEffect, useState, useRef } from 'react';
import { chatService } from '../chat.service';
import { useAuth } from '@/store/AuthContext';
import { useGlobalChat } from '@/store/ChatProvider';
import socketService from '@/services/socket.client';
import { chatStorage } from '../chatStorage';

export const useChatSocket = () => {
  const { user } = useAuth();
  const {
    conversations,
    messages: globalMessages,
    typingUsers,
    onlineUsers,
    reloadConversations,
    updateMessages,
    setConversationUnreadCount,
    getCachedMessages
  } = useGlobalChat();

  const [activeConversation, setActiveConversation] = useState(null);
  const typingTimeoutRef = useRef({});
  const pendingSeenRef = useRef(new Set());

  // 1. Initial / Active Conversation Messages Loading & Sync
  useEffect(() => {
    if (!activeConversation || !user) return;

    let mounted = true;
    const loadMessages = async () => {
      try {
        const cached = getCachedMessages(activeConversation);
        
        // 1. Check local chatStorage first
        let localMessages = [];
        try {
          localMessages = await chatStorage.getMessages(activeConversation);
        } catch (err) {
          console.error("Local DB read failed", err);
        }
        
        // Merge cached (socket messages received while chat was unopened) and localMessages (history)
        // Deduplicate by UUID
        const mergedMap = new Map();
        if (localMessages && localMessages.length > 0) {
          localMessages.forEach(m => mergedMap.set(m.uuid, m));
        }
        if (cached && cached.length > 0) {
          cached.forEach(m => mergedMap.set(m.uuid, m));
        }
        
        let mergedMessages = Array.from(mergedMap.values()).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

        if (mergedMessages.length > 0) {
           // Update React state with merged history
           updateMessages(activeConversation, mergedMessages);
           
           setConversationUnreadCount(activeConversation, 0);
           
           // Identify unseen
           const unseen = mergedMessages.filter(m => m.sender_uuid !== user.uuid && (!m.receipts || !m.receipts.find(r => r.user_uuid === user.uuid && r.seen_at)));
           unseen.forEach(m => {
             if (!pendingSeenRef.current.has(m.uuid)) {
               pendingSeenRef.current.add(m.uuid);
               socketService.emit('message:seen', { message_uuid: m.uuid, conversation_uuid: activeConversation });
             }
           });
           
           // Sync from server
           const latestMessage = mergedMessages[0];
           const res = await chatService.getMessages(activeConversation, { limit: 50, after: latestMessage.sent_at });
           if (res.success && res.data.length > 0 && mounted) {
             updateMessages(activeConversation, prev => {
               const newMessages = res.data.filter(nm => !prev.find(pm => pm.uuid === nm.uuid));
               return [...newMessages, ...prev];
             });
           }
        } else {
           // No messages at all locally or in state
           const res = await chatService.getMessages(activeConversation, { limit: 50 });
           if (res.success && mounted) {
             updateMessages(activeConversation, res.data);
             setConversationUnreadCount(activeConversation, 0);
             
             const unseen = res.data.filter(m => m.sender_uuid !== user.uuid && (!m.receipts || !m.receipts.find(r => r.user_uuid === user.uuid && r.seen_at)));
             unseen.forEach(m => {
               pendingSeenRef.current.add(m.uuid);
               socketService.emit('message:seen', { message_uuid: m.uuid, conversation_uuid: activeConversation });
             });
           }
        }
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };
    
    loadMessages();

    // Trigger presence sync
    socketService.emit('presence:sync', {});

    // Listen for socket reconnects to resync
    const handleReconnect = () => {
      loadMessages();
    };
    socketService.on('connect', handleReconnect);

    return () => {
      mounted = false;
      socketService.off('connect', handleReconnect);
    };
  }, [activeConversation, user]);

  const messages = getCachedMessages(activeConversation);

  // 2. Mark incoming messages as seen if chat is actively open
  useEffect(() => {
    if (!activeConversation || !user || !messages || messages.length === 0) return;
    
    const unseen = messages.filter(m => 
       m.sender_uuid !== user.uuid && 
       (!m.receipts || !m.receipts.find(r => r.user_uuid === user.uuid && r.seen_at)) &&
       !pendingSeenRef.current.has(m.uuid)
    );

    if (unseen.length > 0) {
      unseen.forEach(m => {
        pendingSeenRef.current.add(m.uuid);
        socketService.emit('message:seen', { message_uuid: m.uuid, conversation_uuid: activeConversation });
      });
      // Also clear the unread count in the sidebar immediately
      setConversationUnreadCount(activeConversation, 0);
    }
  }, [messages, activeConversation, user, setConversationUnreadCount]);

  const sendMessage = async (conversationUuid, text) => {
    return new Promise(async (resolve, reject) => {
      if (!navigator.onLine) {
        // Save to outbox
        const offlineMsg = {
           uuid: crypto.randomUUID(),
           conversation_uuid: conversationUuid,
           message: text,
           status: 'pending',
           sent_at: new Date().toISOString()
        };
        try {
          await chatStorage.saveOutboxMessage(offlineMsg);
          // Add to React state so it persists in UI until online
          updateMessages(conversationUuid, prev => [offlineMsg, ...prev]);
          // Return the offline message as optimistic success
          return resolve(offlineMsg);
        } catch (err) {
          return reject(new Error('Failed to save message offline'));
        }
      }

      socketService.emit('message:send', { conversation_uuid: conversationUuid, message: text }, (response) => {
        if (response && response.error) {
          console.error('Send message failed:', response.error);
          return reject(new Error(response.error));
        }
        
        // The backend broadcasts `message:receive` to the entire room including the sender.
        // ChatProvider.handleMessageReceive will add it to globalMessages and update last_message.
        // We do NOT need to do anything manually here — just resolve so optimistic cleanup runs.
        if (response && response.data) {
          resolve(response.data);
        } else {
          reject(new Error('No data in response'));
        }
      });
    });
  };

  // 4. Outbox Processing
  useEffect(() => {
    if (!user?.uuid) return;

    const processOutbox = async () => {
      if (!navigator.onLine) return;
      try {
        await chatStorage.init(user.uuid);
        const pending = await chatStorage.getOutboxMessages();
        for (let msg of pending) {
           socketService.emit('message:send', { conversation_uuid: msg.conversation_uuid, message: msg.message }, async (response) => {
             if (response && response.data) {
                await chatStorage.deleteOutboxMessage(msg.uuid);
                // The broadcast will be caught by handleMessageReceive
             }
           });
        }
      } catch (err) {
        console.error('Failed to process outbox', err);
      }
    };
    
    // Process when online
    window.addEventListener('online', processOutbox);
    // Process on mount (in case it reconnected before component mounted)
    processOutbox();
    
    return () => window.removeEventListener('online', processOutbox);
  }, [user?.uuid]);

  const sendTyping = () => {
    if (activeConversation) {
       socketService.emit('typing:start', { conversation_uuid: activeConversation });
       if (typingTimeoutRef.current['self']) clearTimeout(typingTimeoutRef.current['self']);
       typingTimeoutRef.current['self'] = setTimeout(() => {
           socketService.emit('typing:stop', { conversation_uuid: activeConversation });
       }, 1000);
    }
  };

  const stopTyping = () => {
    if (activeConversation) {
       if (typingTimeoutRef.current['self']) {
           clearTimeout(typingTimeoutRef.current['self']);
           delete typingTimeoutRef.current['self'];
       }
       socketService.emit('typing:stop', { conversation_uuid: activeConversation });
    }
  };

  const addOptimisticMessage = (conversationUuid, message) => {
    updateMessages(conversationUuid, prev => [message, ...prev]);
  };

  const updateOptimisticMessage = (conversationUuid, tempId, updatedFields) => {
    updateMessages(conversationUuid, prev => prev.map(m => m.uuid === tempId ? { ...m, ...updatedFields } : m));
  };

  const removeOptimisticMessage = (conversationUuid, tempId) => {
    updateMessages(conversationUuid, prev => prev.filter(m => m.uuid !== tempId));
  };

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMoreMessages = async () => {
    if (!activeConversation || loadingMore || !hasMore) return;
    const cached = getCachedMessages(activeConversation);
    if (!cached || cached.length === 0) return;

    setLoadingMore(true);
    try {
      const oldestMessage = cached[cached.length - 1]; // Oldest is at the end because messages are sorted descending (latest first)
      const res = await chatService.getMessages(activeConversation, { limit: 50, cursor: oldestMessage.sent_at });
      if (res.success) {
        if (res.data.length < 50) setHasMore(false);
        updateMessages(activeConversation, prev => [...prev, ...res.data]);
      }
    } catch (err) {
      console.error('Failed to load more messages', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    hasMore,
    loadingMore,
    loadMoreMessages,
    sendMessage,
    sendTyping,
    stopTyping,
    typingUsers,
    onlineUsers,
    reloadConversations,
    addOptimisticMessage,
    updateOptimisticMessage,
    removeOptimisticMessage
  };
};
