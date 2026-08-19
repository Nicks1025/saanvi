import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

/**
 * MessageStatus
 *
 * Reusable receipt-tick indicator extracted from MessageBubble.
 * Renders nothing for incoming messages (isOwn=false).
 *
 * Props:
 *  status  {'sent'|'delivered'|'seen'}
 *  isOwn   {boolean}
 *  size    {number}  icon size (default 14)
 */
const MessageStatus = ({ status, isOwn, size = 14 }) => {
  if (!isOwn) return null;
  return (
    <span className="msg-status">
      {status === 'sent' && <Check size={size} className="receipt-icon receipt-sent" aria-label="Sent" />}
      {status === 'delivered' && <CheckCheck size={size} className="receipt-icon receipt-delivered" aria-label="Delivered" />}
      {status === 'seen' && <CheckCheck size={size} className="receipt-icon receipt-seen" aria-label="Seen" />}
    </span>
  );
};

export default MessageStatus;
