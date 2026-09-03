import React, { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import SButton from '@/components/common/SButton';
import TextMessage from './messages/TextMessage';
import ImageMessage from './messages/ImageMessage';
import MediaGalleryMessage from './messages/MediaGalleryMessage';
import VoiceMessage from './messages/VoiceMessage';
import AudioMessage from './messages/AudioMessage';
import FileMessage from './messages/FileMessage';
import ImageLightbox from './messages/ImageLightbox';
import MessageStatus from './messages/MessageStatus';
import { getAttachmentCategory } from '../attachmentUtils';

/**
 * Derive receipt status from message receipts.
 * Returns 'seen' | 'delivered' | 'sent'.
 */
function deriveReceiptStatus(message, conversation, userUuid) {
  if (conversation.is_group) {
    const otherMembers = conversation.members?.filter(m => m.uuid !== userUuid) || [];
    const receipts = message.receipts || [];
    let allSeen = otherMembers.length > 0;
    let allDelivered = otherMembers.length > 0;
    for (const member of otherMembers) {
      const r = receipts.find(r => r.user_uuid === member.uuid);
      if (!r) { allSeen = false; allDelivered = false; break; }
      if (!r.seen_at) allSeen = false;
      if (!r.delivered_at && !r.seen_at) allDelivered = false;
    }
    if (allSeen) return 'seen';
    if (allDelivered) return 'delivered';
    return 'sent';
  } else {
    const otherMember = conversation.members?.find(m => m.uuid !== userUuid);
    const receipt = (message.receipts || []).find(r => r.user_uuid === otherMember?.uuid);
    if (receipt?.seen_at) return 'seen';
    if (receipt?.delivered_at) return 'delivered';
    return 'sent';
  }
}

/**
 * MessageBubble
 *
 * Top-level message bubble shell.  Determines layout (incoming / outgoing),
 * receipt status, message type, and delegates rendering to the appropriate
 * sub-component.
 *
 * Sub-component routing:
 *  • No attachments          → TextMessage
 *  • 1 image attachment      → ImageMessage  (+ TextMessage for caption)
 *  • 2–5 image attachments   → ImageGalleryMessage
 *  • voice attachment        → VoiceMessage
 *  • audio attachment        → AudioMessage
 *  • document/file           → FileMessage
 *  • Mixed / other           → fallback per attachment
 *
 * Props:
 *  message      {object}
 *  isOwn        {boolean}
 *  conversation {object}
 */
const MessageBubble = ({ message, isOwn, conversation }) => {
  const { user } = useAuth();
  const time = new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const status = message.status === 'uploading' || message.status === 'failed' 
    ? message.status 
    : (isOwn ? deriveReceiptStatus(message, conversation, user.uuid) : 'sent');

  // Lightbox state — used by image and gallery messages
  const [lightboxAttachments, setLightboxAttachments] = useState(null); // null | Array<object>
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (attachments, index = 0) => {
    setLightboxAttachments(attachments);
    setLightboxIndex(index);
  };
  const closeLightbox = () => setLightboxAttachments(null);

  const attachments = message.attachments?.filter(Boolean) || [];
  const hasAttachments = attachments.length > 0;

  const mediaAttachments = attachments.filter(a => {
    const cat = getAttachmentCategory(a);
    return cat === 'image';
  });
  const voiceAttachment = attachments.find(a => getAttachmentCategory(a) === 'voice');
  const audioAttachment = attachments.find(a => getAttachmentCategory(a) === 'audio');
  const fileAttachment = attachments.find(a => {
    const cat = getAttachmentCategory(a);
    return cat === 'file' || cat === 'document';
  });

  // Sender name for group chats
  const senderName = !isOwn && conversation.is_group
    ? conversation.members?.find(m => m.uuid === message.sender_uuid)?.display_name || 'Unknown'
    : null;

  // All messages now use the standard bubble background
  const isMediaOnly = false;
  const overlayMeta = false;

  let msgType = 'text';
  if (mediaAttachments.length > 1) msgType = 'gallery';
  else if (mediaAttachments.length === 1) msgType = 'image';
  else if (voiceAttachment) msgType = 'voice';
  else if (audioAttachment) msgType = 'audio';
  else if (fileAttachment) msgType = 'file';

  return (
    <>
      <div className={`msg-wrapper ${isOwn ? 'msg-wrapper--out' : 'msg-wrapper--in'}`}>
        <div className={`msg-bubble ${isOwn ? 'msg-bubble--out' : 'msg-bubble--in'}`}>
          {status === 'uploading' && <div className="msg-bubble-overlay"><span className="upload-spinner" /></div>}
          {status === 'failed' && (
            <div className="msg-bubble-overlay msg-bubble-overlay--failed" style={{ flexDirection: 'column', gap: '8px' }}>
              <span>Failed</span>
              <SButton size="s" color="primary" onClick={() => window.dispatchEvent(new CustomEvent('retryMessage', { detail: { message } }))}>
                Retry
              </SButton>
            </div>
          )}
          
          {/* Group sender name */}
          {senderName && (
            <div className="msg-sender-name">{senderName}</div>
          )}

          <div className={`msg-body msg-body--${msgType}`}>
            {mediaAttachments.length > 1 ? (
              <MediaGalleryMessage
                messageUuid={message.uuid}
                attachments={mediaAttachments}
                caption={message.message || null}
                isSender={isOwn}
                onImageClick={(idx) => {
                  openLightbox(mediaAttachments, idx ?? 0);
                }}
              />
            ) : mediaAttachments.length === 1 && getAttachmentCategory(mediaAttachments[0]) === 'image' ? (
              <ImageMessage
                messageUuid={message.uuid}
                attachment={mediaAttachments[0]}
                caption={message.message || null}
                isSender={isOwn}
                onImageClick={() => openLightbox(mediaAttachments, 0)}
              />
            ) : voiceAttachment ? (
              <VoiceMessage
                messageUuid={message.uuid}
                attachment={voiceAttachment}
                isSender={isOwn}
              />
            ) : audioAttachment ? (
              <AudioMessage
                messageUuid={message.uuid}
                attachment={audioAttachment}
                isSender={isOwn}
              />
            ) : fileAttachment ? (
              <FileMessage
                messageUuid={message.uuid}
                attachment={fileAttachment}
                isSender={isOwn}
              />
            ) : (
              /* No attachments — pure text */
              <TextMessage message={message.message} />
            )}

            <div className="msg-meta">
              <span className="msg-time">{time}</span>
              <MessageStatus status={status} isOwn={isOwn} />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox portal — rendered at message level */}
      {lightboxAttachments && (
        <ImageLightbox
          messageUuid={message.uuid}
          attachments={lightboxAttachments}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNav={setLightboxIndex}
        />
      )}
    </>
  );
};

export default MessageBubble;
