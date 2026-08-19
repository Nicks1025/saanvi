import React, { useEffect } from 'react';
import { FileText, Download, File, FileSpreadsheet, FileCode } from 'lucide-react';
import { formatFileSize } from '../../attachmentTypes';
import SButton from '../../../../components/common/SButton';
import { downloadAttachment } from '../../attachmentUtils';
import { useAttachment, ATTACHMENT_STATES } from '../../hooks/useAttachment';
import { CircularProgress } from '../common/CircularProgress';

/** Pick an icon based on MIME type / extension */
const FileIcon = ({ mimeType, size = 28 }) => {
  if (!mimeType) return <FileText size={size} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return <FileSpreadsheet size={size} />;
  }
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('code')) {
    return <FileCode size={size} />;
  }
  if (mimeType === 'application/pdf' || mimeType.includes('word') || mimeType.includes('text')) {
    return <FileText size={size} />;
  }
  return <File size={size} />;
};

const FileMessage = ({ messageUuid, attachment, isSender }) => {
  const { state, progress, localUrl, download, cancel } = useAttachment(messageUuid, attachment);

  const isDownloaded = state === ATTACHMENT_STATES.DOWNLOADED;
  const isDownloading = state === ATTACHMENT_STATES.DOWNLOADING;

  const displayName = attachment.original_file_name || attachment.file_name || 'File';
  const sizeLabel = attachment.file_size ? formatFileSize(Number(attachment.file_size)) : '';
  const ext = displayName.includes('.') ? displayName.split('.').pop().toUpperCase() : '';

  const handleDownload = async () => {
    if (isDownloaded) {
      downloadAttachment(localUrl, displayName);
    } else {
      const newUrl = await download();
      if (newUrl) {
        downloadAttachment(newUrl, displayName);
      }
    }
  };

  return (
    <div className="msg-file-card">
          <div className="msg-file-icon">
            <FileIcon mimeType={attachment.mime_type} size={26} />
            {ext && <span className="msg-file-ext">{ext}</span>}
          </div>
          <div className="msg-file-info">
            <span className="msg-file-name">{displayName}</span>
            {sizeLabel && <span className="msg-file-size">{sizeLabel}</span>}
          </div>
          
          <div className="msg-file-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
            {isDownloading ? (
              <CircularProgress progress={progress} onCancel={cancel} size={32} strokeWidth={3} />
            ) : (
              <SButton
                onClick={handleDownload}
                aria-label={isDownloaded ? `Save ${displayName}` : `Download ${displayName}`}
                color="ghost"
                size="small"
                style={{ padding: '4px', minWidth: 'unset', color: 'inherit' }}
              >
                {isDownloaded ? <FileText size={18} /> : <Download size={18} />}
              </SButton>
            )}
          </div>
    </div>
  );
};

export default FileMessage;
