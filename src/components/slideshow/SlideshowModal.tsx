import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Album, StoredAudio } from '../../types';
import { FORMAT_DIMENSIONS } from '../../utils/constants';
import { BookCoverRenderer } from '../book/BookCoverRenderer';
import { PageSurfaceRenderer } from '../book/PageSurfaceRenderer';
import { AudioTrimmerModal } from '../dialogs/AudioTrimmerModal';
import { db } from '../../services/database/db';
import { useI18n } from '../../i18n';
import { useToastStore } from '../../stores/useToastStore';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Music,
  Volume2,
  VolumeX,
  Repeat,
  Trash2,
  Upload,
  Link2,
  ExternalLink,
  Scissors,
} from 'lucide-react';

interface SlideshowModalProps {
  isOpen: boolean;
  album: Album;
  photoUrls: Record<string, string>;
  onClose: () => void;
}

export const SlideshowModal: React.FC<SlideshowModalProps> = ({
  isOpen,
  album,
  photoUrls,
  onClose,
}) => {
  const { t } = useI18n();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  // Slide 0 = Front cover, 1..N = album pages
  const totalSlides = album.pages.length + 1;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(4);
  const [transitionStyle, setTransitionStyle] = useState<'fade' | 'slide' | 'zoom'>('fade');

  // Audio state
  const [audioRecord, setAudioRecord] = useState<StoredAudio | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMusic, setLoopMusic] = useState(true);
  const [trimmerOpen, setTrimmerOpen] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stageScale, setStageScale] = useState(0.85);

  // Load any stored audio for this album from IndexedDB
  useEffect(() => {
    if (!isOpen) return;
    setCurrentSlide(0);
    setIsPlaying(true);

    let activeUrl: string | null = null;
    db.audios
      .where('albumId')
      .equals(album.id)
      .first()
      .then((rec) => {
        if (rec) {
          setAudioRecord(rec);
          activeUrl = URL.createObjectURL(rec.blob);
          setAudioUrl(activeUrl);
        }
      });

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
      setIsMusicPlaying(false);
    };
  }, [isOpen, album.id]);

  // Compute responsive scale (allow up to 2.0x native rendering so high-res monitors stay razor-sharp)
  useEffect(() => {
    if (!isOpen) return;
    const updateScale = () => {
      const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
      const availW = window.innerWidth - 64;
      const availH = window.innerHeight - 170;
      const nextScale = Math.min(2.0, availW / dims.width, availH / dims.height);
      setStageScale(Math.max(0.32, Number(nextScale.toFixed(3))));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isOpen, album.format]);

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, intervalSec, totalSlides]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentSlide((p) => (p + 1) % totalSlides);
      if (e.key === 'ArrowLeft') setCurrentSlide((p) => (p - 1 + totalSlides) % totalSlides);
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, totalSlides, onClose]);

  // Sync audio volume & mute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.loop = loopMusic;
  }, [volume, isMuted, loopMusic]);

  if (!isOpen) return null;

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const toggleMusicPlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsMusicPlaying(true))
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
  };

  const coverPhotoUrl = album.cover.coverPhotoId ? photoUrls[album.cover.coverPhotoId] : null;

  const getMotionProps = () => {
    if (transitionStyle === 'slide') {
      return {
        initial: { opacity: 0, x: 90 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -90 },
        transition: { duration: 0.65, ease: 'easeInOut' as const },
      };
    }
    if (transitionStyle === 'zoom') {
      return {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.65, ease: 'easeOut' as const },
      };
    }
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.75 },
    };
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#191614] text-ivory flex flex-col justify-between select-none overflow-hidden">
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => !loopMusic && setIsMusicPlaying(false)} />}

      {/* Top Bar */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-black/30 border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl font-semibold text-ivory">{album.title}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-ivory/80">
            {currentSlide === 0
              ? t.viewer.frontCover
              : `${t.editor.pages.pageLabel} ${currentSlide} / ${album.pages.length}`}
          </span>
        </div>

        {/* Transition & Interval Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-ivory/65">{t.slideshow.interval}:</span>
            {[3, 5, 8].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setIntervalSec(sec)}
                className={`px-2 py-0.5 rounded ${
                  intervalSec === sec ? 'bg-terracotta text-white font-semibold' : 'text-ivory/75'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <select
            value={transitionStyle}
            onChange={(e) => setTransitionStyle(e.target.value as typeof transitionStyle)}
            className="bg-white/10 text-ivory px-3 py-1.5 rounded-lg outline-none border border-white/10"
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
            onClick={() => {
              const shareUrl = `${window.location.origin}/slideshow/${album.id}`;
              navigator.clipboard.writeText(shareUrl).then(() => {
                addToast(t.slideshow.copiedLinkToast, 'success');
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-charcoal hover:bg-ivory font-semibold transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.slideshow.copyLinkBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/slideshow/${album.id}`);
            }}
            title={t.slideshow.openDedicatedPage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-terracotta text-ivory transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gold" />
            <span className="hidden lg:inline">{t.nav.slideshowLink}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-red-700/80 text-ivory transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t.slideshow.exit}</span>
          </button>
        </div>
      </div>

      {/* Center Stage */}
      <div className="flex-1 flex items-center justify-center relative p-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setCurrentSlide((p) => (p - 1 + totalSlides) % totalSlides)}
          className="absolute left-4 z-20 p-3 rounded-full bg-black/40 hover:bg-terracotta text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${currentSlide}`}
            {...getMotionProps()}
            className="shadow-2xl rounded overflow-hidden"
          >
            {currentSlide === 0 ? (
              <BookCoverRenderer
                cover={album.cover}
                format={album.format}
                coverPhotoUrl={coverPhotoUrl}
                author={album.author}
                scale={stageScale}
              />
            ) : (
              <PageSurfaceRenderer
                page={album.pages[currentSlide - 1]}
                format={album.format}
                photoUrls={photoUrls}
                scale={stageScale}
                interactive={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setCurrentSlide((p) => (p + 1) % totalSlides)}
          className="absolute right-4 z-20 p-3 rounded-full bg-black/40 hover:bg-terracotta text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Playback & Local Background Music Dock */}
      <div className="px-6 py-3.5 bg-black/45 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Slideshow Play/Pause */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-terracotta hover:bg-gold text-white text-xs font-semibold transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? t.slideshow.pause : t.slideshow.play}</span>
          </button>

          {/* Progress Dots */}
          <div className="hidden md:flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === i ? 'w-6 bg-gold' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Local Audio Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-ivory/80">
            <Music className="w-4 h-4 text-gold" />
            <span className="max-w-[160px] truncate">
              {audioRecord ? audioRecord.name : t.slideshow.noMusic}
            </span>
          </div>

          {!audioRecord ? (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-ivory font-medium transition-colors">
              <Upload className="w-3.5 h-3.5 text-gold" />
              <span>{t.slideshow.uploadMusic}</span>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/*"
                onChange={handleUploadAudio}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl">
              <button
                type="button"
                onClick={toggleMusicPlayback}
                className="px-2.5 py-1 rounded bg-gold text-charcoal font-semibold flex items-center gap-1"
              >
                {isMusicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isMusicPlaying ? t.slideshow.pauseMusic : t.slideshow.playMusic}</span>
              </button>

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
                className="px-2.5 py-1 rounded bg-terracotta text-white font-semibold flex items-center gap-1"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Cắt / Ghép</span>
              </button>

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
                className="w-20 accent-gold"
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
      </div>
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
