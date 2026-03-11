'use client';

export type FileBlockData = {
  type: 'file';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(name: string, mimeType?: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mimeType?.startsWith('image/')) return '\uD83D\uDDBC'; // framed picture
  if (mimeType?.startsWith('video/')) return '\uD83C\uDFA5'; // movie camera
  if (mimeType?.startsWith('audio/')) return '\uD83C\uDFB5'; // musical note
  if (['pdf'].includes(ext)) return '\uD83D\uDCC4'; // page
  if (['zip', 'gz', 'tar', 'rar', '7z'].includes(ext)) return '\uD83D\uDCE6'; // package
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return '\uD83D\uDCC3'; // page with curl
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '\uD83D\uDCCA'; // bar chart
  if (['js', 'ts', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h'].includes(ext))
    return '\uD83D\uDCBB'; // laptop
  return '\uD83D\uDCC1'; // file folder
}

export function FileBlock({ block }: { block: FileBlockData }) {
  return (
    <a
      href={block.url}
      className="cb-file-block"
      download={block.name}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="cb-file-icon">{getFileIcon(block.name, block.mimeType)}</span>
      <div className="cb-file-info">
        <span className="cb-file-name">{block.name}</span>
        {block.size !== undefined && (
          <span className="cb-file-size">{formatFileSize(block.size)}</span>
        )}
      </div>
      <span className="cb-file-download-icon">\u2193</span>
    </a>
  );
}
