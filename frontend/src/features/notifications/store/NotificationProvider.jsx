import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../../../services/axios.client';
import { useAuth } from '../../../store/AuthContext';
import socketService from '../../../services/socket.client';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const fetchNotifications = useCallback(async (after = null) => {
    if (!user?.uuid) return;
    setLoading(true);
    try {
      // If after is passed, fetch incremental, otherwise fetch latest
      let url = '/api/notifications';
      if (after) {
        url += `?after=${after}`;
      }
      
      const { data } = await api.get(url);
      
      if (data?.success) {
        if (after) {
          // Merge incremental, placing new at top, deduplicating
          setNotifications(prev => {
            const merged = [...data.data, ...prev];
            // Deduplicate by UUID
            const map = new Map();
            merged.forEach(n => map.set(n.uuid, n));
            return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          });
        } else {
          setNotifications(data.data);
        }

        // Keep track of latest sync time
        if (data.data.length > 0) {
          setLastSync(data.data[0].created_at);
        }
      }
    } catch (err) {
      console.error('[NotificationProvider] Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      const { data } = await api.get('/api/notifications/unread-count');
      if (data?.success) {
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('[NotificationProvider] Error fetching unread count:', err);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user?.uuid) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLastSync(null);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Socket setup
  useEffect(() => {
    if (!user?.uuid) return;

    const handleNotificationReceive = (notification) => {
      setNotifications(prev => {
        // Prevent duplicates
        if (prev.find(n => n.uuid === notification.uuid)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
      
      // Update last sync
      setLastSync(notification.created_at);

      // Toast feedback if the user isn't actively looking at the same entity type
      // A more robust check could verify active conversation UUID, but standard toast for now
      toast.success(`${notification.title}\n${notification.body || ''}`, {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    };

    socketService.on('notification:receive', handleNotificationReceive);

    // Support offline sync on reconnect
    const handleReconnect = () => {
      if (lastSync) {
        fetchNotifications(lastSync);
      } else {
        fetchNotifications();
      }
      fetchUnreadCount();
    };

    socketService.on('connect', handleReconnect);

    return () => {
      socketService.off('notification:receive', handleNotificationReceive);
      socketService.off('connect', handleReconnect);
    };
  }, [user, lastSync, fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (uuid) => {
    try {
      const { data } = await api.put(`/api/notifications/${uuid}/read`);
      if (data?.success) {
        setNotifications(prev => prev.map(n => n.uuid === uuid ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[NotificationProvider] Error marking read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data } = await api.put('/api/notifications/mark-all-read');
      if (data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[NotificationProvider] Error marking all read:', err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
