import React, { useRef } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { useToastStore } from '../../stores/useToastStore';
import { db } from '../../services/database/db';
import { isSupportedImageFile, processImageFile } from '../../services/image/imageService';
import { AVAILABLE_FONTS, PAPER_COLOR_SWATCHES } from '../../utils/constants';
import { BackgroundPattern, PageBorderStyle, StoredPhoto, TEXT_BOX_MAX_CHARS, TextFrameStyle } from '../../types';
import { TEXT_FRAME_DEFAULTS, TEXT_FRAME_STYLES } from '../../features/text/textFrames';
import { useI18n } from '../../i18n';
import {
  Sliders,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageOff,
  Upload,
} from 'lucide-react';

export const EditorRightProperties: React.FC = () => {
  const { t } = useI18n();
  const { addToast } = useToastStore();
  const replacePhotoInputRef = useRef<HTMLInputElement>(null);
  const {
    album,
    activePageIndex,
    selectedType,
    selectedId,
    updatePhotoSlot,
    assignPhotoToSlot,
    deletePhotoSlot,
    updateTextElement,
    deleteTextElement,
    updateStickerElement,
    deleteStickerElement,
    shiftElementLayer,
    updatePageBackground,
    updateCover,
  } = useEditorStore();

  if (!album) return null;

  const activePage = activePageIndex >= 0 ? album.pages[activePageIndex] : null;
  const selectedPhoto = activePage?.photoSlots.find((s) => s.id === selectedId);
  const selectedText = activePage?.textElements.find((txt) => txt.id === selectedId);
  const selectedSticker = activePage?.stickers.find((stk) => stk.id === selectedId);

  const handleUploadIntoSelectedSlot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      addToast(t.common.toastUnsupportedFile, 'error');
      return;
    }
    try {
      const processed = await processImageFile(file);
      const newRecord: StoredPhoto = {
        id: `photo-${album.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        albumId: album.id,
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        width: processed.width,
        height: processed.height,
        size: file.size,
        originalBlob: processed.originalBlob,
        thumbnailDataUrl: processed.thumbnailDataUrl,
        createdAt: new Date().toISOString(),
      };
      await db.photos.put(newRecord);
      if (activePageIndex === -1) {
        updateCover({ coverPhotoId: newRecord.id });
      } else if (selectedPhoto) {
        assignPhotoToSlot(selectedPhoto.id, newRecord.id);
      }
      addToast(t.common.toastPhotosUploaded.replace('{count}', '1'), 'success');
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 bg-ivory border-l border-beige flex flex-col h-full overflow-y-auto p-4 space-y-5 shrink-0">
      <div className="flex items-center gap-2 pb-3 border-b border-beige">
        <Sliders className="w-4 h-4 text-terracotta" />
        <h3 className="font-serif font-semibold text-lg text-charcoal">{t.editor.properties.title}</h3>
      </div>

      {/* ================= PHOTO SLOT PROPERTIES ================= */}
      {selectedType === 'photo' && selectedPhoto && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-terracotta">
              {t.editor.properties.photoSection}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title={t.editor.canvas.bringForward}
                onClick={() => shiftElementLayer('photo', selectedPhoto.id, 'up')}
                className="p-1.5 rounded border border-beige bg-white hover:bg-cream"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title={t.editor.canvas.sendBackward}
                onClick={() => shiftElementLayer('photo', selectedPhoto.id, 'down')}
                className="p-1.5 rounded border border-beige bg-white hover:bg-cream"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              {selectedPhoto.photoId && (
                <button
                  type="button"
                  title={t.editor.canvas.removePhotoFromSlot}
                  onClick={() => assignPhotoToSlot(selectedPhoto.id, null)}
                  className="p-1.5 rounded border border-beige bg-white hover:bg-amber-50 text-amber-800"
                >
                  <ImageOff className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                title={t.editor.canvas.deleteElement}
                onClick={() => deletePhotoSlot(selectedPhoto.id)}
                className="p-1.5 rounded border border-beige bg-white hover:bg-red-50 text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Direct Upload / Replace Photo Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                if (replacePhotoInputRef.current) {
                  replacePhotoInputRef.current.value = '';
                  replacePhotoInputRef.current.click();
                }
              }}
              className="w-full py-2 px-3 rounded-lg bg-terracotta hover:bg-charcoal text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {selectedPhoto.photoId
                  ? t.editor.canvas.replacePhoto
                  : t.editor.photos.uploadBtn}
              </span>
            </button>
            <input
              ref={replacePhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUploadIntoSelectedSlot}
              className="hidden"
            />
          </div>

          {/* Dimensions & Position */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-charcoal/65 mb-1">
                {t.editor.properties.width}
              </label>
              <input
                type="number"
                min={8}
                max={100}
                value={Math.round(selectedPhoto.width)}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { width: Number(e.target.value) }, true)
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige"
              />
            </div>
            <div>
              <label className="block text-[11px] text-charcoal/65 mb-1">
                {t.editor.properties.height}
              </label>
              <input
                type="number"
                min={8}
                max={100}
                value={Math.round(selectedPhoto.height)}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { height: Number(e.target.value) }, true)
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige"
              />
            </div>
          </div>

          {/* Rotation & Opacity */}
          <div className="space-y-3 pt-2 border-t border-beige/60">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-charcoal/70">{t.editor.properties.rotation}</span>
                <span className="font-medium">{selectedPhoto.rotation}°</span>
              </div>
              <input
                type="range"
                min={-30}
                max={30}
                step={0.5}
                value={selectedPhoto.rotation}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { rotation: Number(e.target.value) }, false)
                }
                className="w-full accent-terracotta"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-charcoal/70">{t.editor.properties.opacity}</span>
                <span className="font-medium">{Math.round(selectedPhoto.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={selectedPhoto.opacity}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { opacity: Number(e.target.value) }, false)
                }
                className="w-full accent-terracotta"
              />
            </div>
          </div>

          {/* Fit Mode & Crop Controls */}
          <div className="space-y-3 pt-2 border-t border-beige/60">
            <div>
              <label className="block text-charcoal/70 mb-1.5">{t.editor.properties.fitMode}</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updatePhotoSlot(selectedPhoto.id, { fitMode: 'cover' }, true)}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium ${
                    selectedPhoto.fitMode === 'cover'
                      ? 'bg-charcoal text-ivory border-charcoal'
                      : 'bg-white text-charcoal border-beige'
                  }`}
                >
                  {t.editor.properties.fitCover}
                </button>
                <button
                  type="button"
                  onClick={() => updatePhotoSlot(selectedPhoto.id, { fitMode: 'contain' }, true)}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium ${
                    selectedPhoto.fitMode === 'contain'
                      ? 'bg-charcoal text-ivory border-charcoal'
                      : 'bg-white text-charcoal border-beige'
                  }`}
                >
                  {t.editor.properties.fitContain}
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-charcoal/70">{t.editor.properties.cropZoom}</span>
                <span className="font-medium">{selectedPhoto.cropZoom.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.05}
                value={selectedPhoto.cropZoom}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { cropZoom: Number(e.target.value) }, false)
                }
                className="w-full accent-terracotta"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-charcoal/65 mb-1">
                  {t.editor.properties.cropPanX}
                </span>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={selectedPhoto.cropX}
                  onChange={(e) =>
                    updatePhotoSlot(selectedPhoto.id, { cropX: Number(e.target.value) }, false)
                  }
                  className="w-full accent-terracotta"
                />
              </div>
              <div>
                <span className="block text-[11px] text-charcoal/65 mb-1">
                  {t.editor.properties.cropPanY}
                </span>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={selectedPhoto.cropY}
                  onChange={(e) =>
                    updatePhotoSlot(selectedPhoto.id, { cropY: Number(e.target.value) }, false)
                  }
                  className="w-full accent-terracotta"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                updatePhotoSlot(
                  selectedPhoto.id,
                  { cropZoom: 1, cropX: 0, cropY: 0, rotation: 0 },
                  true
                )
              }
              className="inline-flex items-center gap-1 text-[11px] text-terracotta hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.editor.properties.resetCrop}</span>
            </button>
          </div>

          {/* Borders, Corner Radius & Shadow */}
          <div className="space-y-3 pt-2 border-t border-beige/60">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-charcoal/70">{t.editor.properties.borderWidth}</span>
                <span>{selectedPhoto.borderWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={selectedPhoto.borderWidth}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { borderWidth: Number(e.target.value) }, false)
                }
                className="w-full accent-terracotta"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-charcoal/70">{t.editor.properties.cornerRadius}</span>
                <span>{selectedPhoto.cornerRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={selectedPhoto.cornerRadius}
                onChange={(e) =>
                  updatePhotoSlot(selectedPhoto.id, { cornerRadius: Number(e.target.value) }, false)
                }
                className="w-full accent-terracotta"
              />
            </div>

            <div>
              <label className="block text-charcoal/70 mb-1">{t.editor.properties.shadowStyle}</label>
              <select
                value={selectedPhoto.shadow}
                onChange={(e) =>
                  updatePhotoSlot(
                    selectedPhoto.id,
                    { shadow: e.target.value as typeof selectedPhoto.shadow },
                    true
                  )
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
              >
                <option value="none">{t.editor.properties.shadowNone}</option>
                <option value="soft">{t.editor.properties.shadowSoft}</option>
                <option value="polaroid">{t.editor.properties.shadowPolaroid}</option>
                <option value="deep">{t.editor.properties.shadowDeep}</option>
              </select>
            </div>

            {selectedPhoto.shadow === 'polaroid' && (
              <div>
                <label className="block text-charcoal/70 mb-1">
                  {t.editor.properties.polaroidCaption}
                </label>
                <input
                  type="text"
                  value={selectedPhoto.polaroidCaption || ''}
                  onChange={(e) =>
                    updatePhotoSlot(
                      selectedPhoto.id,
                      { polaroidCaption: e.target.value },
                      false
                    )
                  }
                  placeholder="Sweet moment..."
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TEXT ELEMENT PROPERTIES ================= */}
      {selectedType === 'text' && selectedText && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-terracotta">
              {t.editor.properties.textSection}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftElementLayer('text', selectedText.id, 'up')}
                className="p-1.5 rounded border border-beige bg-white hover:bg-cream"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftElementLayer('text', selectedText.id, 'down')}
                className="p-1.5 rounded border border-beige bg-white hover:bg-cream"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteTextElement(selectedText.id)}
                className="p-1.5 rounded border border-beige bg-white hover:bg-red-50 text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-charcoal/70 mb-1">{t.editor.properties.textContent}</label>
            <textarea
              rows={4}
              maxLength={TEXT_BOX_MAX_CHARS}
              value={selectedText.content}
              onChange={(e) =>
                updateTextElement(
                  selectedText.id,
                  { content: e.target.value.slice(0, TEXT_BOX_MAX_CHARS) },
                  false
                )
              }
              className="w-full px-2.5 py-2 rounded bg-white border border-beige outline-none resize-none"
            />
            <div
              className={`text-right text-[10.5px] mt-0.5 ${
                selectedText.content.length >= TEXT_BOX_MAX_CHARS ? 'text-red-700 font-semibold' : 'text-charcoal/55'
              }`}
            >
              {t.editor.text.charCount
                .replace('{count}', String(selectedText.content.length))
                .replace('{max}', String(TEXT_BOX_MAX_CHARS))}
            </div>
          </div>

          {/* Text Frame (Box) Style */}
          <div className="space-y-2 p-2.5 rounded-lg bg-cream/60 border border-beige">
            <label className="block text-charcoal/70 font-medium">{t.editor.text.frameStyle}</label>
            <select
              value={selectedText.frameStyle || 'none'}
              onChange={(e) => {
                const frame = e.target.value as TextFrameStyle;
                const d = TEXT_FRAME_DEFAULTS[frame];
                updateTextElement(
                  selectedText.id,
                  { frameStyle: frame, frameBg: d.bg, frameBorderColor: d.border },
                  true
                );
              }}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
            >
              {TEXT_FRAME_STYLES.map((f) => (
                <option key={f} value={f}>
                  {t.editor.text.frames[f]}
                </option>
              ))}
            </select>
            {selectedText.frameStyle && selectedText.frameStyle !== 'none' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] text-charcoal/65 mb-1">{t.editor.text.frameBg}</span>
                  <input
                    type="color"
                    value={
                      (selectedText.frameBg || '').startsWith('#')
                        ? selectedText.frameBg
                        : '#FFFFFF'
                    }
                    onChange={(e) =>
                      updateTextElement(selectedText.id, { frameBg: e.target.value }, false)
                    }
                    className="w-full h-8 rounded bg-white border border-beige cursor-pointer"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-charcoal/65 mb-1">{t.editor.text.frameBorder}</span>
                  <input
                    type="color"
                    value={
                      (selectedText.frameBorderColor || '').startsWith('#')
                        ? selectedText.frameBorderColor
                        : '#C5A059'
                    }
                    onChange={(e) =>
                      updateTextElement(selectedText.id, { frameBorderColor: e.target.value }, false)
                    }
                    className="w-full h-8 rounded bg-white border border-beige cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-charcoal/70 mb-1">{t.editor.properties.fontFamily}</label>
            <select
              value={selectedText.fontFamily}
              onChange={(e) =>
                updateTextElement(selectedText.id, { fontFamily: e.target.value }, true)
              }
              className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-charcoal/70 mb-1">{t.editor.properties.fontSize}</label>
              <input
                type="number"
                min={10}
                max={72}
                value={selectedText.fontSize}
                onChange={(e) =>
                  updateTextElement(selectedText.id, { fontSize: Number(e.target.value) }, true)
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige"
              />
            </div>
            <div>
              <label className="block text-charcoal/70 mb-1">{t.editor.properties.textColor}</label>
              <input
                type="color"
                value={selectedText.color}
                onChange={(e) =>
                  updateTextElement(selectedText.id, { color: e.target.value }, false)
                }
                className="w-full h-8 rounded bg-white border border-beige cursor-pointer"
              />
            </div>
          </div>

          {/* Font style, weight & alignment */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center bg-cream p-1 rounded border border-beige">
              <button
                type="button"
                onClick={() =>
                  updateTextElement(
                    selectedText.id,
                    { fontWeight: selectedText.fontWeight === 'bold' ? 'normal' : 'bold' },
                    true
                  )
                }
                className={`px-2.5 py-1 rounded font-bold ${
                  selectedText.fontWeight === 'bold' ? 'bg-charcoal text-ivory' : ''
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextElement(
                    selectedText.id,
                    { fontStyle: selectedText.fontStyle === 'italic' ? 'normal' : 'italic' },
                    true
                  )
                }
                className={`px-2.5 py-1 rounded italic font-serif ${
                  selectedText.fontStyle === 'italic' ? 'bg-charcoal text-ivory' : ''
                }`}
              >
                I
              </button>
            </div>

            <div className="flex items-center bg-cream p-1 rounded border border-beige">
              {(
                [
                  { align: 'left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                  { align: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                  { align: 'right', icon: <AlignRight className="w-3.5 h-3.5" /> },
                ] as const
              ).map((a) => (
                <button
                  key={a.align}
                  type="button"
                  onClick={() =>
                    updateTextElement(selectedText.id, { textAlign: a.align }, true)
                  }
                  className={`p-1.5 rounded ${
                    selectedText.textAlign === a.align ? 'bg-charcoal text-ivory' : ''
                  }`}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-charcoal/70">{t.editor.properties.rotation}</span>
              <span>{selectedText.rotation}°</span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              value={selectedText.rotation}
              onChange={(e) =>
                updateTextElement(selectedText.id, { rotation: Number(e.target.value) }, false)
              }
              className="w-full accent-terracotta"
            />
          </div>
        </div>
      )}

      {/* ================= STICKER ELEMENT PROPERTIES ================= */}
      {selectedType === 'sticker' && selectedSticker && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-terracotta">
              {t.editor.properties.stickerSection}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftElementLayer('sticker', selectedSticker.id, 'up')}
                className="p-1.5 rounded border border-beige bg-white hover:bg-cream"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftElementLayer('sticker', selectedSticker.id, 'down')}
                className="p-1.5 rounded border border-beige bg-white hover:bg-cream"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteStickerElement(selectedSticker.id)}
                className="p-1.5 rounded border border-beige bg-white hover:bg-red-50 text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectedSticker.label !== undefined && (
            <div>
              <label className="block text-charcoal/70 mb-1">
                {t.editor.properties.stickerLabel}
              </label>
              <input
                type="text"
                value={selectedSticker.label}
                onChange={(e) =>
                  updateStickerElement(selectedSticker.id, { label: e.target.value }, false)
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-charcoal/70 mb-1">
              {t.editor.properties.stickerColor}
            </label>
            <input
              type="color"
              value={selectedSticker.color || '#9C7560'}
              onChange={(e) =>
                updateStickerElement(selectedSticker.id, { color: e.target.value }, false)
              }
              className="w-full h-8 rounded bg-white border border-beige cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-charcoal/70 mb-1">{t.editor.properties.width}</label>
              <input
                type="number"
                min={5}
                max={75}
                value={Math.round(selectedSticker.width)}
                onChange={(e) =>
                  updateStickerElement(
                    selectedSticker.id,
                    { width: Number(e.target.value) },
                    true
                  )
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige"
              />
            </div>
            <div>
              <label className="block text-charcoal/70 mb-1">{t.editor.properties.height}</label>
              <input
                type="number"
                min={4}
                max={75}
                value={Math.round(selectedSticker.height)}
                onChange={(e) =>
                  updateStickerElement(
                    selectedSticker.id,
                    { height: Number(e.target.value) },
                    true
                  )
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-beige"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-charcoal/70">{t.editor.properties.rotation}</span>
              <span>{selectedSticker.rotation}°</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={selectedSticker.rotation}
              onChange={(e) =>
                updateStickerElement(selectedSticker.id, { rotation: Number(e.target.value) }, false)
              }
              className="w-full accent-terracotta"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-charcoal/70">{t.editor.properties.opacity}</span>
              <span>{Math.round(selectedSticker.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={selectedSticker.opacity}
              onChange={(e) =>
                updateStickerElement(selectedSticker.id, { opacity: Number(e.target.value) }, false)
              }
              className="w-full accent-terracotta"
            />
          </div>
        </div>
      )}

      {/* ================= HARDCOVER INSPECTOR ================= */}
      {activePageIndex === -1 && (
        <div className="space-y-4 text-xs">
          <div className="font-semibold uppercase tracking-wider text-terracotta">
            {t.editor.cover.customizeCover}
          </div>

          <div className="space-y-2">
            <label className="block text-charcoal/70 font-medium">{t.wizard.coverPhoto}</label>
            <button
              type="button"
              onClick={() => {
                if (replacePhotoInputRef.current) {
                  replacePhotoInputRef.current.value = '';
                  replacePhotoInputRef.current.click();
                }
              }}
              className="w-full py-2.5 px-3 rounded-lg bg-terracotta hover:bg-charcoal text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {album.cover.coverPhotoId ? t.wizard.changeCover : t.wizard.uploadCover}
              </span>
            </button>

            {album.cover.coverPhotoId && (
              <button
                type="button"
                onClick={() => updateCover({ coverPhotoId: null })}
                className="w-full py-2 px-3 rounded-lg border border-beige bg-white hover:bg-red-50 text-red-700 font-medium text-xs transition-colors"
              >
                {t.wizard.removeCover}
              </button>
            )}

            <input
              ref={replacePhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUploadIntoSelectedSlot}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-charcoal/70 mb-1">{t.editor.cover.coverTitle}</label>
            <input
              type="text"
              value={album.cover.title}
              onChange={(e) => updateCover({ title: e.target.value }, false)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
            />
          </div>

          <div>
            <label className="block text-charcoal/70 mb-1">{t.editor.cover.coverSubtitle}</label>
            <input
              type="text"
              value={album.cover.subtitle}
              onChange={(e) => updateCover({ subtitle: e.target.value }, false)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-beige outline-none"
            />
          </div>
        </div>
      )}

      {/* ================= PAGE DEFAULT INSPECTOR ================= */}
      {activePageIndex >= 0 &&
        (selectedType === 'page' || (!selectedPhoto && !selectedText && !selectedSticker)) &&
        activePage && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-cream/60 border border-beige space-y-1">
              <div className="font-semibold text-charcoal">
                {t.editor.properties.nothingSelected}
              </div>
              <p className="text-[11px] text-charcoal/65 leading-relaxed">
                {t.editor.properties.nothingSelectedHint}
              </p>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                {t.editor.backgrounds.solidColors}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PAPER_COLOR_SWATCHES.slice(0, 8).map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    onClick={() => updatePageBackground({ backgroundColor: sw.color }, false)}
                    style={{ backgroundColor: sw.color }}
                    className={`h-7 rounded border ${
                      activePage.backgroundColor === sw.color
                        ? 'border-terracotta ring-2 ring-terracotta/30'
                        : 'border-beige'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-charcoal/70 mb-1.5">
                {t.editor.backgrounds.paperTextures}
              </label>
              <select
                value={activePage.backgroundPattern}
                onChange={(e) =>
                  updatePageBackground(
                    { backgroundPattern: e.target.value as BackgroundPattern },
                    false
                  )
                }
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-beige outline-none"
              >
                {(
                  ['none', 'subtle', 'linen', 'vintage', 'floral', 'dots', 'grid'] as BackgroundPattern[]
                ).map((pat) => (
                  <option key={pat} value={pat}>
                    {t.editor.backgrounds.patterns[pat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-charcoal/70 mb-1.5">
                {t.editor.backgrounds.pageBorders}
              </label>
              <select
                value={activePage.borderStyle || 'none'}
                onChange={(e) =>
                  updatePageBackground(
                    { borderStyle: e.target.value as PageBorderStyle },
                    false
                  )
                }
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-beige outline-none"
              >
                {(
                  [
                    'none',
                    'double-gold',
                    'botanical-corners',
                    'vintage-filigree',
                    'minimal-editorial',
                    'romantic-arch',
                    'postCard-frame',
                    'dotted-stitch',
                  ] as PageBorderStyle[]
                ).map((bStyle) => (
                  <option key={bStyle} value={bStyle}>
                    {t.editor.backgrounds.borders[bStyle]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
    </aside>
  );
};
