'use client';

import { useState } from 'react';

export type ImageBlockData = {
  type: 'image';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
};

export function ImageBlock({ block }: { block: ImageBlockData }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="cb-image-block cb-image-error">
        <span className="cb-image-error-icon">\u26A0</span>
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <div className="cb-image-block">
      {!loaded && (
        <div className="cb-image-loading">
          <div className="cb-image-loading-spinner" />
        </div>
      )}
      <img
        src={block.url}
        alt={block.alt || 'Image'}
        className={`cb-image ${loaded ? 'cb-image-loaded' : 'cb-image-hidden'}`}
        width={block.width}
        height={block.height}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
