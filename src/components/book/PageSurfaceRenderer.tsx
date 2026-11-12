import React, { useRef, useState } from 'react';
import {
  AlbumFormat,
  AlbumPage,
  BackgroundPattern,
  PhotoSlot,
  StickerElement,
  TextElement,
} from '../../types';
import { FORMAT_DIMENSIONS } from '../../utils/constants';
import { renderPageBorderSvg, renderStickerSvg } from '../../features/stickers/stickerAssets';
import { getTextFrameWrapperStyle, renderTextFrameOrnaments } from '../../features/text/textFrames';
import { TEXT_BOX_MAX_CHARS } from '../../types';
import { SelectedElementType } from '../../stores/useEditorStore';
import { ImagePlus, Move, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';

interface PageSurfaceRendererProps {
  page: AlbumPage;
  format: AlbumFormat;
  photoUrls: Record<string, string>;
  scale?: number;
  interactive?: boolean;
  pageSide?: 'left' | 'right' | 'single';
  selectedType?: SelectedElementType;
  selectedId?: string | null;
  onSelectElement?: (type: SelectedElementType, id: string | null) => void;
  onDropPhotoOnSlot?: (slotId: string, photoId: string) => void;
  onDropFilesOnSlot?: (slotId: string, files: FileList) => void;
  onClickEmptySlot?: (slotId: string) => void;
  onUpdatePhotoSlot?: (slotId: string, partial: Partial<PhotoSlot>, recordHistory?: boolean) => void;
  onUpdateText?: (textId: string, partial: Partial<TextElement>, recordHistory?: boolean) => void;
  onUpdateSticker?: (
    stickerId: string,
    partial: Partial<StickerElement>,
    recordHistory?: boolean
  ) => void;
  onDeleteSelected?: () => void;
  showPageNumber?: boolean;
}

const PATTERN_CLASS_MAP: Record<BackgroundPattern, string> = {
  none: '',
  subtle: 'paper-texture-subtle',
  linen: 'paper-texture-linen',
  vintage: 'paper-texture-vintage',
  floral: 'paper-texture-floral',
  dots: 'paper-texture-dots',
  grid: 'paper-texture-grid',
};

export const PageSurfaceRenderer: React.FC<PageSurfaceRendererProps> = ({
  page,
  format,
  photoUrls,
  scale = 1,
  interactive = false,
  pageSide = 'single',
  selectedType,
  selectedId,
  onSelectElement,
  onDropPhotoOnSlot,
  onDropFilesOnSlot,
  onClickEmptySlot,
  onUpdatePhotoSlot,
  onUpdateText,
  onUpdateSticker,
  onDeleteSelected,
  showPageNumber = true,
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const dims = FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS.landscape;
  const width = Math.round(dims.width * scale);
  const height = Math.round(dims.height * scale);

  // Pointer drag handler for moving or resizing elements in percentage coordinates
  const startPointerDrag = (
    e: React.PointerEvent,
    type: 'photo' | 'text' | 'sticker',
    id: string,
    mode: 'move' | 'resize',
    initialRect: { x: number; y: number; width: number; height: number }
  ) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelectElement?.(type, id);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let hasMoved = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dxPx = moveEvent.clientX - startClientX;
      const dyPx = moveEvent.clientY - startClientY;
      if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) {
        hasMoved = true;
      }

      const dxPercent = (dxPx / width) * 100;
      const dyPercent = (dyPx / height) * 100;

      if (mode === 'move') {
        const nextX = Math.max(-10, Math.min(95, Number((initialRect.x + dxPercent).toFixed(2))));
        const nextY = Math.max(-10, Math.min(95, Number((initialRect.y + dyPercent).toFixed(2))));

        if (type === 'photo') {
          onUpdatePhotoSlot?.(id, { x: nextX, y: nextY }, false);
        } else if (type === 'text') {
          onUpdateText?.(id, { x: nextX, y: nextY }, false);
        } else {
          onUpdateSticker?.(id, { x: nextX, y: nextY }, false);
        }
      } else {
        const nextW = Math.max(6, Math.min(98, Number((initialRect.width + dxPercent).toFixed(2))));
        const nextH = Math.max(5, Math.min(98, Number((initialRect.height + dyPercent).toFixed(2))));

        if (type === 'photo') {
          onUpdatePhotoSlot?.(id, { width: nextW, height: nextH }, false);
        } else if (type === 'text') {
          onUpdateText?.(id, { width: nextW }, false);
        } else {
          onUpdateSticker?.(id, { width: nextW, height: nextH }, false);
        }
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (hasMoved) {
        // Trigger a history snapshot on drag end
        if (type === 'photo') onUpdatePhotoSlot?.(id, {}, true);
        if (type === 'text') onUpdateText?.(id, {}, true);
        if (type === 'sticker') onUpdateSticker?.(id, {}, true);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const getShadowStyle = (shadow: PhotoSlot['shadow']) => {
    switch (shadow) {
      case 'soft':
        return '0 6px 18px -3px rgba(57, 51, 47, 0.16), 0 2px 6px -1px rgba(57, 51, 47, 0.08)';
      case 'polaroid':
        return '0 10px 24px -4px rgba(57, 51, 47, 0.22), 0 2px 8px rgba(57, 51, 47, 0.12)';
      case 'deep':
        return '0 18px 36px -6px rgba(35, 29, 25, 0.32), 0 4px 12px rgba(35, 29, 25, 0.18)';
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (interactive) {
          setEditingTextId(null);
          onSelectElement?.('page', null);
        }
      }}
      style={{
        width,
        height,
        backgroundColor: page.backgroundColor || '#F8F5F0',
      }}
      className={`relative overflow-hidden select-none transition-colors ${
        PATTERN_CLASS_MAP[page.backgroundPattern || 'none']
      }`}
    >
      {/* Realistic Spine Crease Overlay */}
      {pageSide === 'left' && (
        <div className="absolute inset-0 pointer-events-none z-40 book-spine-crease-left" />
      )}
      {pageSide === 'right' && (
        <div className="absolute inset-0 pointer-events-none z-40 book-spine-crease-right" />
      )}

      {/* Decorative Page Border Overlay */}
      {renderPageBorderSvg(page.borderStyle, page.borderColor || '#C5A059')}

      {/* PHOTO SLOTS */}
      {page.photoSlots.map((slot) => {
        const isSelected = interactive && selectedType === 'photo' && selectedId === slot.id;
        const isDragOver = dragOverSlotId === slot.id;
        const photoUrl = slot.photoId ? photoUrls[slot.photoId] : null;
        const isPolaroid = slot.shadow === 'polaroid';

        return (
          <div
            key={slot.id}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              transform: `rotate(${slot.rotation || 0}deg)`,
              zIndex: slot.zIndex,
              opacity: slot.opacity ?? 1,
              borderWidth: isPolaroid ? Math.max(6, slot.borderWidth) * scale : slot.borderWidth * scale,
              borderBottomWidth: isPolaroid
                ? Math.max(26, slot.borderWidth * 3.2) * scale
                : slot.borderWidth * scale,
              borderColor: slot.borderColor || '#FFFFFF',
              borderStyle: (slot.borderWidth > 0 || isPolaroid) ? 'solid' : 'none',
              borderRadius: `${slot.cornerRadius * scale}px`,
              boxShadow: getShadowStyle(slot.shadow),
              backgroundColor: photoUrl
                ? isPolaroid
                  ? '#FFFFFF'
                  : 'rgba(239, 233, 223, 0.4)'
                : 'rgba(227, 215, 200, 0.55)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!interactive) return;
              onSelectElement?.('photo', slot.id);
              if (!photoUrl && onClickEmptySlot) {
                onClickEmptySlot(slot.id);
              }
            }}
            onDragOver={(e) => {
              if (!interactive) return;
              e.preventDefault();
              setDragOverSlotId(slot.id);
            }}
            onDragLeave={() => setDragOverSlotId(null)}
            onDrop={(e) => {
              if (!interactive) return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverSlotId(null);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFilesOnSlot) {
                onDropFilesOnSlot(slot.id, e.dataTransfer.files);
                return;
              }
              const droppedPhotoId = e.dataTransfer.getData('text/memoria-photo-id');
              if (droppedPhotoId && onDropPhotoOnSlot) {
                onDropPhotoOnSlot(slot.id, droppedPhotoId);
              }
            }}
            className={`absolute transition-shadow group ${
              interactive ? 'cursor-pointer' : ''
            } ${
              isSelected
                ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-transparent'
                : isDragOver
                ? 'ring-2 ring-gold bg-gold/20'
                : interactive
                ? 'hover:ring-1 hover:ring-taupe/70'
                : ''
            }`}
          >
            {/* Inner Photo Container */}
            <div
              className="w-full h-full overflow-hidden relative flex items-center justify-center"
              style={{
                borderRadius: `${Math.max(0, (slot.cornerRadius - 1) * scale)}px`,
              }}
            >
              {photoUrl ? (
                <div
                  className="w-full h-full pointer-events-none select-none will-change-transform bg-no-repeat"
                  style={{
                    backgroundImage: `url("${photoUrl}")`,
                    backgroundSize: slot.fitMode === 'contain' ? 'contain' : 'cover',
                    backgroundPosition: 'center center',
                    transform: `scale(${slot.cropZoom || 1}) translate(${slot.cropX || 0}%, ${
                      slot.cropY || 0
                    }%)`,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-charcoal/45 p-2 text-center border border-dashed border-charcoal/20 w-full h-full">
                  <ImagePlus
                    style={{
                      width: Math.max(14, 22 * scale),
                      height: Math.max(14, 22 * scale),
                    }}
                    className="mb-1 opacity-60"
                  />
                  {scale > 0.45 && (
                    <span
                      className="font-sans leading-tight max-w-[90%]"
                      style={{ fontSize: Math.max(9, Math.round(11 * scale)) }}
                    >
                      {t.editor.canvas.emptySlot}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Optional Polaroid Bottom Caption */}
            {isPolaroid && slot.polaroidCaption && (
              <div
                className="absolute left-0 right-0 bottom-0 flex items-center justify-center text-center font-handwriting text-charcoal/85 pointer-events-none"
                style={{
                  height: `${Math.max(22, slot.borderWidth * 2.8) * scale}px`,
                  transform: `translateY(100%)`,
                  fontSize: `${Math.max(10, Math.round(16 * scale))}px`,
                }}
              >
                {slot.polaroidCaption}
              </div>
            )}

            {/* Interactive Controls Overlay */}
            {isSelected && interactive && (
              <>
                {/* Move Handle */}
                <button
                  type="button"
                  title="Move frame"
                  onPointerDown={(e) =>
                    startPointerDrag(e, 'photo', slot.id, 'move', {
                      x: slot.x,
                      y: slot.y,
                      width: slot.width,
                      height: slot.height,
                    })
                  }
                  className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-charcoal text-ivory shadow flex items-center justify-center cursor-move z-50 hover:bg-terracotta"
                >
                  <Move className="w-3 h-3" />
                </button>

                {/* Bottom-Right Resize Handle */}
                <div
                  onPointerDown={(e) =>
                    startPointerDrag(e, 'photo', slot.id, 'resize', {
                      x: slot.x,
                      y: slot.y,
                      width: slot.width,
                      height: slot.height,
                    })
                  }
                  className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-terracotta border-2 border-ivory shadow cursor-nwse-resize z-50"
                />
              </>
            )}
          </div>
        );
      })}

      {/* STICKER ELEMENTS */}
      {page.stickers.map((stk) => {
        const isSelected = interactive && selectedType === 'sticker' && selectedId === stk.id;
        return (
          <div
            key={stk.id}
            style={{
              left: `${stk.x}%`,
              top: `${stk.y}%`,
              width: `${stk.width}%`,
              height: `${stk.height}%`,
              transform: `rotate(${stk.rotation || 0}deg)`,
              opacity: stk.opacity ?? 1,
              zIndex: stk.zIndex,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!interactive) return;
              onSelectElement?.('sticker', stk.id);
            }}
            onPointerDown={(e) => {
              if (!interactive) return;
              startPointerDrag(e, 'sticker', stk.id, 'move', {
                x: stk.x,
                y: stk.y,
                width: stk.width,
                height: stk.height,
              });
            }}
            className={`absolute ${interactive ? 'cursor-move' : ''} ${
              isSelected
                ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-transparent'
                : interactive
                ? 'hover:ring-1 hover:ring-taupe/60'
                : ''
            }`}
          >
            {renderStickerSvg(stk.stickerType, stk.color, stk.label)}

            {isSelected && interactive && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSelected?.();
                  }}
                  className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-700 text-white shadow flex items-center justify-center z-50 hover:bg-red-800"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div
                  onPointerDown={(e) =>
                    startPointerDrag(e, 'sticker', stk.id, 'resize', {
                      x: stk.x,
                      y: stk.y,
                      width: stk.width,
                      height: stk.height,
                    })
                  }
                  className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-terracotta border-2 border-ivory shadow cursor-nwse-resize z-50"
                />
              </>
            )}
          </div>
        );
      })}

      {/* TEXT & CAPTIONS */}
      {page.textElements.map((txt) => {
        const isSelected = interactive && selectedType === 'text' && selectedId === txt.id;
        const isEditing = interactive && editingTextId === txt.id;

        return (
          <div
            key={txt.id}
            style={{
              left: `${txt.x}%`,
              top: `${txt.y}%`,
              width: `${txt.width}%`,
              transform: `rotate(${txt.rotation || 0}deg)`,
              opacity: txt.opacity ?? 1,
              zIndex: txt.zIndex,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!interactive) return;
              onSelectElement?.('text', txt.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!interactive) return;
              setEditingTextId(txt.id);
            }}
            onPointerDown={(e) => {
              if (!interactive || isEditing) return;
              startPointerDrag(e, 'text', txt.id, 'move', {
                x: txt.x,
                y: txt.y,
                width: txt.width,
                height: 10,
              });
            }}
            className={`absolute p-1 ${interactive && !isEditing ? 'cursor-move' : ''} ${
              isSelected
                ? 'ring-2 ring-terracotta rounded-sm'
                : interactive
                ? 'hover:ring-1 hover:ring-taupe/60 rounded-sm'
                : ''
            }`}
          >
           <div className="relative" style={getTextFrameWrapperStyle(txt, scale)}>
            {renderTextFrameOrnaments(txt, scale)}
            {isEditing ? (
              <textarea
                autoFocus
                maxLength={TEXT_BOX_MAX_CHARS}
                value={txt.content}
                onChange={(e) =>
                  onUpdateText?.(
                    txt.id,
                    { content: e.target.value.slice(0, TEXT_BOX_MAX_CHARS) },
                    false
                  )
                }
                onBlur={() => setEditingTextId(null)}
                style={{
                  fontFamily: txt.fontFamily,
                  fontSize: `${Math.max(9, Math.round(txt.fontSize * scale))}px`,
                  fontWeight: txt.fontWeight,
                  fontStyle: txt.fontStyle,
                  color: txt.color,
                  textAlign: txt.textAlign,
                  letterSpacing: `${txt.letterSpacing * scale}px`,
                }}
                className="w-full bg-white/80 outline-none resize-none p-1 rounded border border-terracotta leading-snug"
                rows={2}
              />
            ) : (
              <div
                style={{
                  fontFamily: txt.fontFamily,
                  fontSize: `${Math.max(8, Math.round(txt.fontSize * scale))}px`,
                  fontWeight: txt.fontWeight,
                  fontStyle: txt.fontStyle,
                  color: txt.color,
                  textAlign: txt.textAlign,
                  letterSpacing: `${txt.letterSpacing * scale}px`,
                  whiteSpace: 'pre-wrap',
                }}
                className="w-full leading-snug break-words"
              >
                {txt.content}
              </div>
            )}
           </div>

            {isSelected && interactive && !isEditing && (
              <div
                onPointerDown={(e) =>
                  startPointerDrag(e, 'text', txt.id, 'resize', {
                    x: txt.x,
                    y: txt.y,
                    width: txt.width,
                    height: 10,
                  })
                }
                className="absolute -bottom-2 -right-2 w-3.5 h-3.5 rounded-full bg-terracotta border border-ivory shadow cursor-ew-resize z-50"
              />
            )}
          </div>
        );
      })}

      {/* Subtle Folio Page Number */}
      {showPageNumber && (
        <div
          style={{
            fontSize: `${Math.max(8, Math.round(11 * scale))}px`,
            bottom: `${Math.max(6, Math.round(12 * scale))}px`,
          }}
          className={`absolute z-30 font-serif tracking-widest opacity-45 pointer-events-none ${
            pageSide === 'left'
              ? 'left-6'
              : pageSide === 'right'
              ? 'right-6'
              : 'left-1/2 -translate-x-1/2'
          }`}
        >
          — {page.pageNumber} —
        </div>
      )}
    </div>
  );
};
