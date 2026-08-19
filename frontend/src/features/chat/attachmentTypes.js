/**
 * Allowed MIME types per attachment category.
 * Also used to generate accept="" attributes for file inputs.
 */

export const ATTACHMENT_CATEGORIES = {
  images: {
    label: 'Images',
    description: 'Upload photos',
    icon: '🖼️',
    iconClass: 'images',
    accept: 'image/*',
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
    ],
  },
  files: {
    label: 'Files',
    description: 'Upload documents and files',
    icon: '📄',
    iconClass: 'files',
    accept: [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.zip', '.rar', '.7z', '.tar', '.gz',
      '.json', '.xml', '.md',
    ].join(','),
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/json',
      'application/xml',
      'text/xml',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ],
  },
  music: {
    label: 'Music',
    description: 'Upload audio and music files',
    icon: '🎵',
    iconClass: 'music',
    accept: 'audio/*',
    mimeTypes: [
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'audio/aac',
      'audio/flac',
      'audio/x-flac',
      'audio/x-wav',
      'audio/x-m4a',
      'audio/mp3',
    ],
  },
};

/**
 * Validate that a file's MIME type is allowed for the given category.
 * @param {File} file
 * @param {keyof typeof ATTACHMENT_CATEGORIES} category
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileForCategory(file, category) {
  const config = ATTACHMENT_CATEGORIES[category];
  if (!config) {
    return { valid: false, error: 'Unknown attachment category.' };
  }

  const mimeType = file.type;

  // Check against strict MIME list (prefer) or accept wildcard pattern fallback
  const strictMatch = config.mimeTypes.includes(mimeType);

  // Wildcard fallback: images/* / audio/*
  const wildcardMatch =
    (category === 'images' && mimeType.startsWith('image/')) ||
    (category === 'music' && mimeType.startsWith('audio/'));

  if (!strictMatch && !wildcardMatch) {
    return {
      valid: false,
      error: `File type "${mimeType || 'unknown'}" is not allowed for ${config.label}.`,
    };
  }

  return { valid: true };
}

/**
 * Map MIME type to an attachment_type string for the backend.
 * @param {string} mimeType
 * @returns {string}
 */
export function mimeToAttachmentType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  if (
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  }
  return 'file';
}

/**
 * Format file size to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
