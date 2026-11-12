import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlbumPage,
  BackgroundPattern,
  PageBorderStyle,
  PredefinedLayout,
  StickerCategory,
  StoredPhoto,
  TextElement,
} from '../../types';
import {
  TEXT_FRAME_DEFAULTS,
  TEXT_FRAME_STYLES,
  getTextFrameWrapperStyle,
  renderTextFrameOrnaments,
} from '../../features/text/textFrames';
import { useEditorStore } from '../../stores/useEditorStore';
import {
  AVAILABLE_FONTS,
  HARDCOVER_COLOR_SWATCHES,
  PAPER_COLOR_SWATCHES,
  PREDEFINED_LAYOUTS,
  THEME_PRESETS,
} from '../../utils/constants';
import { STICKER_PRESETS, renderStickerSvg } from '../../features/stickers/stickerAssets';
import { isSupportedImageFile, processImageFile } from '../../services/image/imageService';
import { db } from '../../services/database/db';
import { useI18n } from '../../i18n';
import { useToastStore } from '../../stores/useToastStore';
import { PageSurfaceRenderer } from '../book/PageSurfaceRenderer';
import {
  Layers,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  Sparkles,
  Type,
  BookMarked,
  Plus,
  Copy,
  Trash2,
  GripVertical,
  Upload,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';

export type LeftSidebarTab =
  | 'pages'
  | 'photos'
  | 'layouts'
  | 'backgrounds'
  | 'stickers'
  | 'text'
  | 'cover';

interface SortablePageThumbProps {
  page: AlbumPage;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  pageLabel: string;
}

const SortablePageThumb: React.FC<SortablePageThumbProps> = React.memo(({
  page,
  index,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
  pageLabel,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: page.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
        isActive
          ? 'border-terracotta bg-cream/90 ring-1 ring-terracotta shadow-xs'
          : 'border-beige bg-white hover:bg-cream/50'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-charcoal/40 hover:text-charcoal cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Lightweight vector schematic preview — zero heavy image decoding overhead */}
      <div
        style={{ backgroundColor: page.backgroundColor || '#F8F5F0' }}
        className="w-14 h-11 border border-beige rounded overflow-hidden shadow-xs shrink-0 relative pointer-events-none"
      >
        {page.photoSlots.map((s) => (
          <div
            key={s.id}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.width}%`,
              height: `${s.height}%`,
            }}
            className={`absolute rounded-[1px] border border-white/70 ${
              s.photoId ? 'bg-terracotta/65' : 'bg-taupe/35'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-charcoal">
          {pageLabel} {index + 1}
        </div>
        <div className="text-[11px] text-charcoal/55 mt-0.5">
          {page.photoSlots.filter((s) => s.photoId).length}/{page.photoSlots.length} photos
        </div>
      </div>

      <div className="flex flex-col gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 rounded hover:bg-beige/60 text-charcoal/70 hover:text-charcoal"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-red-100 text-red-700/75 hover:text-red-700"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

interface EditorLeftSidebarProps {
  activeTab: LeftSidebarTab;
  setActiveTab: (tab: LeftSidebarTab) => void;
  photos: StoredPhoto[];
  photoUrls: Record<string, string>;
  assignTargetSlotId: string | null;
  setAssignTargetSlotId: (slotId: string | null) => void;
}

export const EditorLeftSidebar: React.FC<EditorLeftSidebarProps> = ({
  activeTab,
  setActiveTab,
  photos,
  photoUrls,
  assignTargetSlotId,
  setAssignTargetSlotId,
}) => {
  const { lang, t } = useI18n();
  const { addToast } = useToastStore();

  const {
    album,
    activePageIndex,
    setActivePageIndex,
    addPage,
    duplicatePage,
    deletePage,
    reorderPages,
    applyLayoutToActivePage,
    addExtraPhotoSlotToActivePage,
    assignPhotoToSlot,
    autoAssignPhotoToEmptySlot,
    updatePageBackground,
    addStickerElement,
    addTextElement,
    updateCover,
    changeAlbumTheme,
  } = useEditorStore();

  const [photoSearch, setPhotoSearch] = useState('');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [layoutFilterCount, setLayoutFilterCount] = useState<number | 'all'>('all');
  const [stickerCat, setStickerCat] = useState<StickerCategory>('ribbons');
  const [pendingOverflowLayout, setPendingOverflowLayout] = useState<{
    layout: PredefinedLayout;
    currentCount: number;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Compute set of used photo IDs across the album
  const usedPhotoIds = useMemo(() => {
    const set = new Set<string>();
    if (!album) return set;
    if (album.cover.coverPhotoId) set.add(album.cover.coverPhotoId);
    for (const p of album.pages) {
      for (const s of p.photoSlots) {
        if (s.photoId) set.add(s.photoId);
      }
    }
    return set;
  }, [album]);

  if (!album) return null;

  const activePage = activePageIndex >= 0 ? album.pages[activePageIndex] : album.pages[0];

  const handleDragEndPages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = album.pages.findIndex((p) => p.id === active.id);
    const newIndex = album.pages.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderPages(oldIndex, newIndex);
    }
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = new Date().toISOString();
    const newRecords: StoredPhoto[] = [];
    let unsupportedCount = 0;

    for (const file of Array.from(files)) {
      if (!isSupportedImageFile(file)) {
        unsupportedCount++;
        continue;
      }
      try {
        const processed = await processImageFile(file);
        newRecords.push({
          id: `photo-${album.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          albumId: album.id,
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          width: processed.width,
          height: processed.height,
          size: file.size,
          originalBlob: processed.originalBlob,
          thumbnailDataUrl: processed.thumbnailDataUrl,
          createdAt: now,
        });
      } catch (e) {
        console.error('Failed to process uploaded image:', e);
      }
    }

    if (unsupportedCount > 0) {
      addToast(t.common.toastUnsupportedFile, 'error');
    }
    if (newRecords.length > 0) {
      await db.photos.bulkPut(newRecords);
      addToast(t.common.toastPhotosUploaded.replace('{count}', String(newRecords.length)), 'success');
      if (activePageIndex === -1 && newRecords[0]) {
        updateCover({ coverPhotoId: newRecords[0].id });
      } else if (assignTargetSlotId && newRecords[0]) {
        assignPhotoToSlot(assignTargetSlotId, newRecords[0].id);
        setAssignTargetSlotId(null);
      }
    }
  };

  const handleUploadCoverPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      addToast(t.common.toastUnsupportedFile, 'error');
      return;
    }
    try {
      const processed = await processImageFile(file);
      const newRecord: StoredPhoto = {
        id: `photo-cover-${album.id}-${Date.now()}`,
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
      updateCover({ coverPhotoId: newRecord.id });
      addToast(t.common.toastPhotosUploaded.replace('{count}', '1'), 'success');
    } catch (err) {
      console.error('Failed to upload cover photo:', err);
    }
  };

  const handleDeletePhotoFromLibrary = async (photoId: string) => {
    await db.photos.delete(photoId);
    // Also remove from any slots using it
    for (const p of album.pages) {
      for (const s of p.photoSlots) {
        if (s.photoId === photoId) {
          assignPhotoToSlot(s.id, null);
        }
      }
    }
  };

  const handleSelectLayout = (layout: PredefinedLayout) => {
    if (activePageIndex < 0) {
      setActivePageIndex(0);
    }
    const page = album.pages[Math.max(0, activePageIndex)];
    const currentPhotosCount = page.photoSlots.filter((s) => Boolean(s.photoId)).length;

    if (currentPhotosCount > layout.slots.length) {
      setPendingOverflowLayout({ layout, currentCount: currentPhotosCount });
    } else {
      applyLayoutToActivePage(layout, 'move-next');
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (photoSearch.trim() && !p.name.toLowerCase().includes(photoSearch.toLowerCase())) {
      return false;
    }
    const isUsed = usedPhotoIds.has(p.id);
    if (photoFilter === 'used') return isUsed;
    if (photoFilter === 'unused') return !isUsed;
    return true;
  });

  const filteredLayouts = PREDEFINED_LAYOUTS.filter((l) =>
    layoutFilterCount === 'all' ? true : l.photoCount === layoutFilterCount
  );

  const navItems: Array<{ id: LeftSidebarTab; label: string; icon: React.ReactNode }> = [
    { id: 'pages', label: t.editor.tabs.pages, icon: <Layers className="w-4 h-4" /> },
    { id: 'photos', label: t.editor.tabs.photos, icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'layouts', label: t.editor.tabs.layouts, icon: <LayoutTemplate className="w-4 h-4" /> },
    { id: 'backgrounds', label: t.editor.tabs.backgrounds, icon: <Palette className="w-4 h-4" /> },
    { id: 'stickers', label: t.editor.tabs.stickers, icon: <Sparkles className="w-4 h-4" /> },
    { id: 'text', label: t.editor.tabs.text, icon: <Type className="w-4 h-4" /> },
    { id: 'cover', label: t.editor.tabs.cover, icon: <BookMarked className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-80 md:w-88 lg:w-96 bg-ivory border-r border-beige flex flex-row h-full overflow-hidden shrink-0">
      {/* Vertical Icon Rail */}
      <div className="w-16 bg-cream/70 border-r border-beige flex flex-col items-center justify-start py-4 gap-1.5 overflow-y-auto shrink-0">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'cover') {
                  setActivePageIndex(-1);
                } else if (activePageIndex === -1) {
                  setActivePageIndex(0);
                }
              }}
              className={`flex flex-col items-center justify-center w-13 py-2 px-1 rounded-xl text-[10px] font-medium transition-all shrink-0 ${
                active
                  ? 'bg-charcoal text-ivory shadow-xs'
                  : 'text-charcoal/65 hover:text-charcoal hover:bg-beige/50'
              }`}
            >
              {item.icon}
              <span className="mt-1 text-center leading-tight line-clamp-1">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Drawer Content */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto p-4 space-y-4">
        {/* ==================== TAB 1: PAGES ==================== */}
        {activeTab === 'pages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-semibold text-lg text-charcoal">
                {t.editor.tabs.pages} ({album.pages.length})
              </h3>
              <button
                type="button"
                onClick={() => addPage()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-charcoal text-ivory hover:bg-terracotta text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.editor.pages.addPage}</span>
              </button>
            </div>

            {/* Cover Selector Button */}
            <button
              type="button"
              onClick={() => setActivePageIndex(-1)}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                activePageIndex === -1
                  ? 'border-terracotta bg-cream ring-1 ring-terracotta'
                  : 'border-beige bg-white hover:bg-cream/50'
              }`}
            >
              <div
                className="w-8 h-10 rounded-r border border-black/20 flex items-center justify-center text-white text-[9px] font-serif"
                style={{ backgroundColor: album.cover.backgroundColor }}
              >
                COVER
              </div>
              <div>
                <div className="text-xs font-semibold text-charcoal">{t.viewer.frontCover}</div>
                <div className="text-[11px] text-charcoal/55">{album.cover.title}</div>
              </div>
            </button>

            <p className="text-[11px] text-charcoal/55">{t.editor.pages.dragToReorder}</p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndPages}
            >
              <SortableContext
                items={album.pages.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {album.pages.map((page, idx) => (
                    <SortablePageThumb
                      key={page.id}
                      page={page}
                      index={idx}
                      isActive={activePageIndex === idx}
                      pageLabel={t.editor.pages.pageLabel}
                      onSelect={() => setActivePageIndex(idx)}
                      onDuplicate={() => duplicatePage(idx)}
                      onDelete={() => {
                        const ok = deletePage(idx);
                        if (!ok) {
                          addToast(t.editor.pages.minPagesWarning, 'info');
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* ==================== TAB 2: PHOTOS ==================== */}
        {activeTab === 'photos' && (
          <div className="space-y-3">
            {/* Upload Dropzone */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleUploadPhotos(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-taupe/60 hover:border-terracotta rounded-xl bg-cream/50 hover:bg-cream cursor-pointer transition-colors text-center"
            >
              <Upload className="w-5 h-5 text-terracotta mb-1.5" />
              <span className="text-xs font-semibold text-charcoal">
                {t.editor.photos.uploadBtn}
              </span>
              <span className="text-[11px] text-charcoal/55 mt-0.5">
                {t.editor.photos.dropHint}
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleUploadPhotos(e.target.files)}
                className="hidden"
              />
            </label>

            {/* Search & Used Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-charcoal/45 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={photoSearch}
                  onChange={(e) => setPhotoSearch(e.target.value)}
                  placeholder={t.editor.photos.searchPhotos}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-beige text-xs outline-none focus:border-terracotta"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 bg-cream p-1 rounded-lg border border-beige text-[11px]">
                {(
                  [
                    { id: 'all', label: t.editor.photos.filterAll },
                    { id: 'used', label: t.editor.photos.filterUsed },
                    { id: 'unused', label: t.editor.photos.filterUnused },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPhotoFilter(f.id)}
                    className={`py-1 rounded font-medium transition-colors ${
                      photoFilter === f.id
                        ? 'bg-charcoal text-ivory'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-charcoal/60 leading-snug">
              {t.editor.photos.dragToFrameHint}
            </p>

            {/* Photo Thumbnails Grid */}
            {filteredPhotos.length === 0 ? (
              <div className="py-10 text-center text-xs text-charcoal/55">
                {t.editor.photos.emptyLibrary}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredPhotos.map((photo) => {
                  const isUsed = usedPhotoIds.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/memoria-photo-id', photo.id);
                      }}
                      onClick={() => {
                        if (activePageIndex === -1) {
                          updateCover({ coverPhotoId: photo.id });
                          return;
                        }
                        if (assignTargetSlotId) {
                          assignPhotoToSlot(assignTargetSlotId, photo.id);
                          setAssignTargetSlotId(null);
                        } else {
                          const assigned = autoAssignPhotoToEmptySlot(photo.id);
                          if (!assigned) {
                            addExtraPhotoSlotToActivePage(photo.id);
                          }
                        }
                      }}
                      className="group relative aspect-4/3 rounded-lg overflow-hidden border border-beige bg-cream cursor-grab active:cursor-grabbing shadow-xs hover:ring-2 hover:ring-terracotta"
                    >
                      <img
                        src={photo.thumbnailDataUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                      {isUsed && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-charcoal/80 text-ivory text-[9px] font-medium flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 text-gold" />
                          {t.editor.photos.usedBadge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhotoFromLibrary(photo.id);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-700 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: LAYOUTS (4-8 PHOTOS) ==================== */}
        {activeTab === 'layouts' && (
          <div className="space-y-3">
            <h3 className="font-serif font-semibold text-lg text-charcoal">
              {t.editor.layouts.title}
            </h3>

            {/* Filter by 4, 5, 6, 7, 8 */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setLayoutFilterCount('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                  layoutFilterCount === 'all'
                    ? 'bg-charcoal text-ivory border-charcoal'
                    : 'bg-white text-charcoal border-beige'
                }`}
              >
                {t.editor.layouts.allCounts}
              </button>
              {[4, 5, 6, 7, 8].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setLayoutFilterCount(cnt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    layoutFilterCount === cnt
                      ? 'bg-charcoal text-ivory border-charcoal'
                      : 'bg-white text-charcoal border-beige'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>

            {/* Layout Cards */}
            <div className="grid grid-cols-1 gap-2.5">
              {filteredLayouts.map((layout) => {
                const isCurrent = activePage?.layoutId === layout.id;
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => handleSelectLayout(layout)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isCurrent
                        ? 'border-terracotta bg-cream ring-1 ring-terracotta'
                        : 'border-beige bg-white hover:bg-cream/50'
                    }`}
                  >
                    {/* Mini schematic preview */}
                    <div className="w-16 h-12 bg-ivory border border-beige rounded relative shrink-0 overflow-hidden">
                      {layout.slots.map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            width: `${s.width}%`,
                            height: `${s.height}%`,
                          }}
                          className="absolute bg-taupe/55 border border-ivory"
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-charcoal truncate">
                        {lang === 'vi' ? layout.nameVi : layout.nameEn}
                      </div>
                      <div className="text-[11px] text-terracotta font-medium mt-0.5">
                        {layout.photoCount} {t.editor.layouts.photosUnit}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => addExtraPhotoSlotToActivePage(null)}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-terracotta text-terracotta hover:bg-cream text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.editor.layouts.addCustomSlot}</span>
            </button>
          </div>
        )}

        {/* ==================== TAB 4: BACKGROUNDS & PAPER ==================== */}
        {activeTab === 'backgrounds' && activePage && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                {t.editor.backgrounds.solidColors}
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {PAPER_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    onClick={() => updatePageBackground({ backgroundColor: sw.color }, false)}
                    title={sw.name}
                    style={{ backgroundColor: sw.color }}
                    className={`h-9 rounded-lg border transition-transform ${
                      activePage.backgroundColor === sw.color
                        ? 'scale-105 border-terracotta ring-2 ring-terracotta/30'
                        : 'border-beige'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                {t.editor.backgrounds.paperTextures}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {(
                  ['none', 'subtle', 'linen', 'vintage', 'floral', 'dots', 'grid'] as BackgroundPattern[]
                ).map((pat) => (
                  <button
                    key={pat}
                    type="button"
                    onClick={() => updatePageBackground({ backgroundPattern: pat }, false)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium text-left flex items-center justify-between ${
                      activePage.backgroundPattern === pat
                        ? 'border-terracotta bg-cream text-charcoal font-semibold'
                        : 'border-beige bg-white text-charcoal/80 hover:bg-cream/40'
                    }`}
                  >
                    <span>{t.editor.backgrounds.patterns[pat]}</span>
                    {activePage.backgroundPattern === pat && (
                      <Check className="w-3.5 h-3.5 text-terracotta" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                {t.editor.backgrounds.pageBorders}
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
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
                ).map((bStyle) => {
                  const isCurrent = (activePage.borderStyle || 'none') === bStyle;
                  return (
                    <button
                      key={bStyle}
                      type="button"
                      onClick={() => updatePageBackground({ borderStyle: bStyle }, false)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'border-terracotta bg-cream text-charcoal font-semibold'
                          : 'border-beige bg-white text-charcoal/80 hover:bg-cream/40'
                      }`}
                    >
                      <span>{t.editor.backgrounds.borders[bStyle]}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-terracotta" />}
                    </button>
                  );
                })}
              </div>

              {activePage.borderStyle && activePage.borderStyle !== 'none' && (
                <div className="mt-3 flex items-center justify-between gap-2 bg-cream/60 p-2.5 rounded-lg border border-beige">
                  <span className="text-xs font-medium text-charcoal/80">
                    {t.editor.backgrounds.borderColor}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['#C5A059', '#9C7560', '#39332F', '#8A5D59', '#5E715B', '#B99B83'].map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updatePageBackground({ borderColor: c }, false)}
                          style={{ backgroundColor: c }}
                          className={`w-5 h-5 rounded-full border ${
                            (activePage.borderColor || '#C5A059') === c
                              ? 'scale-110 ring-2 ring-terracotta border-white'
                              : 'border-white/70'
                          }`}
                        />
                      )
                    )}
                    <input
                      type="color"
                      value={activePage.borderColor || '#C5A059'}
                      onChange={(e) =>
                        updatePageBackground({ borderColor: e.target.value }, false)
                      }
                      className="w-6 h-6 rounded border border-beige cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                updatePageBackground(
                  {
                    backgroundColor: activePage.backgroundColor,
                    backgroundPattern: activePage.backgroundPattern,
                    borderStyle: activePage.borderStyle || 'none',
                    borderColor: activePage.borderColor || '#C5A059',
                  },
                  true
                );
                addToast(t.common.toastAppliedBgAll, 'success');
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-charcoal text-ivory hover:bg-terracotta text-xs font-medium transition-colors"
            >
              {t.editor.backgrounds.applyToAllPages}
            </button>
          </div>
        )}

        {/* ==================== TAB 5: STICKERS & DECORATIONS ==================== */}
        {activeTab === 'stickers' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  'ribbons',
                  'flowers',
                  'tape',
                  'frames',
                  'stamps',
                  'illustrations',
                  'hearts',
                  'stars',
                  'shapes',
                ] as StickerCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setStickerCat(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    stickerCat === cat
                      ? 'bg-charcoal text-ivory border-charcoal'
                      : 'bg-white text-charcoal/75 border-beige hover:bg-cream'
                  }`}
                >
                  {t.editor.stickers.categories[cat]}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-charcoal/55">{t.editor.stickers.clickToAdd}</p>

            <div className="grid grid-cols-2 gap-2.5">
              {STICKER_PRESETS.filter((s) => s.category === stickerCat).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (activePageIndex < 0) setActivePageIndex(0);
                    addStickerElement({
                      stickerType: preset.id,
                      x: 36,
                      y: 36,
                      width: preset.defaultWidth,
                      height: preset.defaultHeight,
                      rotation: 0,
                      opacity: 0.95,
                      color: preset.defaultColor,
                      label: preset.defaultLabel,
                    });
                  }}
                  className="p-3 rounded-xl border border-beige bg-white hover:bg-cream/60 hover:border-terracotta flex flex-col items-center justify-between gap-2 transition-all group"
                >
                  <div className="w-20 h-14 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                    {renderStickerSvg(preset.id, preset.defaultColor, preset.defaultLabel)}
                  </div>
                  <span className="text-[11px] text-charcoal/80 font-medium line-clamp-1">
                    {lang === 'vi' ? preset.nameVi : preset.nameEn}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 6: TEXT & CAPTIONS ==================== */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            {/* Decorative Text Boxes */}
            <div className="space-y-2 pb-3 border-b border-beige">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal/70">
                {t.editor.text.textBoxTitle}
              </h4>
              <p className="text-[11px] text-charcoal/55 leading-snug">{t.editor.text.textBoxHint}</p>
              <div className="grid grid-cols-2 gap-2">
                {TEXT_FRAME_STYLES.filter((f) => f !== 'none').map((frame) => {
                  const d = TEXT_FRAME_DEFAULTS[frame];
                  const previewTxt = {
                    id: 'preview',
                    content: '',
                    frameStyle: frame,
                  } as TextElement;
                  return (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => {
                        if (activePageIndex < 0) setActivePageIndex(0);
                        addTextElement({
                          content: t.editor.text.textBoxDefault,
                          frameStyle: frame,
                          frameBg: d.bg,
                          frameBorderColor: d.border,
                          fontFamily: d.font,
                          fontSize: d.fontSize,
                          fontStyle: d.italic ? 'italic' : 'normal',
                          fontWeight: 'normal',
                          color: d.color,
                          textAlign: 'center',
                          letterSpacing: 0.3,
                          x: 22,
                          y: 38,
                          width: 56,
                        });
                      }}
                      className="p-2.5 rounded-xl border border-beige bg-cream/40 hover:bg-cream hover:border-terracotta transition-colors flex flex-col items-center gap-2"
                    >
                      <div className="w-full flex items-center justify-center py-1.5">
                        <div
                          className="relative w-[88%]"
                          style={getTextFrameWrapperStyle(previewTxt, 0.45)}
                        >
                          {renderTextFrameOrnaments(previewTxt, 0.45)}
                          <div
                            style={{
                              fontFamily: d.font,
                              color: d.color,
                              fontStyle: d.italic ? 'italic' : 'normal',
                            }}
                            className="text-[12px] text-center leading-tight truncate"
                          >
                            Kỷ niệm
                          </div>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-medium text-charcoal/80 text-center leading-tight">
                        {t.editor.text.frames[frame]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal/70">
              {t.editor.text.presetsTitle}
            </h4>
            <button
              type="button"
              onClick={() => {
                if (activePageIndex < 0) setActivePageIndex(0);
                addTextElement({
                  content: lang === 'vi' ? 'Tiêu Đề Trang Kỷ Niệm' : 'Chapter Title',
                  fontFamily: 'Cormorant Garamond',
                  fontSize: 32,
                  fontWeight: 'semibold',
                  fontStyle: 'italic',
                  x: 15,
                  y: 8,
                  width: 70,
                });
              }}
              className="w-full p-3.5 rounded-xl border border-beige bg-white hover:bg-cream text-left transition-colors"
            >
              <div className="font-serif text-xl font-semibold italic text-charcoal">
                {t.editor.text.addTitle}
              </div>
              <div className="text-[11px] text-charcoal/55 mt-0.5">Cormorant Garamond • 32px</div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activePageIndex < 0) setActivePageIndex(0);
                addTextElement({
                  content:
                    lang === 'vi'
                      ? 'Những tháng năm rực rỡ không thể quên'
                      : 'Golden afternoons we will always remember',
                  fontFamily: 'Playfair Display',
                  fontSize: 20,
                  fontWeight: 'normal',
                  fontStyle: 'italic',
                  x: 20,
                  y: 22,
                  width: 60,
                });
              }}
              className="w-full p-3.5 rounded-xl border border-beige bg-white hover:bg-cream text-left transition-colors"
            >
              <div className="font-serif text-base italic text-charcoal">
                {t.editor.text.addSubtitle}
              </div>
              <div className="text-[11px] text-charcoal/55 mt-0.5">Playfair Display • 20px</div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activePageIndex < 0) setActivePageIndex(0);
                addTextElement({
                  content:
                    lang === 'vi'
                      ? 'Ghi chú viết tay dịu dàng bên trang sách...'
                      : 'A handwritten note tucked beside this photograph...',
                  fontFamily: 'Caveat',
                  fontSize: 24,
                  fontWeight: 'normal',
                  fontStyle: 'normal',
                  color: '#5C493E',
                  x: 18,
                  y: 78,
                  width: 64,
                });
              }}
              className="w-full p-3.5 rounded-xl border border-beige bg-white hover:bg-cream text-left transition-colors"
            >
              <div className="font-handwriting text-xl text-terracotta">
                {t.editor.text.addHandwritten}
              </div>
              <div className="text-[11px] text-charcoal/55 mt-0.5">Caveat Script • 24px</div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activePageIndex < 0) setActivePageIndex(0);
                addTextElement({
                  content: 'HANOI • AUTUMN 2026',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 12,
                  fontWeight: 'semibold',
                  fontStyle: 'normal',
                  letterSpacing: 3,
                  color: '#7A685B',
                  x: 25,
                  y: 90,
                  width: 50,
                });
              }}
              className="w-full p-3.5 rounded-xl border border-beige bg-white hover:bg-cream text-left transition-colors"
            >
              <div className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-charcoal">
                {t.editor.text.addDateStamp}
              </div>
              <div className="text-[11px] text-charcoal/55 mt-0.5">Editorial Sans • 12px</div>
            </button>
          </div>
        )}

        {/* ==================== TAB 7: HARDCOVER & THEME ==================== */}
        {activeTab === 'cover' && (
          <div className="space-y-4">
            <h3 className="font-serif font-semibold text-lg text-charcoal">
              {t.editor.cover.customizeCover}
            </h3>

            {/* Cover Photograph Upload & Quick Picker */}
            <div className="p-3 rounded-xl bg-cream/70 border border-beige space-y-2.5">
              <label className="block text-xs font-semibold text-charcoal/80">
                {t.wizard.coverPhoto}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-terracotta hover:bg-charcoal text-white text-xs font-medium transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {album.cover.coverPhotoId ? t.wizard.changeCover : t.wizard.uploadCover}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadCoverPhoto}
                    className="hidden"
                  />
                </label>

                {album.cover.coverPhotoId && (
                  <button
                    type="button"
                    onClick={() => updateCover({ coverPhotoId: null })}
                    className="px-2.5 py-1.5 rounded-lg border border-beige bg-white hover:bg-red-50 text-red-700 text-xs font-medium transition-colors"
                  >
                    {t.wizard.removeCover}
                  </button>
                )}
              </div>

              {photos.length > 0 && (
                <div className="pt-1.5">
                  <span className="block text-[10px] uppercase tracking-wider text-charcoal/55 mb-1.5">
                    {t.editor.tabs.photos}:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {photos.map((p) => {
                      const isSelectedCover = album.cover.coverPhotoId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => updateCover({ coverPhotoId: p.id })}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                            isSelectedCover
                              ? 'border-terracotta ring-2 ring-terracotta/30 scale-105'
                              : 'border-white opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={p.thumbnailDataUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal/70 mb-1">
                {t.editor.cover.coverTitle}
              </label>
              <input
                type="text"
                value={album.cover.title}
                onChange={(e) => updateCover({ title: e.target.value }, false)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-beige text-xs font-medium outline-none focus:border-terracotta"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal/70 mb-1">
                {t.editor.cover.coverSubtitle}
              </label>
              <input
                type="text"
                value={album.cover.subtitle}
                onChange={(e) => updateCover({ subtitle: e.target.value }, false)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-beige text-xs outline-none focus:border-terracotta"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal/70 mb-1.5">
                {t.editor.cover.coverBgColor}
              </label>
              <div className="flex flex-wrap gap-2">
                {HARDCOVER_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    onClick={() =>
                      updateCover({
                        backgroundColor: sw.color,
                        spineColor: sw.spine,
                        titleColor: sw.text,
                      })
                    }
                    style={{ backgroundColor: sw.color }}
                    className={`w-7 h-7 rounded-full border-2 ${
                      album.cover.backgroundColor === sw.color
                        ? 'border-gold scale-110'
                        : 'border-white'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal/70 mb-1">
                {t.editor.cover.titleFont}
              </label>
              <select
                value={album.cover.titleFont}
                onChange={(e) => updateCover({ titleFont: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-beige text-xs outline-none"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal/70 mb-1.5">
                {t.editor.cover.layoutStyle}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'classic', label: t.editor.cover.styleClassic },
                    { id: 'modern', label: t.editor.cover.styleModern },
                    { id: 'full-bleed', label: t.editor.cover.styleFullBleed },
                    { id: 'minimal-frame', label: t.editor.cover.styleMinimalFrame },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateCover({ layoutStyle: st.id })}
                    className={`p-2 rounded-lg text-xs border font-medium ${
                      album.cover.layoutStyle === st.id
                        ? 'bg-charcoal text-ivory border-charcoal'
                        : 'bg-white text-charcoal border-beige'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-beige">
              <label className="block text-xs font-semibold text-charcoal/70 mb-2">
                {t.wizard.step3}
              </label>
              <div className="space-y-1.5">
                {Object.values(THEME_PRESETS).map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => changeAlbumTheme(th.id)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-left flex items-center justify-between ${
                      album.themeId === th.id
                        ? 'border-terracotta bg-cream font-semibold'
                        : 'border-beige bg-white hover:bg-cream/50'
                    }`}
                  >
                    <span>{lang === 'vi' ? th.nameVi : th.nameEn}</span>
                    {album.themeId === th.id && <Check className="w-3.5 h-3.5 text-terracotta" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layout Overflow Protection Modal */}
      {pendingOverflowLayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/55 backdrop-blur-xs p-4">
          <div className="bg-ivory border border-beige rounded-2xl shadow-book max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cream text-terracotta flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-xl text-charcoal">
                  {t.editor.layouts.overflowTitle}
                </h3>
                <p className="text-xs text-charcoal/75 mt-1 leading-relaxed">
                  {t.editor.layouts.overflowMessage
                    .replace('{current}', String(pendingOverflowLayout.currentCount))
                    .replace('{target}', String(pendingOverflowLayout.layout.slots.length))
                    .replace(
                      '{excess}',
                      String(
                        pendingOverflowLayout.currentCount -
                          pendingOverflowLayout.layout.slots.length
                      )
                    )}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  applyLayoutToActivePage(pendingOverflowLayout.layout, 'move-next');
                  setPendingOverflowLayout(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-charcoal text-ivory hover:bg-terracotta text-xs font-medium text-left transition-colors"
              >
                • {t.editor.layouts.overflowMoveNext}
              </button>
              <button
                type="button"
                onClick={() => {
                  applyLayoutToActivePage(pendingOverflowLayout.layout, 'remove-from-page');
                  setPendingOverflowLayout(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-cream hover:bg-beige text-charcoal border border-beige text-xs font-medium text-left transition-colors"
              >
                • {t.editor.layouts.overflowKeepInLibrary}
              </button>
              <button
                type="button"
                onClick={() => setPendingOverflowLayout(null)}
                className="w-full py-2 px-4 rounded-xl text-charcoal/60 hover:text-charcoal text-xs font-medium text-center"
              >
                {t.editor.layouts.overflowCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
