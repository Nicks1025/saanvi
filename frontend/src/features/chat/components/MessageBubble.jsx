import React, { useState, useEffect } from 'react';
import { Check, CheckCheck, FileText, Download, Music, Mic } from 'lucide-react';
import { useAuth } from '../../../store/AuthContext';
import { chatService } from '../chat.service';
import { formatFileSize } from '../attachmentTypes';

/**
 * AttachmentPreview
 *
 * Renders an attachment based on its type:
 *   image    → <img> with click-to-open
 *   video    → <video> with controls
 *   audio    → <audio> with controls (music attachments)
 *   voice    → <audio> with controls + mic icon label
 *   document → file card with download link
 *   file     → file card with download link
 */
const AttachmentPreview = ({ messageUuid, attachment }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        const res = await chatService.getDownloadUrl(messageUuid, attachment.uuid);
        if (isMounted) {
          setUrl(res.data?.url ?? res.url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[AttachmentPreview] Failed to load URL:', err);
          setError(true);
          setLoading(false);
        }
      }
    };
    fetchUrl();
    return () => { isMounted = false; };
  }, [messageUuid, attachment.uuid]);

  if (loading) {
    return <div className="attachment-loading">Loading attachment…</div>;
  }

  if (error || !url) {
    return <div className="attachment-error">Failed to load attachment</div>;
  }

  const type = attachment.attachment_type;

  if (type === 'image') {
    return (
      <div className="attachment-image-preview">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={attachment.original_file_name || attachment.file_name} />
        </a>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="attachment-video-preview">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls preload="metadata" src={url} />
      </div>
    );
  }

  if (type === 'audio' || type === 'voice') {
    const isVoice = type === 'voice';
    return (
      <div className="attachment-audio-preview">
        {isVoice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.75rem', opacity: 0.7 }}>
            <Mic size={13} />
            <span>Voice message</span>
          </div>
        )}
        {!isVoice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.75rem', opacity: 0.7 }}>
            <Music size={13} />
            <span>{attachment.original_file_name || attachment.file_name}</span>
          </div>
        )}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls preload="metadata" src={url} />
      </div>
    );
  }

  // document / file — show file card with download
  const sizeLabel = attachment.file_size ? formatFileSize(Number(attachment.file_size)) : '';
  return (
    <a
      className="attachment-file-card"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.original_file_name || attachment.file_name}
      aria-label={`Download ${attachment.original_file_name || attachment.file_name}`}
    >
      <FileText size={28} />
      <div className="attachment-file-info">
        <div className="attachment-file-name">
          {attachment.original_file_name || attachment.file_name}
        </div>
        {sizeLabel && <div className="attachment-file-size">{sizeLabel}</div>}
      </div>
      <Download size={18} style={{ flexShrink: 0 }} />
    </a>
  );
};

// ─────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn, conversation }) => {
  const { user } = useAuth();
  const time = new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let receiptStatus = 'sent'; // sent | delivered | seen

  if (isOwn) {
    if (conversation.is_group) {
      const otherMembers = conversation.members?.filter(m => m.uuid !== user.uuid) || [];
      const receipts = message.receipts || [];

      let allSeen = otherMembers.length > 0;
      let allDelivered = otherMembers.length > 0;

      for (const member of otherMembers) {
        const memberReceipt = receipts.find(r => r.user_uuid === member.uuid);
        if (!memberReceipt) {
          allSeen = false;
          allDelivered = false;
          break;
        } else {
          if (!memberReceipt.seen_at) allSeen = false;
          if (!memberReceipt.delivered_at && !memberReceipt.seen_at) allDelivered = false;
        }
      }

      if (allSeen) receiptStatus = 'seen';
      else if (allDelivered) receiptStatus = 'delivered';
    } else {
      const otherMember = conversation.members?.find(m => m.uuid !== user.uuid);
      const receipt = (message.receipts || []).find(r => r.user_uuid === otherMember?.uuid);
      if (receipt?.seen_at) receiptStatus = 'seen';
      else if (receipt?.delivered_at) receiptStatus = 'delivered';
    }
  }

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`message-bubble-wrapper ${isOwn ? 'outgoing' : 'incoming'}`}>
      <div className={`message-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
        {/* Group sender name */}
        {!isOwn && conversation.is_group && (
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '4px' }}>
            {conversation.members?.find(m => m.uuid === message.sender_uuid)?.display_name || 'Unknown'}
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && message.attachments.map(att =>
          att ? (
            <AttachmentPreview
              key={att.uuid}
              messageUuid={message.uuid}
              attachment={att}
            />
          ) : null
        )}

        {/* Text content */}
        {message.message && (
          <div className="message-text">{message.message}</div>
        )}

        {/* Timestamp + receipts */}
        <div className="message-meta">
          <span>{time}</span>
          {isOwn && (
            <div className="message-receipts">
              {receiptStatus === 'sent' && <Check className="receipt-icon receipt-sent" />}
              {receiptStatus === 'delivered' && <CheckCheck className="receipt-icon receipt-delivered" />}
              {receiptStatus === 'seen' && <CheckCheck className="receipt-icon receipt-seen" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
