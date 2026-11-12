import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/database/db';
import { Album, AlbumPage, StoredAudio } from '../types';
import { usePhotoUrls } from '../hooks/usePhotoUrls';
import { FORMAT_DIMENSIONS } from '../utils/constants';
import { BookCoverRenderer } from '../components/book/BookCoverRenderer';
import { PageSurfaceRenderer } from '../components/book/PageSurfaceRenderer';
import { AudioTrimmerModal } from '../components/dialogs/AudioTrimmerModal';
import { useI18n } from '../i18n';
import { useToastStore } from '../stores/useToastStore';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Music,
  Volume2,
  VolumeX,
  Repeat,
  Trash2,
  Upload,
  Maximize2,
  Minimize2,
  Link2,
  Check,
  BookOpen,
  FileText,
  ArrowLeft,
  Sparkles,
  Scissors,
  Loader2,
} from 'lucide-react';

interface SlideItem {
  id: string;
  kind: 'front-cover' | 'single-page' | 'spread' | 'back-cover';
  label: string;
  page?: AlbumPage;
  leftPage?: AlbumPage;
  rightPage?: AlbumPage;
  photoIds: string[];
}

export const SlideshowPage: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const isVi = lang === 'vi';
  const { addToast } = useToastStore();

  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(true);
  const [presentationMode, setPresentationMode] = useState<'single' | 'spread'>('single');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(5);
  const [transitionStyle, setTransitionStyle] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  // Audio state
  const [audioRecord, setAudioRecord] = useState<StoredAudio | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMusic, setLoopMusic] = useState(true);

  // Audio Trimmer & Splicer Studio state
  const [trimmerOpen, setTrimmerOpen] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hudTimerRef = useRef<number | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePadding, setStagePadding] = useState({ top: 84, bottom: 80 });

  // Load album & audio directly from IndexedDB (instant, zero lag)
  useEffect(() => {
    if (!albumId) return;
    let mounted = true;
    let createdAudioUrl: string | null = null;

    setIsLoadingAlbum(true);
    Promise.all([
      db.albums.get(albumId),
      db.audios.where('albumId').equals(albumId).first(),
    ])
      .then(([loadedAlbum, loadedAudio]) => {
        if (!mounted) return;
        if (!loadedAlbum) {
          navigate('/');
          return;
        }
        setAlbum(loadedAlbum);
        if (loadedAudio && loadedAudio.blob) {
          setAudioRecord(loadedAudio);
          createdAudioUrl = URL.createObjectURL(loadedAudio.blob);
          setAudioUrl(createdAudioUrl);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingAlbum(false);
      });

    return () => {
      mounted = false;
      if (createdAudioUrl) URL.revokeObjectURL(createdAudioUrl);
      setIsMusicPlaying(false);
    };
  }, [albumId, navigate]);

  const photos = useLiveQuery(
    () => (albumId ? db.photos.where('albumId').equals(albumId).toArray() : []),
    [albumId],
    []
  );
  const photoUrls = usePhotoUrls(photos);

  // Automatically start music when audioUrl is ready (or show 1-click unlock if browser blocks autoplay)
  useEffect(() => {
    if (!audioUrl || !audioRef.current) {
      setNeedsAudioUnlock(false);
      return;
    }
    const el = audioRef.current;
    el.volume = isMuted ? 0 : volume;
    el.loop = loopMusic;

    el.play()
      .then(() => {
        setIsMusicPlaying(true);
        setNeedsAudioUnlock(false);
      })
      .catch(() => {
        // Browser blocked unmuted autoplay on direct link open -> prompt 1-click unlock
        setIsMusicPlaying(false);
        setNeedsAudioUnlock(true);
      });
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unlock audio on first click anywhere if browser blocked initial autoplay
  const unlockAndPlayAudio = useCallback(() => {
    if (!needsAudioUnlock || !audioRef.current) return;
    audioRef.current
      .play()
      .then(() => {
        setIsMusicPlaying(true);
        setNeedsAudioUnlock(false);
        setIsPlaying(true);
      })
      .catch(() => {});
  }, [needsAudioUnlock]);

  // Build slides list based on presentationMode ('single' vs 'spread')
  const slides = useMemo<SlideItem[]>(() => {
    if (!album) return [];
    const list: SlideItem[] = [];

    // Slide 0: Front cover
    list.push({
      id: 'cover-front',
      kind: 'front-cover',
      label: t.viewer.frontCover,
      photoIds: album.cover.coverPhotoId ? [album.cover.coverPhotoId] : [],
    });

    if (presentationMode === 'single') {
      album.pages.forEach((p, idx) => {
        const ids = p.photoSlots.map((s) => s.photoId).filter((id): id is string => Boolean(id));
        list.push({
          id: p.id,
          kind: 'single-page',
          label: `${t.editor.pages.pageLabel} ${idx + 1} / ${album.pages.length}`,
          page: p,
          photoIds: ids,
        });
      });
    } else {
      for (let i = 0; i < album.pages.length; i += 2) {
        const left = album.pages[i];
        const right = album.pages[i + 1];
        const ids = [
          ...left.photoSlots.map((s) => s.photoId),
          ...(right ? right.photoSlots.map((s) => s.photoId) : []),
        ].filter((id): id is string => Boolean(id));

        const label = right
          ? `${t.editor.pages.pageLabel} ${i + 1}–${i + 2} / ${album.pages.length}`
          : `${t.editor.pages.pageLabel} ${i + 1} / ${album.pages.length}`;

        list.push({
          id: `spread-${i}`,
          kind: 'spread',
          label,
          leftPage: left,
          rightPage: right,
          photoIds: ids,
        });
      }
    }

    // Closing slide: Back cover
    list.push({
      id: 'cover-back',
      kind: 'back-cover',
      label: t.viewer.backCover,
      photoIds: [],
    });

    return list;
  }, [album, presentationMode, t]);

  // Keep currentSlide in bounds when mode changes
  useEffect(() => {
    if (slides.length > 0 && currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  // Compute true native High-DPI responsive scale & exact stage padding so top/bottom of album are NEVER clipped
  useEffect(() => {
    if (!album) return;
    const updateScale = () => {
      const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
      const headerH = headerRef.current?.offsetHeight || 68;
      const footerH = footerRef.current?.offsetHeight || 64;

      const topPad = hudVisible ? headerH + 18 : 28;
      const bottomPad = hudVisible ? footerH + 18 : 28;
      const sidePad = hudVisible ? 112 : 56;

      setStagePadding({ top: topPad, bottom: bottomPad });

      const availW = Math.max(240, window.innerWidth - sidePad);
      const availH = Math.max(200, window.innerHeight - topPad - bottomPad - 8);

      const activeSlide = slides[currentSlide];
      const isSpreadSlide = activeSlide?.kind === 'spread';
      const targetW = isSpreadSlide ? dims.width * 2 : dims.width;
      const targetH = dims.height;

      const nextScale = Math.min(2.2, availW / targetW, availH / targetH);
      setStageScale(Math.max(0.25, Number(nextScale.toFixed(3))));
    };
    updateScale();
    window.addEventListener('resize', updateScale);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null;
    if (ro) {
      if (headerRef.current) ro.observe(headerRef.current);
      if (footerRef.current) ro.observe(footerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      ro?.disconnect();
    };
  }, [album, slides, currentSlide, hudVisible]);

  // Pre-decode next & previous slide images in background so transitions never lag
  useEffect(() => {
    if (slides.length === 0) return;
    const nextIdx = (currentSlide + 1) % slides.length;
    const prevIdx = (currentSlide - 1 + slides.length) % slides.length;
    const upcomingIds = new Set([
      ...(slides[nextIdx]?.photoIds || []),
      ...(slides[prevIdx]?.photoIds || []),
    ]);

    upcomingIds.forEach((id) => {
      const url = photoUrls[id];
      if (!url) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    });
  }, [currentSlide, slides, photoUrls]);

  // Auto-advance timer (pauses while Audio Trimmer Studio is open)
  useEffect(() => {
    if (!isPlaying || trimmerOpen || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, intervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, trimmerOpen, intervalSec, slides.length]);

  // Auto-hide HUD after 3.5s of mouse inactivity while playing
  const resetHudTimer = useCallback(() => {
    setHudVisible(true);
    if (hudTimerRef.current) {
      window.clearTimeout(hudTimerRef.current);
    }
    if (isPlaying && !trimmerOpen) {
      hudTimerRef.current = window.setTimeout(() => {
        setHudVisible(false);
      }, 3500);
    }
  }, [isPlaying, trimmerOpen]);

  useEffect(() => {
    resetHudTimer();
    return () => {
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    };
  }, [isPlaying, trimmerOpen, resetHudTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (trimmerOpen) return;
      resetHudTimer();
      unlockAndPlayAudio();
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          setIsFullscreen(false);
        } else if (album) {
          navigate(`/viewer/${album.id}`);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentSlide((p) => (p + 1) % Math.max(1, slides.length));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide((p) => (p - 1 + Math.max(1, slides.length)) % Math.max(1, slides.length));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length, album, trimmerOpen, navigate, resetHudTimer, toggleFullscreen, unlockAndPlayAudio]);

  // Sync audio volume & loop
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.loop = loopMusic;
  }, [volume, isMuted, loopMusic]);

  // Instant 0ms Copy Link (no heavy encoding or network lag)
  const handleCopyShareLink = () => {
    if (!album) return;
    const shareUrl = `${window.location.origin}/slideshow/${album.id}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    addToast(t.slideshow.copiedLinkToast, 'success');
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  // Selecting an audio file opens the Audio Trimmer & Splicer Studio so the user can cut/splice instead of inserting the whole song
  const handleSelectAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioRef.current && isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    }
    setPendingAudioFile(file);
    setTrimmerOpen(true);
    e.target.value = '';
  };

  const handleSaveTrimmedAudio = async (savedAudio: StoredAudio) => {
    await db.audios.put(savedAudio);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const nextUrl = URL.createObjectURL(savedAudio.blob);
    setAudioRecord(savedAudio);
    setAudioUrl(nextUrl);
    setTrimmerOpen(false);
    setPendingAudioFile(null);

    addToast(
      isVi
        ? `Đã áp dụng nhạc nền: ${savedAudio.name}`
        : `Applied soundtrack: ${savedAudio.name}`,
      'success'
    );
  };

  const toggleMusicPlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsMusicPlaying(true);
          setNeedsAudioUnlock(false);
        })
        .catch((err) => console.error('Audio playback prevented:', err));
    }
  };

  const handleRemoveMusic = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioRecord) {
      await db.audios.delete(audioRecord.id);
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioRecord(null);
    setAudioUrl(null);
    setIsMusicPlaying(false);
    setNeedsAudioUnlock(false);
  };

  if (isLoadingAlbum || !album || slides.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#12100E] text-ivory font-serif">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p className="text-lg">
          {isVi
            ? 'Đang tải Album & Nhạc nền chất lượng cao...'
            : 'Loading High-Resolution Album & Soundtrack...'}
        </p>
      </div>
    );
  }

  const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
  const coverPhotoUrl = album.cover.coverPhotoId ? photoUrls[album.cover.coverPhotoId] : null;
  const activeSlide = slides[currentSlide] || slides[0];

  const getMotionProps = () => {
    if (transitionStyle === 'slide') {
      return {
        initial: { opacity: 0, x: 64 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -64 },
        transition: { duration: 0.45, ease: 'easeOut' as const },
      };
    }
    if (transitionStyle === 'zoom') {
      return {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.55, ease: 'easeOut' as const },
      };
    }
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.45, ease: 'easeInOut' as const },
    };
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={resetHudTimer}
      onClick={() => {
        resetHudTimer();
        unlockAndPlayAudio();
      }}
      className="fixed inset-0 bg-[#110F0D] text-ivory select-none overflow-hidden"
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => !loopMusic && setIsMusicPlaying(false)}
        />
      )}

      {/* Ambient Cinema Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(198, 166, 128, 0.12) 0%, rgba(15, 13, 11, 0.94) 78%)',
        }}
      />

      {/* 1-Click Autoplay Audio Unlock Banner for Shared Link Visitors */}
      {needsAudioUnlock && audioUrl && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unlockAndPlayAudio();
            }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gold text-charcoal font-semibold text-xs sm:text-sm shadow-2xl animate-bounce border border-white/40"
          >
            <Volume2 className="w-4 h-4" />
            <span>
              {isVi
                ? `🎵 Chạm để phát nhạc nền "${audioRecord?.name || ''}"`
                : `🎵 Tap to play soundtrack "${audioRecord?.name || ''}"`}
            </span>
          </button>
        </div>
      )}

      {/* ==================== TOP PRESENTATION HUD BAR ==================== */}
      <header
        ref={headerRef}
        className={`absolute top-0 left-0 right-0 px-4 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-2.5 bg-black/60 backdrop-blur-md border-b border-white/10 z-30 transition-all duration-500 ${
          hudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/viewer/${album.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-ivory transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.nav.viewBook}</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/20 border border-gold/40 text-[10px] font-semibold uppercase tracking-widest text-gold">
            <Sparkles className="w-3 h-3" />
            <span>{t.slideshow.hdBadge}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-lg sm:text-xl font-semibold text-ivory truncate max-w-[200px] sm:max-w-xs">
              {album.title}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-ivory/85 font-medium">
              {activeSlide.label}
            </span>
          </div>
        </div>

        {/* Center Mode Switcher: Single Page Cinema HD vs 2-Page Spread HD */}
        <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => {
              setPresentationMode('single');
              setCurrentSlide(0);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              presentationMode === 'single'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-ivory/75 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.slideshow.modeSingleHd}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPresentationMode('spread');
              setCurrentSlide(0);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              presentationMode === 'spread'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-ivory/75 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.slideshow.modeSpreadHd}</span>
          </button>
        </div>

        {/* Right Controls: Copy Share Link, Interval, Transition, Fullscreen */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold text-charcoal hover:bg-ivory font-semibold transition-colors shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            <span>{t.slideshow.copyLinkBtn}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-ivory/60 mr-1">{t.slideshow.interval}:</span>
            {[3, 5, 8, 12].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setIntervalSec(sec)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  intervalSec === sec
                    ? 'bg-terracotta text-white font-semibold'
                    : 'text-ivory/75 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <select
            value={transitionStyle}
            onChange={(e) => setTransitionStyle(e.target.value as typeof transitionStyle)}
            className="bg-white/10 text-ivory px-3 py-1.5 rounded-xl outline-none border border-white/10 cursor-pointer"
          >
            <option value="fade" className="text-charcoal">
              {t.slideshow.transFade}
            </option>
            <option value="slide" className="text-charcoal">
              {t.slideshow.transSlide}
            </option>
            <option value="zoom" className="text-charcoal">
              {t.slideshow.transZoom}
            </option>
          </select>

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

      {/* ==================== HIGH-RESOLUTION STAGE ==================== */}
      <main
        style={{
          paddingTop: stagePadding.top,
          paddingBottom: stagePadding.bottom,
          paddingLeft: 24,
          paddingRight: 24,
        }}
        className="w-full h-full flex items-center justify-center relative overflow-hidden z-10 transition-[padding] duration-300"
      >
        {/* Previous Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            unlockAndPlayAudio();
            setCurrentSlide((p) => (p - 1 + slides.length) % slides.length);
          }}
          className={`absolute left-4 sm:left-6 z-20 p-3.5 rounded-full bg-black/50 hover:bg-terracotta text-white border border-white/10 transition-all duration-300 ${
            hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Virtualized Single Active Slide (100% Native Pixel Resolution) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${presentationMode}-${activeSlide.id}`}
            {...getMotionProps()}
            className="shadow-[0_28px_70px_rgba(0,0,0,0.75)] rounded-md overflow-hidden"
          >
            {activeSlide.kind === 'front-cover' && (
              <BookCoverRenderer
                cover={album.cover}
                format={album.format}
                coverPhotoUrl={coverPhotoUrl}
                author={album.author}
                scale={stageScale}
              />
            )}

            {activeSlide.kind === 'back-cover' && (
              <BookCoverRenderer
                cover={album.cover}
                format={album.format}
                coverPhotoUrl={coverPhotoUrl}
                author={album.author}
                isBackCover
                scale={stageScale}
              />
            )}

            {activeSlide.kind === 'single-page' && activeSlide.page && (
              <PageSurfaceRenderer
                page={activeSlide.page}
                format={album.format}
                photoUrls={photoUrls}
                scale={stageScale}
                interactive={false}
              />
            )}

            {activeSlide.kind === 'spread' && activeSlide.leftPage && (
              <div
                style={{
                  width: Math.round(dims.width * stageScale) * 2,
                  height: Math.round(dims.height * stageScale),
                  display: 'flex',
                  backgroundColor: '#F8F5F0',
                }}
                className="relative"
              >
                <PageSurfaceRenderer
                  page={activeSlide.leftPage}
                  format={album.format}
                  photoUrls={photoUrls}
                  scale={stageScale}
                  pageSide="left"
                  interactive={false}
                />
                {activeSlide.rightPage ? (
                  <PageSurfaceRenderer
                    page={activeSlide.rightPage}
                    format={album.format}
                    photoUrls={photoUrls}
                    scale={stageScale}
                    pageSide="right"
                    interactive={false}
                  />
                ) : (
                  <div
                    style={{
                      width: Math.round(dims.width * stageScale),
                      height: Math.round(dims.height * stageScale),
                      backgroundColor: activeSlide.leftPage.backgroundColor,
                    }}
                    className="book-spine-crease-right flex items-center justify-center"
                  >
                    <span className="font-serif italic text-charcoal/25 text-sm tracking-widest">
                      MEMORIA STUDIO
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            unlockAndPlayAudio();
            setCurrentSlide((p) => (p + 1) % slides.length);
          }}
          className={`absolute right-4 sm:right-6 z-20 p-3.5 rounded-full bg-black/50 hover:bg-terracotta text-white border border-white/10 transition-all duration-300 ${
            hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </main>

      {/* ==================== BOTTOM PLAYBACK & AUDIO TRIMMER HUD ==================== */}
      <footer
        ref={footerRef}
        className={`absolute bottom-0 left-0 right-0 px-4 sm:px-7 py-3 bg-black/60 backdrop-blur-md border-t border-white/10 flex flex-wrap items-center justify-between gap-3 z-30 transition-all duration-500 ${
          hudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        {/* Play / Pause & Slide Dots */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-terracotta hover:bg-gold hover:text-charcoal text-white text-xs font-semibold transition-colors shadow-xs"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? t.slideshow.pause : t.slideshow.play}</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 max-w-md overflow-x-auto py-1">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                title={s.label}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all shrink-0 ${
                  currentSlide === i ? 'w-7 bg-gold' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Local Audio Controls + Cut/Splice Studio Button */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-ivory/85">
            <Music className="w-4 h-4 text-gold shrink-0" />
            <span className="max-w-[180px] truncate font-medium">
              {audioRecord ? audioRecord.name : t.slideshow.noMusic}
            </span>
          </div>

          {!audioRecord ? (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold text-charcoal hover:bg-ivory font-semibold transition-colors shadow-xs">
                <Scissors className="w-3.5 h-3.5" />
                <span>{isVi ? 'Chọn & Cắt Ghép Nhạc' : 'Choose & Trim Audio'}</span>
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/*"
                  onChange={handleSelectAudioFile}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={toggleMusicPlayback}
                className="px-2.5 py-1 rounded-lg bg-gold text-charcoal font-semibold flex items-center gap-1"
              >
                {isMusicPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isMusicPlaying ? t.slideshow.pauseMusic : t.slideshow.playMusic}</span>
              </button>

              {/* Open Audio Trimmer & Splicer Studio */}
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current && isMusicPlaying) {
                    audioRef.current.pause();
                    setIsMusicPlaying(false);
                  }
                  setPendingAudioFile(null);
                  setTrimmerOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-terracotta/90 hover:bg-terracotta text-white font-semibold transition-colors"
                title={
                  isVi
                    ? 'Cắt đoạn điệp khúc hoặc ghép nối nhiều bài nhạc'
                    : 'Trim chorus or splice multiple audio tracks'
                }
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{isVi ? 'Cắt / Ghép nhạc' : 'Trim / Splice'}</span>
              </button>

              <label
                className="cursor-pointer p-1 text-ivory/80 hover:text-gold"
                title={isVi ? 'Đổi file nhạc khác' : 'Upload another audio file'}
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/*"
                  onChange={handleSelectAudioFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="p-1 text-ivory/80 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setIsMuted(false);
                  setVolume(Number(e.target.value));
                }}
                className="w-16 sm:w-20 accent-gold"
              />

              <button
                type="button"
                title={t.slideshow.loopMusic}
                onClick={() => setLoopMusic((l) => !l)}
                className={`p-1 rounded ${loopMusic ? 'text-gold' : 'text-ivory/40'}`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                title={t.slideshow.removeMusic}
                onClick={handleRemoveMusic}
                className="p-1 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Audio Trimmer & Splicer Studio Modal */}
      <AudioTrimmerModal
        isOpen={trimmerOpen}
        albumId={album.id}
        existingAudio={audioRecord}
        initialFile={pendingAudioFile}
        onClose={() => {
          setTrimmerOpen(false);
          setPendingAudioFile(null);
        }}
        onSaved={handleSaveTrimmedAudio}
      />
    </div>
  );
};
