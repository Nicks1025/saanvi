import React, { useState, useRef } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { chatService } from '../chat.service';
import { toast } from 'react-hot-toast';
import { validateFileForCategory, formatFileSize } from '../attachmentTypes';
import AttachmentPopover from './AttachmentPopover';
import VoiceRecorder from './VoiceRecorder';

const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_CHAT_MAX_FILE_SIZE) || 25 * 1024 * 1024;

const ChatInput = ({ chatRealtime }) => {
  const { activeConversation, sendMessage, sendTyping } = chatRealtime;
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // null | string description
  const [showAttachmentPopover, setShowAttachmentPopover] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Ref for the paperclip button — popover anchors to this
  const attachmentBtnRef = useRef(null);

  const hasText = text.trim().length > 0;
  const isDisabled = loading || !activeConversation || isRecording;

  // ---- Text Message ----
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!hasText || loading || !activeConversation) return;

    setLoading(true);
    try {
      await sendMessage(activeConversation, text.trim());
      setText('');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    sendTyping();
  };

  // Toggle popover — clicking button again closes it
  const handleAttachmentToggle = () => {
    if (!isDisabled) {
      setShowAttachmentPopover(prev => !prev);
    }
  };

  // ---- Attachment Upload ----
  const handleFileSelected = async (file, category) => {
    if (!activeConversation) return;
    setShowAttachmentPopover(false);

    // Client-side MIME validation
    const validation = validateFileForCategory(file, category);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Client-side file size check
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    setLoading(true);
    setUploadProgress('Preparing upload...');
    try {
      // 1. Request presigned upload URL from backend
      const res = await chatService.generateUploadUrl(
        activeConversation,
        file.name,
        file.type,
        file.size,
        category
      );
      const uploadData = res.data ?? res;

      setUploadProgress(`Uploading ${file.name}...`);

      // 2. Upload directly to R2
      const uploadRes = await fetch(uploadData.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Storage upload failed (${uploadRes.status}): ${errorText}`);
      }

      setUploadProgress('Finalizing...');

      // 3. Complete upload — creates the message + attachment record + socket emit
      await chatService.completeUpload(activeConversation, text.trim() || null, {
        storage_key: uploadData.storageKey,
        file_name: uploadData.fileName,
        original_file_name: file.name,
        mime_type: uploadData.mimeType,
        file_size: uploadData.fileSize,
        category,
      });

      setText('');
    } catch (err) {
      console.error('[ChatInput] Attachment upload failed:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  // ---- Voice Message ----
  const handleVoiceSend = async (blob, mimeType) => {
    setIsRecording(false);
    if (!activeConversation) return;

    setLoading(true);
    setUploadProgress('Uploading voice message...');
    try {
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `voice-message.${ext}`;

      // 1. Request presigned URL (voice category)
      const res = await chatService.generateUploadUrl(
        activeConversation,
        fileName,
        mimeType,
        blob.size,
        'voice'
      );
      const uploadData = res.data ?? res;

      // 2. Upload blob to R2
      const uploadRes = await fetch(uploadData.url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Storage upload failed (${uploadRes.status}): ${errorText}`);
      }

      setUploadProgress('Sending...');

      // 3. Complete upload
      await chatService.completeUpload(activeConversation, null, {
        storage_key: uploadData.storageKey,
        file_name: uploadData.fileName,
        original_file_name: fileName,
        mime_type: uploadData.mimeType,
        file_size: blob.size,
        category: 'voice',
      });
    } catch (err) {
      console.error('[ChatInput] Voice upload failed:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send voice message');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleVoiceCancel = () => {
    setIsRecording(false);
  };

  const handleMicClick = async () => {
    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }
    // Request permission upfront so user sees the prompt in context
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the test stream — VoiceRecorder will create its own
      stream.getTracks().forEach(t => t.stop());
      setIsRecording(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else {
        toast.error('Could not access microphone: ' + err.message);
      }
    }
  };

  // ---- Render ----

  // While uploading, show progress bar instead of composer
  if (uploadProgress) {
    return (
      <div className="chat-composer-uploading" role="status" aria-live="polite">
        <span className="upload-spinner" aria-hidden="true" />
        <span>{uploadProgress}</span>
      </div>
    );
  }

  // While recording, show voice recorder UI
  if (isRecording) {
    return (
      <VoiceRecorder
        onSend={handleVoiceSend}
        onCancel={handleVoiceCancel}
      />
    );
  }

  return (
      <div className="chat-composer">
        {/* Rounded input pill */}
        <div className="chat-composer-input-pill">
          <input
            type="text"
            className="chat-composer-input"
            placeholder="Type a message..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            aria-label="Message input"
          />

          {/* Attachment button with popover anchored to it */}
          <div className="chat-composer-attachment-wrapper">
            <button
              ref={attachmentBtnRef}
              type="button"
              className="chat-composer-icon-btn"
              onClick={handleAttachmentToggle}
              disabled={isDisabled}
              title="Add attachment"
              aria-label="Add attachment"
              aria-expanded={showAttachmentPopover}
              aria-haspopup="menu"
            >
              <Paperclip size={20} />
            </button>

            {/* Popover anchored relative to the button wrapper via CSS */}
            <AttachmentPopover
              isOpen={showAttachmentPopover}
              onClose={() => setShowAttachmentPopover(false)}
              onFileSelected={handleFileSelected}
              anchorRef={attachmentBtnRef}
            />
          </div>
        </div>

        {/* Send or Mic — toggles based on whether input has text */}
        {hasText ? (
          <button
            type="button"
            className="chat-composer-send-btn"
            onClick={handleSend}
            disabled={loading || !activeConversation}
            title="Send message"
            aria-label="Send message"
          >
            <Send size={20} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
          </button>
        ) : (
          <button
            type="button"
            className="chat-composer-send-btn"
            onClick={handleMicClick}
            disabled={!activeConversation || loading}
            title="Record voice message"
            aria-label="Record voice message"
          >
            <Mic size={20} />
          </button>
        )}
      </div>
  );
};

export default ChatInput;
