import React, { useState, useEffect } from 'react';
import { ImageFitMode } from '../../types';

interface CroppedPhotoImageProps {
  src: string;
  slotWidthPx: number;
  slotHeightPx: number;
  fitMode?: ImageFitMode;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  className?: string;
}

const naturalSizeCache = new Map<string, { w: number; h: number }>();

/**
 * Renders a high-resolution <img> with explicit aspect-ratio geometry
 * instead of CSS `object-fit: cover` or `background-image`.
 *
 * Benefits:
 * 1. Browser GPU mipmaps native <img> tags at full crystal-clear resolution (no blurry CSS background scaling).
 * 2. html2canvas renders native <img> tags at full print DPI (3x-4x scale) without stretching or aspect-ratio distortion.
 */
export const CroppedPhotoImage: React.FC<CroppedPhotoImageProps> = React.memo(({
  src,
  slotWidthPx,
  slotHeightPx,
  fitMode = 'cover',
  cropZoom = 1,
  cropX = 0,
  cropY = 0,
  className = '',
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    () => naturalSizeCache.get(src) || null
  );

  useEffect(() => {
    const cached = naturalSizeCache.get(src);
    if (cached) {
      setNaturalSize(cached);
    }
  }, [src]);

  const slotRatio = slotWidthPx > 0 && slotHeightPx > 0 ? slotWidthPx / slotHeightPx : 1;
  const imgRatio = naturalSize && naturalSize.h > 0 ? naturalSize.w / naturalSize.h : slotRatio;

  let widthPercent = 100;
  let heightPercent = 100;
  let leftPercent = 0;
  let topPercent = 0;

  if (naturalSize) {
    if (fitMode === 'cover') {
      if (imgRatio > slotRatio) {
        // Image is wider than slot -> match height 100%, overflow width horizontally
        heightPercent = 100;
        widthPercent = (imgRatio / slotRatio) * 100;
        leftPercent = (100 - widthPercent) / 2;
        topPercent = 0;
      } else {
        // Image is taller than slot -> match width 100%, overflow height vertically
        widthPercent = 100;
        heightPercent = (slotRatio / imgRatio) * 100;
        topPercent = (100 - heightPercent) / 2;
        leftPercent = 0;
      }
    } else {
      // 'contain' mode
      if (imgRatio > slotRatio) {
        widthPercent = 100;
        heightPercent = (slotRatio / imgRatio) * 100;
        topPercent = (100 - heightPercent) / 2;
        leftPercent = 0;
      } else {
        heightPercent = 100;
        widthPercent = (imgRatio / slotRatio) * 100;
        leftPercent = (100 - widthPercent) / 2;
        topPercent = 0;
      }
    }
  }

  return (
    <div
      className={`w-full h-full relative overflow-hidden pointer-events-none select-none ${className}`}
      style={{
        transform:
          cropZoom !== 1 || cropX !== 0 || cropY !== 0
            ? `scale(${cropZoom}) translate(${cropX}%, ${cropY}%)`
            : undefined,
      }}
    >
      <img
        src={src}
        alt=""
        decoding="async"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            const dims = { w: img.naturalWidth, h: img.naturalHeight };
            naturalSizeCache.set(src, dims);
            setNaturalSize(dims);
          }
        }}
        style={{
          position: 'absolute',
          width: `${widthPercent.toFixed(3)}%`,
          height: `${heightPercent.toFixed(3)}%`,
          left: `${leftPercent.toFixed(3)}%`,
          top: `${topPercent.toFixed(3)}%`,
          maxWidth: 'none',
          maxHeight: 'none',
        }}
      />
    </div>
  );
});
