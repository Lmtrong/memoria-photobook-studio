import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/database/db';
import { loadSharedOrLocalAlbum } from '../services/share/shareService';
import { Album, AlbumPage } from '../types';
import { usePhotoUrls } from '../hooks/usePhotoUrls';
import { FORMAT_DIMENSIONS } from '../utils/constants';
import { BookCoverRenderer } from '../components/book/BookCoverRenderer';
import { PageSurfaceRenderer } from '../components/book/PageSurfaceRenderer';
import { PdfExportModal } from '../components/dialogs/PdfExportModal';
import { SlideshowModal } from '../components/slideshow/SlideshowModal';
import { useI18n } from '../i18n';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Grid,
  Play,
  FileDown,
  Pencil,
} from 'lucide-react';

interface SheetFace {
  kind: 'front-cover' | 'inside-front' | 'page' | 'inside-back' | 'back-cover';
  page?: AlbumPage;
  label: string;
}

interface PhysicalSheet {
  index: number;
  front: SheetFace; // Visible on RIGHT when sheet is unflipped (angle 0)
  back: SheetFace; // Visible on LEFT when sheet is flipped (angle -180)
}

export const BookViewerPage: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [album, setAlbum] = useState<Album | null>(null);
  const [viewMode, setViewMode] = useState<'double' | 'single'>(() =>
    window.innerWidth < 768 ? 'single' : 'double'
  );

  // Double-page 3D spread state:
  // spreadIndex = number of sheets flipped to the left (0 = closed front cover, sheets.length = closed back cover)
  const [spreadIndex, setSpreadIndex] = useState<number>(0);

  // Single-page viewer state:
  // 0 = Front cover, 1..N = album pages, N+1 = Back cover
  const [singleIndex, setSingleIndex] = useState<number>(0);

  const [zoom, setZoom] = useState<number>(1);
  const [baseScale, setBaseScale] = useState<number>(0.62);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [slideshowOpen, setSlideshowOpen] = useState<boolean>(false);

  const viewerRootRef = useRef<HTMLDivElement>(null);

  const shareKeyParam = searchParams.get('s');

  useEffect(() => {
    if (!albumId) return;
    loadSharedOrLocalAlbum(albumId, shareKeyParam).then(({ album: found }) => {
      if (found) {
        setAlbum(found);
      } else {
        navigate('/');
      }
    });
  }, [albumId, shareKeyParam, navigate]);

  const photos = useLiveQuery(
    () => (albumId ? db.photos.where('albumId').equals(albumId).toArray() : []),
    [albumId],
    []
  );
  const photoUrls = usePhotoUrls(photos);

  // Build physical 2-sided sheets for realistic 3D book flipping
  const sheets = useMemo<PhysicalSheet[]>(() => {
    if (!album) return [];
    const pages = album.pages;
    const result: PhysicalSheet[] = [];

    if (pages.length === 0) return result;

    // Sheet 0: Front Hardcover -> Page 1 on the reverse
    result.push({
      index: 0,
      front: { kind: 'front-cover', label: t.viewer.frontCover },
      back: {
        kind: 'page',
        page: pages[0],
        label: `${t.editor.pages.pageLabel} 1`,
      },
    });

    // Middle paper sheets: Pair (pages[i], pages[i+1])
    let pIdx = 1;
    let sheetCounter = 1;
    while (pIdx < pages.length) {
      const rightFacePage = pages[pIdx];
      const leftFacePage = pages[pIdx + 1];

      if (leftFacePage) {
        result.push({
          index: sheetCounter++,
          front: {
            kind: 'page',
            page: rightFacePage,
            label: `${t.editor.pages.pageLabel} ${rightFacePage.pageNumber}`,
          },
          back: {
            kind: 'page',
            page: leftFacePage,
            label: `${t.editor.pages.pageLabel} ${leftFacePage.pageNumber}`,
          },
        });
        pIdx += 2;
      } else {
        // Odd final page -> its back is the Back Hardcover
        result.push({
          index: sheetCounter++,
          front: {
            kind: 'page',
            page: rightFacePage,
            label: `${t.editor.pages.pageLabel} ${rightFacePage.pageNumber}`,
          },
          back: {
            kind: 'back-cover',
            label: t.viewer.backCover,
          },
        });
        pIdx += 1;
      }
    }

    // If last sheet didn't end with back-cover, add a closing hardcover sheet
    const lastSheet = result[result.length - 1];
    if (lastSheet.back.kind !== 'back-cover') {
      result.push({
        index: sheetCounter++,
        front: {
          kind: 'inside-back',
          label: t.viewer.insideBack,
        },
        back: {
          kind: 'back-cover',
          label: t.viewer.backCover,
        },
      });
    }

    return result;
  }, [album, t]);

  // Responsive scaling calculation
  useEffect(() => {
    if (!album) return;
    const handleResize = () => {
      const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
      const availW = window.innerWidth - 80;
      const availH = window.innerHeight - 180;

      if (viewMode === 'double') {
        const scaleW = availW / (dims.width * 2.15);
        const scaleH = availH / (dims.height * 1.08);
        setBaseScale(Math.max(0.28, Math.min(1.35, Number(Math.min(scaleW, scaleH).toFixed(2)))));
      } else {
        const scaleW = availW / (dims.width * 1.1);
        const scaleH = availH / (dims.height * 1.08);
        setBaseScale(Math.max(0.32, Math.min(1.6, Number(Math.min(scaleW, scaleH).toFixed(2)))));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [album, viewMode]);

  const totalSingleItems = album ? album.pages.length + 2 : 2;

  const goNext = () => {
    if (viewMode === 'double') {
      setSpreadIndex((s) => Math.min(sheets.length, s + 1));
    } else {
      setSingleIndex((s) => Math.min(totalSingleItems - 1, s + 1));
    }
  };

  const goPrev = () => {
    if (viewMode === 'double') {
      setSpreadIndex((s) => Math.max(0, s - 1));
    } else {
      setSingleIndex((s) => Math.max(0, s - 1));
    }
  };

  const goFirst = () => {
    setSpreadIndex(0);
    setSingleIndex(0);
  };

  const goLast = () => {
    setSpreadIndex(sheets.length);
    setSingleIndex(totalSingleItems - 1);
  };

  // Keyboard navigation (Left / Right arrows, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pdfModalOpen || slideshowOpen) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (showThumbnails) {
          setShowThumbnails(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRootRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#231F1D] text-ivory font-serif text-xl">
        {t.common.loading}
      </div>
    );
  }

  const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
  const effectiveScale = Number((baseScale * zoom).toFixed(2));
  const pageWidth = Math.round(dims.width * effectiveScale);
  const pageHeight = Math.round(dims.height * effectiveScale);
  const coverPhotoUrl = album.cover.coverPhotoId ? photoUrls[album.cover.coverPhotoId] : null;

  const renderFaceContent = (face: SheetFace, side: 'left' | 'right') => {
    if (face.kind === 'front-cover') {
      return (
        <BookCoverRenderer
          cover={album.cover}
          format={album.format}
          coverPhotoUrl={coverPhotoUrl}
          author={album.author}
          scale={effectiveScale}
          className="rounded-r-md"
        />
      );
    }
    if (face.kind === 'back-cover') {
      return (
        <BookCoverRenderer
          cover={album.cover}
          format={album.format}
          coverPhotoUrl={coverPhotoUrl}
          author={album.author}
          isBackCover
          scale={effectiveScale}
          className="rounded-l-md"
        />
      );
    }
    if (face.kind === 'inside-back' || face.kind === 'inside-front') {
      return (
        <div
          style={{ width: pageWidth, height: pageHeight }}
          className={`bg-[#EFE9DF] paper-texture-linen flex items-center justify-center relative ${
            side === 'left' ? 'book-spine-crease-left' : 'book-spine-crease-right'
          }`}
        >
          <div className="border border-taupe/30 w-[86%] h-[86%] flex items-center justify-center">
            <span className="font-serif italic text-charcoal/35 text-sm tracking-widest">
              MEMORIA EX LIBRIS
            </span>
          </div>
        </div>
      );
    }
    if (face.page) {
      return (
        <PageSurfaceRenderer
          page={face.page}
          format={album.format}
          photoUrls={photoUrls}
          scale={effectiveScale}
          pageSide={side}
          interactive={false}
        />
      );
    }
    return null;
  };

  // Current status label
  const getSpreadStatusLabel = () => {
    if (viewMode === 'single') {
      if (singleIndex === 0) return t.viewer.frontCover;
      if (singleIndex === totalSingleItems - 1) return t.viewer.backCover;
      return t.viewer.pageOf
        .replace('{current}', String(singleIndex))
        .replace('{total}', String(album.pages.length));
    }
    if (spreadIndex === 0) return t.viewer.frontCover;
    if (spreadIndex === sheets.length) return t.viewer.backCover;
    const leftFace = sheets[spreadIndex - 1]?.back;
    const rightFace = sheets[spreadIndex]?.front;
    return `${leftFace?.label || ''}  •  ${rightFace?.label || ''}`;
  };

  return (
    <div
      ref={viewerRootRef}
      className="h-screen w-screen overflow-hidden flex flex-col justify-between bg-[#221E1B] text-ivory select-none relative"
    >
      {/* Top Studio Reader Bar */}
      <header className="h-16 px-4 sm:px-6 bg-black/35 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-ivory transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.nav.backToDashboard}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/editor/${album.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-terracotta text-xs font-medium text-ivory transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-gold" />
            <span className="hidden sm:inline">{t.nav.editAlbum}</span>
          </button>

          <div className="h-5 w-px bg-white/15 hidden md:block" />

          <div className="hidden md:block">
            <h1 className="font-serif text-lg font-semibold text-ivory leading-none">
              {album.title}
            </h1>
            <span className="text-[11px] text-ivory/55">{getSpreadStatusLabel()}</span>
          </div>
        </div>

        {/* Center Viewing Mode Switcher (Double 3D vs Single Page) */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/15 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('double')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'double'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-ivory/70 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.viewer.modeDouble}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'single'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-ivory/70 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.viewer.modeSingle}</span>
          </button>
        </div>

        {/* Right Actions: Slideshow, PDF Export, Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/slideshow/${album.id}`)}
            title={t.slideshow.openDedicatedPage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-terracotta text-xs font-medium text-ivory transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-gold" />
            <span className="hidden lg:inline">{t.nav.slideshowLink}</span>
          </button>

          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-terracotta text-xs font-medium text-ivory transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-gold" />
            <span className="hidden lg:inline">{t.nav.exportPdf}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? t.viewer.exitFullscreen : t.viewer.fullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ==================== MAIN 3D PHOTOBOOK STAGE ==================== */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-4">
        {/* Ambient Warm Studio Spotlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(185, 155, 131, 0.16) 0%, rgba(25, 21, 18, 0.85) 75%)',
          }}
        />

        {viewMode === 'double' ? (
          /* MODE A: REALISTIC DOUBLE-PAGE 3D BOOK WITH SHEET FLIPPING */
          <div className="relative flex items-center justify-center">
            <div
              style={{
                width: pageWidth * 2,
                height: pageHeight,
                transform:
                  spreadIndex === 0
                    ? `translateX(-${Math.round(pageWidth / 2)}px)`
                    : spreadIndex === sheets.length
                    ? `translateX(${Math.round(pageWidth / 2)}px)`
                    : 'translateX(0px)',
                transition: 'transform 0.85s cubic-bezier(0.645, 0.045, 0.355, 1)',
              }}
              className="relative perspective-2000"
            >
              {/* Underlying Hardcover Base Board & Multi-Layer Page Thickness */}
              {spreadIndex > 0 && (
                <div
                  style={{
                    left: -8,
                    top: -6,
                    width: pageWidth + 8,
                    height: pageHeight + 12,
                    backgroundColor: album.cover.backgroundColor,
                  }}
                  className="absolute rounded-l-lg shadow-book pointer-events-none"
                >
                  {/* Stacked left pages thickness edge */}
                  <div
                    className="absolute left-1 top-1.5 bottom-1.5 w-2.5 rounded-l-xs"
                    style={{
                      background:
                        'repeating-linear-gradient(to right, #EFE9DF 0px, #D8CBB8 1px, #F8F5F0 2px)',
                    }}
                  />
                </div>
              )}

              {spreadIndex < sheets.length && (
                <div
                  style={{
                    right: -8,
                    top: -6,
                    width: pageWidth + 8,
                    height: pageHeight + 12,
                    backgroundColor: album.cover.backgroundColor,
                  }}
                  className="absolute rounded-r-lg shadow-book pointer-events-none"
                >
                  {/* Stacked right pages thickness edge */}
                  <div
                    className="absolute right-1 top-1.5 bottom-1.5 w-2.5 rounded-r-xs"
                    style={{
                      background:
                        'repeating-linear-gradient(to left, #EFE9DF 0px, #D8CBB8 1px, #F8F5F0 2px)',
                    }}
                  />
                </div>
              )}

              {/* Center Book Spine Binding Cylinder */}
              <div
                style={{
                  left: pageWidth - 10,
                  top: -7,
                  width: 20,
                  height: pageHeight + 14,
                  backgroundColor: album.cover.spineColor,
                  backgroundImage:
                    'linear-gradient(to right, rgba(0,0,0,0.45), rgba(255,255,255,0.12) 50%, rgba(0,0,0,0.45))',
                }}
                className="absolute rounded-xs shadow-lg z-0 pointer-events-none"
              />

              {/* 3D Flipping Physical Sheets */}
              {sheets.map((sheet, idx) => {
                const isFlipped = idx < spreadIndex;
                // Dynamic z-index so turning sheet always stays above stationary stacks
                const zIndex = isFlipped
                  ? 10 + idx
                  : 10 + (sheets.length - idx);

                return (
                  <div
                    key={sheet.index}
                    onClick={() => {
                      if (isFlipped) {
                        setSpreadIndex(idx);
                      } else {
                        setSpreadIndex(idx + 1);
                      }
                    }}
                    style={{
                      left: pageWidth,
                      top: 0,
                      width: pageWidth,
                      height: pageHeight,
                      transformOrigin: 'left center',
                      transform: isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.88s cubic-bezier(0.645, 0.045, 0.355, 1)',
                      zIndex,
                    }}
                    className="absolute preserve-3d cursor-pointer group"
                  >
                    {/* FRONT FACE OF SHEET (Visible on Right side before flipping) */}
                    <div className="absolute inset-0 backface-hidden overflow-hidden shadow-page-right bg-ivory">
                      {renderFaceContent(sheet.front, 'right')}
                      {/* Subtle hover corner curl indicator */}
                      <div className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-tl from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>

                    {/* BACK FACE OF SHEET (Visible on Left side after flipping -180deg) */}
                    <div
                      style={{ transform: 'rotateY(180deg)' }}
                      className="absolute inset-0 backface-hidden overflow-hidden shadow-page-left bg-ivory"
                    >
                      {renderFaceContent(sheet.back, 'left')}
                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-gradient-to-tr from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* MODE B: SINGLE-PAGE VIEWER (Great for Mobile & Focused Inspection) */
          <div className="relative flex items-center justify-center">
            <div className="shadow-book rounded overflow-hidden transition-all duration-300">
              {singleIndex === 0 ? (
                <BookCoverRenderer
                  cover={album.cover}
                  format={album.format}
                  coverPhotoUrl={coverPhotoUrl}
                  author={album.author}
                  scale={effectiveScale}
                  onClick={goNext}
                  className="cursor-pointer rounded-r-md"
                />
              ) : singleIndex === totalSingleItems - 1 ? (
                <BookCoverRenderer
                  cover={album.cover}
                  format={album.format}
                  coverPhotoUrl={coverPhotoUrl}
                  author={album.author}
                  isBackCover
                  scale={effectiveScale}
                  onClick={goPrev}
                  className="cursor-pointer rounded-l-md"
                />
              ) : (
                <PageSurfaceRenderer
                  page={album.pages[singleIndex - 1]}
                  format={album.format}
                  photoUrls={photoUrls}
                  scale={effectiveScale}
                  interactive={false}
                />
              )}
            </div>
          </div>
        )}

        {/* Hint caption */}
        <p className="text-[11px] text-ivory/45 mt-5 tracking-wide hidden sm:block z-10">
          {t.viewer.clickToFlipHint}
        </p>

        {/* Collapsible Page Thumbnails Strip */}
        {showThumbnails && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-4xl w-[92%] bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center gap-3 overflow-x-auto z-30 shadow-2xl">
            <button
              type="button"
              onClick={goFirst}
              className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-serif ${
                (viewMode === 'double' && spreadIndex === 0) ||
                (viewMode === 'single' && singleIndex === 0)
                  ? 'border-gold bg-gold/20 text-gold'
                  : 'border-white/15 text-ivory/70'
              }`}
            >
              {t.viewer.frontCover}
            </button>

            {album.pages.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (viewMode === 'single') {
                    setSingleIndex(idx + 1);
                  } else {
                    setSpreadIndex(Math.floor(idx / 2) + 1);
                  }
                }}
                className="shrink-0 flex flex-col items-center gap-1 group"
              >
                <div className="border border-white/20 group-hover:border-gold rounded overflow-hidden">
                  <PageSurfaceRenderer
                    page={p}
                    format={album.format}
                    photoUrls={photoUrls}
                    scale={0.09}
                    interactive={false}
                    showPageNumber={false}
                  />
                </div>
                <span className="text-[10px] text-ivory/70">{idx + 1}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={goLast}
              className="shrink-0 px-3 py-2 rounded-lg border border-white/15 text-xs font-serif text-ivory/70 hover:border-gold"
            >
              {t.viewer.backCover}
            </button>
          </div>
        )}
      </main>

      {/* Bottom Reader Navigation & Zoom Bar */}
      <footer className="h-16 px-4 sm:px-8 bg-black/45 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-4 z-30">
        {/* Left: Thumbnails Drawer Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowThumbnails((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showThumbnails
                ? 'bg-gold text-charcoal border-gold'
                : 'bg-white/10 text-ivory border-white/10 hover:bg-white/20'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.viewer.thumbnails}</span>
          </button>
        </div>

        {/* Center: First / Prev / Page Status / Next / Last */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goFirst}
            title={t.viewer.firstPage}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goPrev}
            title={t.viewer.prevPage}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-terracotta text-ivory flex items-center gap-1 text-xs font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t.wizard.back}</span>
          </button>

          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-serif tracking-wider min-w-[120px] text-center">
            {getSpreadStatusLabel()}
          </span>

          <button
            type="button"
            onClick={goNext}
            title={t.viewer.nextPage}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-terracotta text-ivory flex items-center gap-1 text-xs font-medium transition-colors"
          >
            <span className="hidden sm:inline">{t.wizard.next}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goLast}
            title={t.viewer.lastPage}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
            title={t.viewer.zoomOut}
            className="p-1 text-ivory/75 hover:text-white"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title={t.viewer.resetZoom}
            className="px-2 font-medium text-ivory"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            title={t.viewer.zoomIn}
            className="p-1 text-ivory/75 hover:text-white"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* PDF Export Modal */}
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
