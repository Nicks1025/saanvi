import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { chatService } from '../chat.service';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { validateFileForCategory, formatFileSize } from '../attachmentTypes';
import AttachmentPopover from './AttachmentPopover';
import VoiceRecorder from './VoiceRecorder';
import ImagePreviewStrip from './ImagePreviewStrip';
import SButton from '../../../components/common/SButton';
import STextField from '../../../components/common/STextField';
import { generatePreviewBase64 } from '../attachmentUtils';
import { chatStorage } from '../chatStorage';

const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_CHAT_MAX_FILE_SIZE) || 25 * 1024 * 1024;
const MAX_IMAGES = parseInt(import.meta.env.VITE_CHAT_MAX_IMAGES, 10) || 5;

const ChatInput = ({ chatRealtime, user }) => {
  const { t } = useTranslation();
  const { activeConversation, sendMessage, sendTyping, stopTyping, addOptimisticMessage, updateOptimisticMessage, removeOptimisticMessage } = chatRealtime;
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showAttachmentPopover, setShowAttachmentPopover] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Multi-image preview state
  const [selectedImages, setSelectedImages] = useState([]); // [{file, previewUrl}]
  const addMoreImagesRef = useRef(null);
  const attachmentBtnRef = useRef(null);

  const hasText = text.trim().length > 0;
  const hasPendingImages = selectedImages.length > 0;
  const isDisabled = loading || !activeConversation || isRecording;

  const uploadSingleFile = async (file, tempId, messageText) => {
    try {
      const category = 'images';
      const res = await chatService.generateUploadUrl(
        activeConversation, file.name, file.type, file.size, category
      );
      const uploadData = res.data ?? res;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadData.url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateOptimisticMessage(activeConversation, tempId, { progress: percent });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage upload failed for ${file.name}`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      const metadata = {
        uuid: uploadData.attachmentUuid,
        storage_key: uploadData.storageKey,
        file_name: uploadData.fileName,
        original_file_name: file.name,
        mime_type: uploadData.mimeType,
        file_size: uploadData.fileSize,
        category,
        preview_data: file.preview_data || null,
        width: file.width || null,
        height: file.height || null
      };

      // Save locally so the sender never has to download it
      await chatStorage.saveAttachment(uploadData.attachmentUuid, file);

      await chatService.completeUpload(activeConversation, messageText, metadata);
      removeOptimisticMessage(activeConversation, tempId);
    } catch (err) {
      console.error('[ChatInput] Upload failed:', err);
      updateOptimisticMessage(activeConversation, tempId, { status: 'failed' });
      toast.error(t('chat.failedUpload'));
    }
  };

  // ── Retry Upload Event ────────────────────────────────────────────────────
  useEffect(() => {
    const handleRetry = (e) => {
      const msg = e.detail.message;
      
      if (msg.rawFile) {
        updateOptimisticMessage(activeConversation, msg.uuid, { status: 'uploading', progress: 0 });
        uploadSingleFile(msg.rawFile, msg.uuid, msg.message);
      } else {
        updateOptimisticMessage(activeConversation, msg.uuid, { status: 'uploading' });
        sendMessage(activeConversation, msg.message)
          .then(() => removeOptimisticMessage(activeConversation, msg.uuid))
          .catch(err => {
            updateOptimisticMessage(activeConversation, msg.uuid, { status: 'failed' });
            toast.error(err.message || t('chat.failedSend'));
          });
      }
    };
    
    window.addEventListener('retryMessage', handleRetry);
    return () => window.removeEventListener('retryMessage', handleRetry);
  }, [activeConversation, updateOptimisticMessage, removeOptimisticMessage, t]);

  // ── Text message ──────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!hasText || !activeConversation) return;
    
    const txt = text.trim();
    setText('');
    stopTyping();
    
    const tempId = crypto.randomUUID();
    const optimisticMessage = {
      uuid: tempId,
      conversation_uuid: activeConversation,
      sender_uuid: user?.uuid,
      message: txt,
      sent_at: new Date().toISOString(),
      status: 'uploading',
      attachments: []
    };
    
    addOptimisticMessage(activeConversation, optimisticMessage);

    sendMessage(activeConversation, txt)
      .then(() => {
        removeOptimisticMessage(activeConversation, tempId);
      })
      .catch((err) => {
        updateOptimisticMessage(activeConversation, tempId, { status: 'failed' });
        toast.error(err.message || t('chat.failedSend'));
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e) => { setText(e.target.value); sendTyping(); };
  const handleBlur = () => { stopTyping(); };

  const handleAttachmentToggle = () => {
    if (!isDisabled) setShowAttachmentPopover(prev => !prev);
  };

  // ── Multi-image selection ─────────────────────────────────────────────────
  const handleImagesSelected = (files) => {
    setShowAttachmentPopover(false);

    if (files.length > MAX_IMAGES) {
      toast.error(t('chat.maxImagesError', { max: MAX_IMAGES }));
      return;
    }

    // Validate each image
    const valid = [];
    for (const file of files) {
      const validation = validateFileForCategory(file, 'images');
      if (!validation.valid) { toast.error(validation.error); continue; }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('chat.fileTooLarge', { name: file.name, max: formatFileSize(MAX_FILE_SIZE) }));
        continue;
      }
      valid.push(file);
    }

    if (!valid.length) return;



    // Check combined total
    const combined = [...selectedImages.map(i => i.file), ...valid];
    if (combined.length > MAX_IMAGES) {
      toast.error(t('chat.maxImagesTotalError', { max: MAX_IMAGES, selected: selectedImages.length }));
      return;
    }

    const newEntries = valid.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedImages(prev => [...prev, ...newEntries]);
  };

  const handleRemoveImage = (idx) => {
    setSelectedImages(prev => {
      const removed = prev[idx];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleCancelImages = () => {
    selectedImages.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setSelectedImages([]);
  };

  const handleSendImages = async (filesOverride) => {
    const activeFiles = filesOverride || selectedImages;
    if (!activeConversation || !activeFiles.length) return;
    if (activeFiles.length > MAX_IMAGES) {
      toast.error(t('chat.maxImagesPerMessage', { max: MAX_IMAGES }));
      return;
    }

    setLoading(true);
    const txt = text.trim();
    setText('');
    const filesToUpload = [...activeFiles];
    handleCancelImages();
    setLoading(false); // Free UI for user

    for (let i = 0; i < filesToUpload.length; i++) {
      const img = filesToUpload[i];
      const previewObj = await generatePreviewBase64(img.file);
      const preview_data = previewObj?.preview_data || null;
      const width = previewObj?.width || null;
      const height = previewObj?.height || null;
      img.file.preview_data = preview_data;
      img.file.width = width;
      img.file.height = height;
      
      const tempId = crypto.randomUUID();
      const msgText = i === filesToUpload.length - 1 ? (txt || null) : null;
      
      const _localUrl = URL.createObjectURL(img.file);
      
      const optimisticMessage = {
        uuid: tempId,
        conversation_uuid: activeConversation,
        sender_uuid: user?.uuid,
        message: msgText,
        sent_at: new Date().toISOString(),
        status: 'uploading',
        progress: 0,
        rawFile: img.file,
        attachments: [{
          uuid: crypto.randomUUID(),
          original_file_name: img.file.name,
          mime_type: img.file.type,
          file_size: img.file.size,
          category: 'images',
          attachment_type: 'image',
          preview_data,
          width,
          height,
          _localUrl
        }]
      };
      
      addOptimisticMessage(activeConversation, optimisticMessage);
      
      // Fire and forget
      uploadSingleFile(img.file, tempId, msgText);
    }
  };

  const handleFileSelected = async (file, category) => {
    if (!activeConversation) return;
    setShowAttachmentPopover(false);



    const validation = validateFileForCategory(file, category);
    if (!validation.valid) { toast.error(validation.error); return; }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('chat.fileTooLarge', { name: file.name, max: formatFileSize(MAX_FILE_SIZE) }));
      return;
    }

    const tempId = crypto.randomUUID();
    const previewObj = await generatePreviewBase64(file);
    const preview_data = previewObj?.preview_data || null;
    const width = previewObj?.width || null;
    const height = previewObj?.height || null;
    file.preview_data = preview_data;
    file.width = width;
    file.height = height;
    const _localUrl = URL.createObjectURL(file);
    
    const optimisticMessage = {
      uuid: tempId,
      conversation_uuid: activeConversation,
      sender_uuid: user?.uuid,
      message: text.trim() || null,
      sent_at: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      rawFile: file,
      attachments: [{
        uuid: crypto.randomUUID(),
        original_file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        category,
        attachment_type: file.type.startsWith('image') ? 'image' : category,
        preview_data,
        width,
        height,
        _localUrl
      }]
    };
    
    addOptimisticMessage(activeConversation, optimisticMessage);
    
    file.preview_data = preview_data;
    uploadSingleFile(file, tempId, text.trim() || null);
    setText('');
  };

  // ── Voice message ──────────────────────────────────────────────────────────
  const handleVoiceSend = async (blob, mimeType) => {
    setIsRecording(false);
    if (!activeConversation) return;
    setLoading(true);
    setUploadProgress(t('chat.uploadingVoice'));
    try {
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `voice-message.${ext}`;
      const res = await chatService.generateUploadUrl(activeConversation, fileName, mimeType, blob.size, 'voice');
      const uploadData = res.data ?? res;

      const uploadRes = await fetch(uploadData.url, {
        method: 'PUT', body: blob, headers: { 'Content-Type': mimeType },
      });
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Storage upload failed (${uploadRes.status}): ${errorText}`);
      }

      setUploadProgress(t('chat.sending'));
      
      // Save locally for sender
      await chatStorage.saveAttachment(uploadData.attachmentUuid, blob);
      
      await chatService.completeUpload(activeConversation, null, {
        uuid: uploadData.attachmentUuid,
        storage_key: uploadData.storageKey,
        file_name: uploadData.fileName,
        original_file_name: fileName,
        mime_type: uploadData.mimeType,
        file_size: blob.size,
        category: 'voice',
      });
    } catch (err) {
      console.error('[ChatInput] Voice upload failed:', err);
      toast.error(err.response?.data?.error || err.message || t('chat.failedVoice'));
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleVoiceCancel = () => setIsRecording(false);

  const handleMicClick = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(t('chat.voiceUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setIsRecording(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(t('chat.micPermissionDenied'));
      } else {
        toast.error(t('chat.micError', { error: err.message }));
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (uploadProgress && !hasPendingImages) {
    return (
      <div className="chat-composer-uploading" role="status" aria-live="polite">
        <span className="upload-spinner" aria-hidden="true" />
        <span>{uploadProgress}</span>
      </div>
    );
  }

  if (isRecording) {
    return <VoiceRecorder onSend={handleVoiceSend} onCancel={handleVoiceCancel} />;
  }

  // Multi-image preview mode
  if (hasPendingImages) {
    return (
      <ImagePreviewStrip
        images={selectedImages}
        onRemove={handleRemoveImage}
        onAddMore={() => {
          // Trigger a hidden file input for adding more images
          addMoreImagesRef.current?.click();
        }}
        onSend={handleSendImages}
        onCancel={handleCancelImages}
        sending={loading}
        uploadProgress={uploadProgress}
      >
        {/* Hidden input for "add more" — separate from popover */}
        <input
          ref={addMoreImagesRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          aria-hidden="true"
          onChange={(e) => {
            const files = Array.from(e.target.files);
            e.target.value = '';
            if (files.length) handleImagesSelected(files);
          }}
        />
      </ImagePreviewStrip>
    );
  }

  return (
    <div className="chat-composer">
      <div className="chat-composer-input-pill">
        <STextField
          className="chat-composer-input"
          placeholder={t('chat.typeMessage')}
          text={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isDisabled}
          aria-label={t('chat.typeMessage')}
          marginBottom="0"
          width="100%"
        />

        <div className="chat-composer-attachment-wrapper">
          <SButton
            ref={attachmentBtnRef}
            type="button"
            className="chat-composer-icon-btn"
            onClick={handleAttachmentToggle}
            disabled={isDisabled}
            title={t('chat.addAttachment')}
            aria-label={t('chat.addAttachment')}
            aria-expanded={showAttachmentPopover}
            aria-haspopup="menu"
            color="ghost"
          >
            <Paperclip size={20} />
          </SButton>

          <AttachmentPopover
            isOpen={showAttachmentPopover}
            onClose={() => setShowAttachmentPopover(false)}
            onFileSelected={handleFileSelected}
            onFilesSelected={handleImagesSelected}
            anchorRef={attachmentBtnRef}
          />
        </div>
      </div>

      {hasText ? (
        <SButton
          className="chat-composer-send-btn"
          onClick={handleSend}
          disabled={loading || !activeConversation}
          title={t('chat.sendMessage')}
          aria-label={t('chat.sendMessage')}
          color="primary"
        >
          <Send size={20} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
        </SButton>
      ) : (
          <SButton
            className="chat-composer-send-btn"
            onClick={handleMicClick}
            disabled={!activeConversation || loading}
            title={t('chat.recordVoice')}
            aria-label={t('chat.recordVoice')}
            color="primary"
          >
            <Mic size={20} />
        </SButton>
      )}
    </div>
  );
};

export default ChatInput;
