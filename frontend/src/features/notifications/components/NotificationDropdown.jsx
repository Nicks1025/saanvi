import React from 'react';
import { Check, CheckCheck, MessageSquare, UserPlus, Bell } from 'lucide-react';
import { useNotifications } from '../store/NotificationProvider';
import './notifications.css';

const NotificationDropdown = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.uuid);
    }
    // TODO: Navigation logic based on entity_type
    // e.g., if entity_type === 'conversation', open chat window
    // For now, just close the dropdown
    onClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return <MessageSquare size={18} />;
      case 'CHAT_REQUEST':
        return <UserPlus size={18} />;
      case 'CHAT_REQUEST_ACCEPTED':
        return <Check size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="notification-mark-read"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-list">
        {loading && notifications.length === 0 ? (
          <div className="notification-loading">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((notification) => (
              <li 
                key={notification.uuid}
                onClick={() => handleNotificationClick(notification)}
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
              >
                <div className="notification-icon">
                  {getIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <p className="notification-title">
                    {notification.title}
                  </p>
                  <p className="notification-body">
                    {notification.body}
                  </p>
                  <p className="notification-time">
                    {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="notification-unread-dot"></div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="notification-footer">
        <button onClick={onClose} className="notification-close-btn">
          Close
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
