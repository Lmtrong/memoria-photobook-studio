import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/database/db';
import { isSupportedImageFile, processImageFile } from '../services/image/imageService';
import { StoredPhoto } from '../types';
import { useEditorStore } from '../stores/useEditorStore';
import { useToastStore } from '../stores/useToastStore';
import { usePhotoUrls } from '../hooks/usePhotoUrls';
import { FORMAT_DIMENSIONS } from '../utils/constants';
import { useI18n } from '../i18n';
import { EditorLeftSidebar, LeftSidebarTab } from '../components/editor/EditorLeftSidebar';
import { EditorRightProperties } from '../components/editor/EditorRightProperties';
import { PageSurfaceRenderer } from '../components/book/PageSurfaceRenderer';
import { BookCoverRenderer } from '../components/book/BookCoverRenderer';
import { PdfExportModal } from '../components/dialogs/PdfExportModal';
import { SlideshowModal } from '../components/slideshow/SlideshowModal';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  BookOpen,
  FileDown,
  Play,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Sliders,
  PanelLeft,
} from 'lucide-react';

export const AlbumEditorPage: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { t, lang, toggleLanguage } = useI18n();
  const { addToast } = useToastStore();
  const slotFileInputRef = useRef<HTMLInputElement>(null);

  const {
    album,
    activePageIndex,
    selectedType,
    selectedId,
    saveStatus,
    past,
    future,
    loadAlbumIntoEditor,
    setActivePageIndex,
    selectElement,
    undo,
    redo,
    assignPhotoToSlot,
    autoAssignPhotoToEmptySlot,
    updatePhotoSlot,
    updateTextElement,
    updateStickerElement,
    deletePhotoSlot,
    deleteTextElement,
    deleteStickerElement,
    updateCover,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<LeftSidebarTab>('pages');
  const [assignTargetSlotId, setAssignTargetSlotId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState<number>(0.78);
  const [manualZoom, setManualZoom] = useState<number>(1);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);

  // Mobile / Tablet responsive drawer toggles
  const [showLeftDrawer, setShowLeftDrawer] = useState(true);
  const [showRightDrawer, setShowRightDrawer] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);

  // Load album from IndexedDB on mount
  useEffect(() => {
    if (!albumId) return;
    db.albums.get(albumId).then((found) => {
      if (found) {
        loadAlbumIntoEditor(found);
      } else {
        navigate('/');
      }
    });
  }, [albumId, loadAlbumIntoEditor, navigate]);

  const photos = useLiveQuery(
    () => (albumId ? db.photos.where('albumId').equals(albumId).toArray() : []),
    [albumId],
    []
  );
  const photoUrls = usePhotoUrls(photos);

  // Compute responsive canvas scale to fit center workspace cleanly
  useEffect(() => {
    if (!album) return;
    const handleResize = () => {
      if (!stageRef.current) return;
      const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
      const rect = stageRef.current.getBoundingClientRect();
      const padW = rect.width - 64;
      const padH = rect.height - 96;
      const fitScale = Math.min(1, padW / dims.width, padH / dims.height);
      setCanvasScale(Math.max(0.32, Number(fitScale.toFixed(2))));

      if (window.innerWidth < 1024) {
        setShowRightDrawer(false);
      } else {
        setShowRightDrawer(true);
      }
      if (window.innerWidth < 768) {
        setShowLeftDrawer(false);
      } else {
        setShowLeftDrawer(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [album]);

  // Global keyboard shortcuts for Undo (Ctrl+Z), Redo (Ctrl+Shift+Z), and Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isInput) return;
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (selectedType === 'sticker' && selectedId) {
          deleteStickerElement(selectedId);
        } else if (selectedType === 'text' && selectedId) {
          deleteTextElement(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedType, selectedId, deleteStickerElement, deleteTextElement]);

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory text-charcoal font-serif text-xl">
        {t.common.loading}
      </div>
    );
  }

  const activePage = activePageIndex >= 0 ? album.pages[activePageIndex] : null;
  const effectiveScale = Number((canvasScale * manualZoom).toFixed(2));
  const coverPhotoUrl = album.cover.coverPhotoId ? photoUrls[album.cover.coverPhotoId] : null;

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    if (selectedType === 'photo') deletePhotoSlot(selectedId);
    if (selectedType === 'text') deleteTextElement(selectedId);
    if (selectedType === 'sticker') deleteStickerElement(selectedId);
  };

  const handleUploadFilesIntoSlot = async (files: FileList | null, targetSlotId: string | null) => {
    if (!files || files.length === 0 || !album) return;
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
      } catch (err) {
        console.error('Failed to process image:', err);
      }
    }

    if (unsupportedCount > 0) {
      addToast(t.common.toastUnsupportedFile, 'error');
    }

    if (newRecords.length > 0) {
      await db.photos.bulkPut(newRecords);
      addToast(t.common.toastPhotosUploaded.replace('{count}', String(newRecords.length)), 'success');

      // If currently editing the Front Cover, assign the uploaded photo directly as the cover photo
      if (activePageIndex === -1) {
        updateCover({ coverPhotoId: newRecords[0].id });
        setAssignTargetSlotId(null);
        return;
      }

      // Assign first photo to clicked/dropped slot, and remaining photos to other empty slots on the page
      if (targetSlotId) {
        assignPhotoToSlot(targetSlotId, newRecords[0].id);
        for (let i = 1; i < newRecords.length; i++) {
          autoAssignPhotoToEmptySlot(newRecords[i].id);
        }
      } else {
        for (const rec of newRecords) {
          autoAssignPhotoToEmptySlot(rec.id);
        }
      }
      setAssignTargetSlotId(null);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-ivory text-charcoal">
      {/* Top Studio Editor Toolbar */}
      <header className="h-15 bg-ivory border-b border-beige px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left Navigation & Album Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-beige bg-cream/60 hover:bg-beige/60 text-xs font-medium text-charcoal transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.nav.backToDashboard}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLeftDrawer((s) => !s)}
            className="md:hidden p-1.5 rounded-lg border border-beige bg-cream text-charcoal"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-beige hidden sm:block" />

          <div className="truncate">
            <h1 className="font-serif font-semibold text-base sm:text-lg text-charcoal truncate leading-none">
              {album.title}
            </h1>
            <span className="text-[10px] text-charcoal/55 uppercase tracking-wider">
              {FORMAT_DIMENSIONS[album.format].label} • {album.pages.length}{' '}
              {t.dashboard.pagesCount}
            </span>
          </div>
        </div>

        {/* Center Undo/Redo & Auto-Save Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-cream rounded-lg border border-beige p-0.5">
            <button
              type="button"
              disabled={past.length === 0}
              onClick={undo}
              title={t.editor.undo}
              className="p-1.5 rounded text-charcoal disabled:opacity-35 hover:bg-ivory transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={future.length === 0}
              onClick={redo}
              title={t.editor.redo}
              className="p-1.5 rounded text-charcoal disabled:opacity-35 hover:bg-ivory transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Save Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream/70 border border-beige text-xs text-charcoal/75">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-terracotta animate-spin" />
                <span>{t.editor.saveStatus.saving}</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t.editor.saveStatus.saved}</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-red-700">{t.editor.saveStatus.error}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Actions: Language, Slideshow, PDF Export, 3D Book Viewer */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg border border-beige bg-cream/50 text-[11px] font-semibold uppercase"
          >
            {lang}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/slideshow/${album.id}`)}
            title={t.slideshow.openDedicatedPage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-beige bg-cream/70 hover:bg-beige text-xs font-medium text-charcoal transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-terracotta" />
            <span className="hidden md:inline">{t.nav.slideshowLink}</span>
          </button>

          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-beige bg-cream/70 hover:bg-beige text-xs font-medium text-charcoal transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-terracotta" />
            <span className="hidden md:inline">{t.nav.exportPdf}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/viewer/${album.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-charcoal text-ivory hover:bg-terracotta text-xs font-medium transition-colors shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-gold" />
            <span>{t.nav.viewBook}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRightDrawer((s) => !s)}
            className="lg:hidden p-1.5 rounded-lg border border-beige bg-cream text-charcoal"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Three-Panel Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        {showLeftDrawer && (
          <div className="z-20 h-full flex">
            <EditorLeftSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              photos={photos || []}
              photoUrls={photoUrls}
              assignTargetSlotId={assignTargetSlotId}
              setAssignTargetSlotId={setAssignTargetSlotId}
            />
          </div>
        )}

        {/* Center Interactive Album Canvas Stage */}
        <main
          ref={stageRef}
          onClick={() => selectElement('page', null)}
          className="flex-1 bg-[#E7DFD3] paper-texture-subtle flex flex-col items-center justify-between p-4 sm:p-8 overflow-auto relative"
        >
          {/* Top Page Indicator Pill */}
          <div className="z-10 flex items-center gap-3 bg-ivory/90 backdrop-blur-xs px-4 py-1.5 rounded-full border border-beige shadow-xs text-xs">
            <button
              type="button"
              disabled={activePageIndex <= -1}
              onClick={(e) => {
                e.stopPropagation();
                setActivePageIndex(activePageIndex - 1);
              }}
              className="p-0.5 text-charcoal/70 hover:text-charcoal disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-serif font-semibold text-sm text-charcoal min-w-[110px] text-center">
              {activePageIndex === -1
                ? t.viewer.frontCover
                : `${t.editor.pages.pageLabel} ${activePageIndex + 1} / ${album.pages.length}`}
            </span>

            <button
              type="button"
              disabled={activePageIndex >= album.pages.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setActivePageIndex(activePageIndex + 1);
              }}
              className="p-0.5 text-charcoal/70 hover:text-charcoal disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Center Page or Cover Canvas */}
          <div className="my-auto flex items-center justify-center py-4">
            {activePageIndex === -1 ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('cover');
                  if (slotFileInputRef.current) {
                    slotFileInputRef.current.value = '';
                    slotFileInputRef.current.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleUploadFilesIntoSlot(e.dataTransfer.files, null);
                    return;
                  }
                  const droppedPhotoId = e.dataTransfer.getData('text/memoria-photo-id');
                  if (droppedPhotoId) {
                    updateCover({ coverPhotoId: droppedPhotoId });
                  }
                }}
                title={
                  album.cover.coverPhotoId ? t.wizard.changeCover : t.wizard.uploadCover
                }
                className="relative shadow-book rounded-r-md cursor-pointer group"
              >
                <BookCoverRenderer
                  cover={album.cover}
                  format={album.format}
                  coverPhotoUrl={coverPhotoUrl}
                  author={album.author}
                  scale={effectiveScale}
                  className="rounded-r-md"
                />
                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-charcoal/85 text-ivory text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow">
                  {album.cover.coverPhotoId ? t.wizard.changeCover : t.wizard.uploadCover}
                </div>
              </div>
            ) : (
              activePage && (
                <div className="relative shadow-book ring-1 ring-black/10 bg-ivory">
                  <PageSurfaceRenderer
                    page={activePage}
                    format={album.format}
                    photoUrls={photoUrls}
                    scale={effectiveScale}
                    interactive
                    selectedType={selectedType}
                    selectedId={selectedId}
                    onSelectElement={(type, id) => {
                      selectElement(type, id);
                      if (window.innerWidth < 1024 && id) {
                        setShowRightDrawer(true);
                      }
                    }}
                    onDropPhotoOnSlot={(slotId, photoId) => {
                      assignPhotoToSlot(slotId, photoId);
                    }}
                    onDropFilesOnSlot={(slotId, files) => {
                      handleUploadFilesIntoSlot(files, slotId);
                    }}
                    onClickEmptySlot={(slotId) => {
                      setAssignTargetSlotId(slotId);
                      setActiveTab('photos');
                      setShowLeftDrawer(true);
                      // Open file picker directly so user can immediately choose image from their computer
                      if (slotFileInputRef.current) {
                        slotFileInputRef.current.value = '';
                        slotFileInputRef.current.click();
                      }
                    }}
                    onUpdatePhotoSlot={(slotId, partial, recordHistory) =>
                      updatePhotoSlot(slotId, partial, recordHistory)
                    }
                    onUpdateText={(textId, partial, recordHistory) =>
                      updateTextElement(textId, partial, recordHistory)
                    }
                    onUpdateSticker={(stickerId, partial, recordHistory) =>
                      updateStickerElement(stickerId, partial, recordHistory)
                    }
                    onDeleteSelected={handleDeleteSelected}
                  />
                </div>
              )
            )}
          </div>

          {/* Bottom Canvas Zoom Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="z-10 flex items-center gap-2 bg-ivory/90 backdrop-blur-xs px-3 py-1 rounded-full border border-beige shadow-xs text-xs"
          >
            <button
              type="button"
              onClick={() => setManualZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
              className="p-1 text-charcoal/70 hover:text-charcoal"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setManualZoom(1)}
              className="px-2 font-medium text-charcoal"
            >
              {Math.round(effectiveScale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setManualZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
              className="p-1 text-charcoal/70 hover:text-charcoal"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </main>

        {/* Right Inspector Properties Sidebar */}
        {showRightDrawer && (
          <div className="z-20 h-full flex">
            <EditorRightProperties />
          </div>
        )}
      </div>

      {/* Hidden File Input for Direct Slot Click Upload */}
      <input
        ref={slotFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleUploadFilesIntoSlot(e.target.files, assignTargetSlotId)}
        className="hidden"
      />

      {/* PDF Export Dialog */}
      {pdfModalOpen && (
        <PdfExportModal
          isOpen={pdfModalOpen}
          album={album}
          photoUrls={photoUrls}
          onClose={() => setPdfModalOpen(false)}
        />
      )}

      {/* Slideshow Modal */}
      {slideshowOpen && (
        <SlideshowModal
          isOpen={slideshowOpen}
          album={album}
          photoUrls={photoUrls}
          onClose={() => setSlideshowOpen(false)}
        />
      )}
    </div>
  );
};
