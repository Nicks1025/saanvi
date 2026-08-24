/**
 * Centralized utility for handling chat attachments on the frontend.
 */

/**
 * Accurately determines the category/type of an attachment for routing to the correct UI component.
 * Safely handles legacy attachments that may have been categorized as 'audio' instead of 'voice'.
 *
 * @param {Object} attachment - The attachment metadata object.
 * @returns {'image' | 'voice' | 'audio' | 'file' | 'document' | 'unknown'}
 */
export const getAttachmentCategory = (attachment) => {
  if (!attachment) return 'unknown';

  const type = attachment.attachment_type;
  const fileName = (attachment.original_file_name || attachment.file_name || '').toLowerCase();

  // Legacy voice note fallback
  if (type === 'audio' && fileName.startsWith('voice-message')) {
    return 'voice';
  }

  // Explicit types
  if (type === 'voice') return 'voice';
  if (type === 'image') return 'image';
  if (type === 'audio') return 'audio';
  if (type === 'document') return 'document';
  if (type === 'file') return 'file';

  // Fallback to MIME if attachment_type is missing or malformed
  const mime = (attachment.mime_type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) {
    if (fileName.startsWith('voice-message')) return 'voice';
    return 'audio';
  }

  if (
    mime === 'application/pdf' ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation')
  ) {
    return 'document';
  }

  return 'file';
};

/**
 * Generates a tiny base64 preview of an image for blurred fallback.
 */
export const generatePreviewBase64 = (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(null);
    }

    const maxDim = 32;
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxDim / width, maxDim / height);
      canvas.width = Math.max(1, width * ratio);
      canvas.height = Math.max(1, height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ preview_data: canvas.toDataURL('image/jpeg', 0.5), width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
};

/**
 * Helper to download a file from a URL to the local filesystem.
 */
export const downloadAttachment = async (url, filename) => {
  try {
    let finalUrl = url;
    let createdUrl = false;

    // If it's a remote URL, fetch it to ensure the filename is respected by the browser
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      finalUrl = window.URL.createObjectURL(blob);
      createdUrl = true;
    }

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = finalUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    
    // Give browser time to start download before revoking
    setTimeout(() => {
      document.body.removeChild(a);
      if (createdUrl) {
        window.URL.revokeObjectURL(finalUrl);
      }
    }, 100);
  } catch (err) {
    console.error('Download failed, falling back to new tab:', err);
    window.open(url, '_blank');
  }
};
