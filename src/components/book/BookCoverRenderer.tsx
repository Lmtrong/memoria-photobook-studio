import React from 'react';
import { AlbumFormat, CoverConfig } from '../../types';
import { FORMAT_DIMENSIONS } from '../../utils/constants';
import { BookOpen } from 'lucide-react';

interface BookCoverRendererProps {
  cover: CoverConfig;
  format: AlbumFormat;
  coverPhotoUrl?: string | null;
  isBackCover?: boolean;
  author?: string;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export const BookCoverRenderer: React.FC<BookCoverRendererProps> = ({
  cover,
  format,
  coverPhotoUrl,
  isBackCover = false,
  author,
  scale = 1,
  className = '',
  onClick,
}) => {
  const dims = FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS.landscape;
  const width = Math.round(dims.width * scale);
  const height = Math.round(dims.height * scale);

  if (isBackCover) {
    return (
      <div
        onClick={onClick}
        style={{
          width,
          height,
          backgroundColor: cover.backgroundColor,
          color: cover.titleColor,
        }}
        className={`relative overflow-hidden select-none hardcover-leather-overlay flex flex-col items-center justify-between p-8 shadow-book ${className}`}
      >
        {/* Spine groove on right side for back cover */}
        <div
          className="absolute top-0 right-0 bottom-0 w-6 pointer-events-none"
          style={{
            background: `linear-gradient(to left, ${cover.spineColor} 0%, rgba(0,0,0,0.35) 55%, transparent 100%)`,
          }}
        />
        <div className="w-full flex-1 border border-current/15 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-8 h-8 rounded-full border border-current/30 flex items-center justify-center mb-3 opacity-75">
            <BookOpen className="w-4 h-4" />
          </div>
          <p
            style={{ fontFamily: cover.titleFont }}
            className="text-sm tracking-[0.25em] uppercase opacity-80"
          >
            {cover.title}
          </p>
          {author && (
            <p className="text-xs opacity-55 mt-1 font-sans">
              {author}
            </p>
          )}
        </div>
        <div className="mt-4 text-[10px] tracking-[0.3em] uppercase opacity-45">
          MEMORIA STUDIO EDITION
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        backgroundColor: cover.backgroundColor,
        color: cover.titleColor,
      }}
      className={`relative overflow-hidden select-none hardcover-leather-overlay shadow-book transition-colors ${className}`}
    >
      {/* Left Spine Binding & Crimp Groove */}
      <div
        className="absolute top-0 left-0 bottom-0 z-20 pointer-events-none"
        style={{
          width: Math.max(14, Math.round(26 * scale)),
          background: `linear-gradient(to right, ${cover.spineColor} 0%, ${cover.spineColor} 65%, rgba(0,0,0,0.45) 82%, rgba(255,255,255,0.08) 92%, transparent 100%)`,
        }}
      />

      {/* Layout Style 1: Classic Inset Frame */}
      {cover.layoutStyle === 'classic' && (
        <div
          className="w-full h-full flex flex-col items-center justify-between text-center"
          style={{
            padding: `${Math.round(38 * scale)}px ${Math.round(38 * scale)}px ${Math.round(34 * scale)}px ${Math.round(52 * scale)}px`,
          }}
        >
          <div
            className="w-full h-full border flex flex-col items-center justify-between p-5 relative"
            style={{ borderColor: `${cover.titleColor}33` }}
          >
            {/* Corner ornaments */}
            <div
              className="w-full pt-2 pb-3"
              style={{ borderBottom: `1px solid ${cover.titleColor}25` }}
            >
              <p
                className="uppercase tracking-[0.28em] opacity-70"
                style={{ fontSize: Math.max(9, Math.round(11 * scale)) }}
              >
                {cover.subtitle || 'MEMORIA EDITION'}
              </p>
              <h2
                className="font-semibold tracking-wide mt-1 leading-tight line-clamp-2"
                style={{
                  fontFamily: cover.titleFont,
                  fontSize: Math.max(16, Math.round(34 * scale)),
                }}
              >
                {cover.title}
              </h2>
            </div>

            {/* Cover Photo Window */}
            <div className="w-4/5 flex-1 my-4 relative overflow-hidden bg-black/20 shadow-inner border border-white/15 flex items-center justify-center">
              {coverPhotoUrl ? (
                <div
                  className="w-full h-full bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${coverPhotoUrl}")` }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center opacity-40 p-4">
                  <BookOpen style={{ width: 28 * scale, height: 28 * scale }} />
                </div>
              )}
            </div>

            {author && (
              <p
                className="tracking-[0.2em] uppercase opacity-65"
                style={{ fontSize: Math.max(8, Math.round(11 * scale)) }}
              >
                {author}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Layout Style 2: Modern Editorial */}
      {cover.layoutStyle === 'modern' && (
        <div
          className="w-full h-full flex flex-col justify-between"
          style={{
            padding: `${Math.round(36 * scale)}px ${Math.round(32 * scale)}px ${Math.round(32 * scale)}px ${Math.round(48 * scale)}px`,
          }}
        >
          <div>
            <p
              className="uppercase tracking-[0.3em] opacity-65"
              style={{ fontSize: Math.max(8, Math.round(11 * scale)) }}
            >
              {cover.subtitle || 'PHOTOGRAPHIC ARCHIVE'}
            </p>
            <h2
              className="font-bold tracking-tight mt-1 leading-none"
              style={{
                fontFamily: cover.titleFont,
                fontSize: Math.max(18, Math.round(40 * scale)),
              }}
            >
              {cover.title}
            </h2>
          </div>

          <div className="w-full h-[64%] overflow-hidden bg-black/20 shadow-md relative">
            {coverPhotoUrl ? (
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${coverPhotoUrl}")` }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-35">
                <BookOpen style={{ width: 32 * scale, height: 32 * scale }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layout Style 3: Full-Bleed Portrait */}
      {cover.layoutStyle === 'full-bleed' && (
        <div className="w-full h-full relative">
          {coverPhotoUrl && (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${coverPhotoUrl}")` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />
          <div
            className="relative z-10 w-full h-full flex flex-col justify-end text-left"
            style={{
              padding: `${Math.round(36 * scale)}px ${Math.round(36 * scale)}px ${Math.round(40 * scale)}px ${Math.round(52 * scale)}px`,
            }}
          >
            <p
              className="uppercase tracking-[0.25em] opacity-80"
              style={{ fontSize: Math.max(8, Math.round(11 * scale)), color: '#F8F5F0' }}
            >
              {cover.subtitle}
            </p>
            <h2
              className="font-semibold mt-1 leading-tight"
              style={{
                fontFamily: cover.titleFont,
                fontSize: Math.max(18, Math.round(38 * scale)),
                color: '#FFFFFF',
              }}
            >
              {cover.title}
            </h2>
          </div>
        </div>
      )}

      {/* Layout Style 4: Minimal Gilded Frame */}
      {cover.layoutStyle === 'minimal-frame' && (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            padding: `${Math.round(42 * scale)}px ${Math.round(42 * scale)}px ${Math.round(42 * scale)}px ${Math.round(56 * scale)}px`,
          }}
        >
          <div
            className="w-full h-full border-2 flex flex-col items-center justify-center text-center p-6"
            style={{ borderColor: '#C5A059' }}
          >
            {coverPhotoUrl && (
              <div
                className="rounded-full overflow-hidden mb-4 border-2 shadow-inner bg-cover bg-center bg-no-repeat"
                style={{
                  width: Math.round(150 * scale),
                  height: Math.round(150 * scale),
                  borderColor: '#C5A059',
                  backgroundImage: `url("${coverPhotoUrl}")`,
                }}
              />
            )}
            <p
              className="uppercase tracking-[0.3em] opacity-75 mb-2"
              style={{ fontSize: Math.max(8, Math.round(11 * scale)), color: '#C5A059' }}
            >
              {cover.subtitle || 'KEEPSAKE'}
            </p>
            <h2
              className="font-semibold"
              style={{
                fontFamily: cover.titleFont,
                fontSize: Math.max(16, Math.round(34 * scale)),
              }}
            >
              {cover.title}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
};
