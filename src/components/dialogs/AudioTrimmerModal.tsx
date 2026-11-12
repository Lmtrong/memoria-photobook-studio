import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DecodedTrackInfo,
  decodeAudioBlob,
  formatAudioTime,
  renderSplicedAudioSegments,
  RenderSegmentInput,
} from '../../services/audio/audioService';
import { AudioSegmentConfig, StoredAudio } from '../../types';
import { useI18n } from '../../i18n';
import {
  X,
  Scissors,
  Play,
  Pause,
  Plus,
  Trash2,
  Upload,
  Check,
  Music,
  Sparkles,
  Loader2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';

interface AudioTrimmerModalProps {
  isOpen: boolean;
  albumId: string;
  existingAudio: StoredAudio | null;
  initialFile?: File | null;
  onClose: () => void;
  onSaved: (savedAudio: StoredAudio) => void;
}

interface SpliceItem extends AudioSegmentConfig {
  trackId: string;
  buffer: AudioBuffer;
}

export const AudioTrimmerModal: React.FC<AudioTrimmerModalProps> = ({
  isOpen,
  albumId,
  existingAudio,
  initialFile,
  onClose,
  onSaved,
}) => {
  const { lang } = useI18n();
  const isVi = lang === 'vi';

  const [tracks, setTracks] = useState<DecodedTrackInfo[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Current trimmer handles (in seconds)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [fadeIn, setFadeIn] = useState(1.5);
  const [fadeOut, setFadeOut] = useState(2.0);

  // Multi-segment splice timeline
  const [spliceList, setSpliceList] = useState<SpliceItem[]>([]);

  // WebAudio preview playback state
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingHandleRef = useRef<'start' | 'end' | 'playhead' | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const previewStartRealTimeRef = useRef<number>(0);
  const previewOffsetSecRef = useRef<number>(0);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || null;

  const stopPreview = useCallback(() => {
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch {
        // ignore
      }
      previewSourceRef.current = null;
    }
    if (previewCtxRef.current) {
      previewCtxRef.current.close().catch(() => {});
      previewCtxRef.current = null;
    }
    setIsPreviewing(false);
  }, []);

  // Load initial file or existing audio when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
      return;
    }

    const loadInitial = async () => {
      setIsDecoding(true);
      try {
        if (initialFile) {
          const decoded = await decodeAudioBlob(initialFile);
          const track: DecodedTrackInfo = {
            id: `track-${Date.now()}`,
            name: initialFile.name,
            blob: initialFile,
            ...decoded,
          };
          setTracks([track]);
          setActiveTrackId(track.id);
          setStartTime(0);
          setEndTime(Math.min(decoded.duration, Math.max(15, Math.min(60, decoded.duration))));
          setPlayheadTime(0);
        } else if (existingAudio && tracks.length === 0) {
          const decoded = await decodeAudioBlob(existingAudio.blob);
          const track: DecodedTrackInfo = {
            id: `track-existing-${Date.now()}`,
            name: existingAudio.name,
            blob: existingAudio.blob,
            ...decoded,
          };
          setTracks([track]);
          setActiveTrackId(track.id);
          setStartTime(0);
          setEndTime(decoded.duration);
          setPlayheadTime(0);
        }
      } catch (err) {
        console.error('Failed to decode audio file:', err);
      } finally {
        setIsDecoding(false);
      }
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFile]);

  // Select a track & initialize handles
  const selectTrack = (track: DecodedTrackInfo) => {
    stopPreview();
    setActiveTrackId(track.id);
    setStartTime(0);
    setEndTime(Math.min(track.duration, 60));
    setPlayheadTime(0);
  };

  // Upload additional audio file(s)
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    stopPreview();
    setIsDecoding(true);

    try {
      const added: DecodedTrackInfo[] = [];
      for (const file of Array.from(files)) {
        const decoded = await decodeAudioBlob(file);
        added.push({
          id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          blob: file,
          ...decoded,
        });
      }
      if (added.length > 0) {
        setTracks((prev) => [...prev, ...added]);
        selectTrack(added[0]);
      }
    } catch (err) {
      console.error('Audio decode error:', err);
    } finally {
      setIsDecoding(false);
      e.target.value = '';
    }
  };

  // Preview active cut region [startTime .. endTime] with Fade In / Fade Out
  const togglePreviewCut = () => {
    if (isPreviewing) {
      stopPreview();
      return;
    }
    if (!activeTrack) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    previewCtxRef.current = ctx;

    const source = ctx.createBufferSource();
    source.buffer = activeTrack.audioBuffer;
    const gainNode = ctx.createGain();

    const segDuration = Math.max(0.2, endTime - startTime);
    const effFadeIn = Math.min(fadeIn, segDuration / 2);
    const effFadeOut = Math.min(fadeOut, segDuration / 2);

    const now = ctx.currentTime;
    if (effFadeIn > 0.05) {
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(1.0, now + effFadeIn);
    } else {
      gainNode.gain.setValueAtTime(1.0, now);
    }

    if (effFadeOut > 0.05) {
      gainNode.gain.setValueAtTime(1.0, now + segDuration - effFadeOut);
      gainNode.gain.linearRampToValueAtTime(0.001, now + segDuration);
    }

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0, startTime, segDuration);
    previewSourceRef.current = source;
    previewStartRealTimeRef.current = performance.now();
    previewOffsetSecRef.current = startTime;
    setIsPreviewing(true);
    setPlayheadTime(startTime);

    const updatePlayhead = () => {
      const elapsed = (performance.now() - previewStartRealTimeRef.current) / 1000;
      const nextTime = previewOffsetSecRef.current + elapsed;
      if (nextTime >= endTime) {
        setPlayheadTime(endTime);
        stopPreview();
        return;
      }
      setPlayheadTime(nextTime);
      previewRafRef.current = requestAnimationFrame(updatePlayhead);
    };

    previewRafRef.current = requestAnimationFrame(updatePlayhead);
    source.onended = () => {
      stopPreview();
    };
  };

  // Draw waveform & trim handles on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeTrack) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(100, rect.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const duration = Math.max(0.1, activeTrack.duration);
    const startX = (startTime / duration) * width;
    const endX = (endTime / duration) * width;
    const playheadX = (playheadTime / duration) * width;

    // Background highlight for selected region
    ctx.fillStyle = 'rgba(197, 160, 89, 0.16)';
    ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);

    // Draw waveform bars
    const peaks = activeTrack.peaks;
    const barCount = peaks.length;
    const barGap = 2;
    const barWidth = Math.max(1.5, (width - barCount * barGap) / barCount);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + barGap);
      const peak = peaks[i];
      const barH = Math.max(4, peak * (height * 0.76));
      const y = (height - barH) / 2;

      const inSelection = x + barWidth >= startX && x <= endX;
      ctx.fillStyle = inSelection ? '#E5B869' : 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 2);
      ctx.fill();
    }

    // Dimmed overlay outside selection
    ctx.fillStyle = 'rgba(12, 10, 9, 0.55)';
    if (startX > 0) ctx.fillRect(0, 0, startX, height);
    if (endX < width) ctx.fillRect(endX, 0, width - endX, height);

    // Top & bottom border lines of selected region
    ctx.strokeStyle = '#E5B869';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, 1, Math.max(2, endX - startX), height - 2);

    // Start Handle (Left)
    ctx.fillStyle = '#C87D55';
    ctx.fillRect(Math.max(0, startX - 4), 0, 8, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(Math.max(1, startX - 1), height / 2 - 10, 2, 20);

    // End Handle (Right)
    ctx.fillStyle = '#C87D55';
    ctx.fillRect(Math.min(width - 8, endX - 4), 0, 8, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(Math.min(width - 3, endX - 1), height / 2 - 10, 2, 20);

    // Playhead cursor
    if (playheadTime >= startTime && playheadTime <= endTime) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [activeTrack, startTime, endTime, playheadTime]);

  // Pointer dragging on Waveform Canvas
  const getTimeFromClientX = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas || !activeTrack) return 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Number((ratio * activeTrack.duration).toFixed(1));
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeTrack || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const startX = (startTime / activeTrack.duration) * rect.width;
    const endX = (endTime / activeTrack.duration) * rect.width;

    if (Math.abs(clickX - startX) <= 16) {
      draggingHandleRef.current = 'start';
    } else if (Math.abs(clickX - endX) <= 16) {
      draggingHandleRef.current = 'end';
    } else if (clickX < startX) {
      draggingHandleRef.current = 'start';
      const t = getTimeFromClientX(e.clientX);
      setStartTime(Math.min(t, endTime - 1));
      setPlayheadTime(t);
    } else if (clickX > endX) {
      draggingHandleRef.current = 'end';
      const t = getTimeFromClientX(e.clientX);
      setEndTime(Math.max(t, startTime + 1));
    } else {
      draggingHandleRef.current = 'playhead';
      const t = getTimeFromClientX(e.clientX);
      setPlayheadTime(t);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingHandleRef.current || !activeTrack) return;
    const t = getTimeFromClientX(e.clientX);
    if (draggingHandleRef.current === 'start') {
      const nextStart = Math.max(0, Math.min(t, endTime - 1));
      setStartTime(nextStart);
      setPlayheadTime(nextStart);
    } else if (draggingHandleRef.current === 'end') {
      const nextEnd = Math.min(activeTrack.duration, Math.max(t, startTime + 1));
      setEndTime(nextEnd);
    } else if (draggingHandleRef.current === 'playhead') {
      setPlayheadTime(Math.max(startTime, Math.min(endTime, t)));
    }
  };

  const handleCanvasPointerUp = () => {
    draggingHandleRef.current = null;
  };

  // Add current cut segment to multi-segment splice list
  const handleAddSegmentToSplice = () => {
    if (!activeTrack) return;
    const newSeg: SpliceItem = {
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trackId: activeTrack.id,
      sourceName: activeTrack.name,
      buffer: activeTrack.audioBuffer,
      startTime,
      endTime,
      fadeIn,
      fadeOut,
    };
    setSpliceList((prev) => [...prev, newSeg]);
  };

  const moveSpliceItem = (index: number, dir: -1 | 1) => {
    setSpliceList((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const removeSpliceItem = (id: string) => {
    setSpliceList((prev) => prev.filter((item) => item.id !== id));
  };

  // Render & Save final trimmed / spliced soundtrack
  const handleSaveAndApply = async () => {
    if (!activeTrack && spliceList.length === 0) return;
    stopPreview();
    setIsRendering(true);

    try {
      const segmentsToRender: RenderSegmentInput[] =
        spliceList.length > 0
          ? spliceList.map((s) => ({
              id: s.id,
              sourceName: s.sourceName,
              buffer: s.buffer,
              startTime: s.startTime,
              endTime: s.endTime,
              fadeIn: s.fadeIn,
              fadeOut: s.fadeOut,
            }))
          : activeTrack
          ? [
              {
                id: `seg-${Date.now()}`,
                sourceName: activeTrack.name,
                buffer: activeTrack.audioBuffer,
                startTime,
                endTime,
                fadeIn,
                fadeOut,
              },
            ]
          : [];

      const { blob, duration } = await renderSplicedAudioSegments(segmentsToRender);

      const labelName =
        segmentsToRender.length === 1
          ? `${segmentsToRender[0].sourceName.replace(/\.[^/.]+$/, '')} (${formatAudioTime(
              segmentsToRender[0].startTime
            )}–${formatAudioTime(segmentsToRender[0].endTime)})`
          : `${ isVi ? 'Nhạc ghép' : 'Spliced Mix' } (${segmentsToRender.length} ${
              isVi ? 'đoạn' : 'clips'
            } • ${Math.round(duration)}s)`;

      const savedRecord: StoredAudio = {
        id: `audio-${albumId}`,
        albumId,
        name: labelName,
        mimeType: 'audio/wav',
        blob,
        duration,
        segments: segmentsToRender.map((s) => ({
          id: s.id,
          sourceName: s.sourceName,
          startTime: s.startTime,
          endTime: s.endTime,
          fadeIn: s.fadeIn,
          fadeOut: s.fadeOut,
        })),
        createdAt: new Date().toISOString(),
      };

      onSaved(savedRecord);
    } catch (err) {
      console.error('Failed to render trimmed audio:', err);
    } finally {
      setIsRendering(false);
    }
  };

  if (!isOpen) return null;

  const currentCutDuration = Math.max(0, endTime - startTime);
  const totalSpliceDuration =
    spliceList.length > 0
      ? spliceList.reduce((acc, s) => acc + Math.max(0, s.endTime - s.startTime), 0)
      : currentCutDuration;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto select-none"
    >
      <div className="bg-[#1B1815] border border-white/15 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden text-ivory">
        {/* Header */}
        <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta/20 border border-terracotta/40 flex items-center justify-center text-gold">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-semibold text-ivory">
                {isVi
                  ? 'Phòng Thu Cắt & Ghép Nhạc Nền Trình Chiếu'
                  : 'Slideshow Audio Trimmer & Splicer Studio'}
              </h2>
              <p className="text-xs text-ivory/60">
                {isVi
                  ? 'Kéo thanh giới hạn trên sóng nhạc để cắt đúng điệp khúc yêu thích hoặc ghép nhiều đoạn nhạc với nhau'
                  : 'Drag handles on the waveform to trim your favorite chorus or splice multiple audio clips'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-ivory/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs max-h-[78vh] overflow-y-auto">
          {/* Source Audio Track Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {tracks.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => selectTrack(tr)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                    activeTrackId === tr.id
                      ? 'bg-gold/20 border-gold text-gold font-semibold'
                      : 'bg-white/5 border-white/10 text-ivory/75 hover:bg-white/10'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span className="max-w-[180px] truncate">{tr.name}</span>
                  <span className="text-[10px] opacity-75">({formatAudioTime(tr.duration)})</span>
                </button>
              ))}

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-terracotta hover:bg-gold hover:text-charcoal text-white font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isVi ? '+ Tải file nhạc (MP3/WAV/M4A)' : '+ Upload Audio File'}</span>
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/*"
                  multiple
                  onChange={handleAddFiles}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {isDecoding ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 bg-black/30 rounded-2xl border border-white/10">
              <Loader2 className="w-7 h-7 animate-spin text-gold" />
              <span className="text-ivory/80 font-medium">
                {isVi ? 'Đang phân tích sóng nhạc...' : 'Analyzing audio waveform...'}
              </span>
            </div>
          ) : !activeTrack ? (
            <label className="cursor-pointer py-14 flex flex-col items-center justify-center gap-3 bg-black/30 hover:bg-black/45 rounded-2xl border border-dashed border-gold/40 transition-colors">
              <Upload className="w-8 h-8 text-gold" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-ivory">
                  {isVi
                    ? 'Nhấp để chọn bài hát từ máy tính / điện thoại của bạn'
                    : 'Click to choose a song from your device'}
                </p>
                <p className="text-xs text-ivory/55">
                  {isVi
                    ? 'Hỗ trợ MP3, WAV, M4A, OGG — Cắt đoạn nhạc bất kỳ hoặc ghép nhiều bài'
                    : 'Supports MP3, WAV, M4A, OGG — Trim any chorus or splice multiple songs'}
                </p>
              </div>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/*"
                multiple
                onChange={handleAddFiles}
                className="hidden"
              />
            </label>
          ) : (
            /* Waveform Editor Card */
            <div className="bg-black/35 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-gold/20 text-gold font-semibold">
                    {isVi ? 'Vùng đang chọn:' : 'Selected Cut:'} {formatAudioTime(startTime)} →{' '}
                    {formatAudioTime(endTime)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-ivory/90 font-medium">
                    {isVi ? 'Thời lượng:' : 'Length:'} {currentCutDuration.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime(0);
                      setEndTime(activeTrack.duration);
                      setPlayheadTime(0);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-ivory/80"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isVi ? 'Chọn cả bài' : 'Full Song'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePreviewCut}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold text-charcoal font-semibold hover:bg-ivory transition-colors shadow-xs"
                  >
                    {isPreviewing ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Dừng nghe thử' : 'Stop Preview'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Nghe thử đoạn cắt' : 'Preview Cut'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Waveform Canvas */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  className="w-full h-28 rounded-xl bg-[#110F0D] cursor-ew-resize touch-none border border-white/10"
                />
                <div className="flex justify-between text-[10px] text-ivory/50 mt-1 px-1">
                  <span>00:00.0</span>
                  <span>
                    {isVi
                      ? '⇄ Kéo 2 thanh cam hai đầu trên sóng nhạc để cắt đoạn bạn thích'
                      : '⇄ Drag the orange handles on the waveform to trim'}
                  </span>
                  <span>{formatAudioTime(activeTrack.duration)}</span>
                </div>
              </div>

              {/* Fine-tune Sliders & Fade Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ivory/75 font-medium">
                      {isVi ? 'Điểm bắt đầu (Start):' : 'Start Time:'}
                    </span>
                    <span className="text-gold font-semibold">{formatAudioTime(startTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.5, endTime - 1)}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), endTime - 1);
                      setStartTime(val);
                      setPlayheadTime(val);
                    }}
                    className="w-full accent-gold"
                  />
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ivory/75 font-medium">
                      {isVi ? 'Điểm kết thúc (End):' : 'End Time:'}
                    </span>
                    <span className="text-gold font-semibold">{formatAudioTime(endTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(activeTrack.duration, startTime + 1)}
                    max={activeTrack.duration}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), startTime + 1);
                      setEndTime(val);
                    }}
                    className="w-full accent-gold"
                  />
                </div>
              </div>

              {/* Fade In / Fade Out & Add to Splice Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ivory/65">
                      {isVi ? 'Nhạc vào êm (Fade In):' : 'Fade In:'}
                    </span>
                    {[0, 1, 2, 3].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFadeIn(s)}
                        className={`px-2 py-0.5 rounded ${
                          fadeIn === s ? 'bg-terracotta text-white font-semibold' : 'bg-white/10'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-ivory/65">
                      {isVi ? 'Nhạc tắt êm (Fade Out):' : 'Fade Out:'}
                    </span>
                    {[0, 1, 2, 3].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFadeOut(s)}
                        className={`px-2 py-0.5 rounded ${
                          fadeOut === s ? 'bg-terracotta text-white font-semibold' : 'bg-white/10'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSegmentToSplice}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-gold hover:text-charcoal text-gold border border-gold/40 font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isVi
                      ? 'Thêm đoạn này vào Danh sách ghép nối'
                      : 'Add Segment to Splice List'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Multi-Segment Splice Timeline (Optional) */}
          {spliceList.length > 0 && (
            <div className="bg-black/40 border border-gold/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <h3 className="font-semibold text-ivory text-sm">
                    {isVi
                      ? `Danh sách ghép nối (${spliceList.length} đoạn • Tổng ${totalSpliceDuration.toFixed(
                          1
                        )}s)`
                      : `Splice Timeline (${spliceList.length} clips • Total ${totalSpliceDuration.toFixed(
                          1
                        )}s)`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSpliceList([])}
                  className="text-[11px] text-red-400 hover:underline"
                >
                  {isVi ? 'Xóa danh sách ghép' : 'Clear splice list'}
                </button>
              </div>

              <div className="space-y-2">
                {spliceList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-gold text-charcoal font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-medium text-ivory truncate">{item.sourceName}</div>
                        <div className="text-[11px] text-gold">
                          {formatAudioTime(item.startTime)} → {formatAudioTime(item.endTime)} (
                          {(item.endTime - item.startTime).toFixed(1)}s • Fade {item.fadeIn}s/
                          {item.fadeOut}s)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSpliceItem(idx, -1)}
                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === spliceList.length - 1}
                        onClick={() => moveSpliceItem(idx, 1)}
                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSpliceItem(item.id)}
                        className="p-1.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/50 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-ivory/65">
            {spliceList.length > 0
              ? isVi
                ? `Sẽ nối liền ${spliceList.length} đoạn nhạc (${totalSpliceDuration.toFixed(1)}s)`
                : `Will splice ${spliceList.length} segments (${totalSpliceDuration.toFixed(1)}s)`
              : activeTrack
              ? isVi
                ? `Sẽ lấy đoạn nhạc ${formatAudioTime(startTime)} → ${formatAudioTime(
                    endTime
                  )} (${currentCutDuration.toFixed(1)}s)`
                : `Will trim ${formatAudioTime(startTime)} → ${formatAudioTime(
                    endTime
                  )} (${currentCutDuration.toFixed(1)}s)`
              : ''}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isRendering}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-ivory/75 hover:text-white"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={(!activeTrack && spliceList.length === 0) || isRendering}
              onClick={handleSaveAndApply}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-gold hover:text-charcoal text-white text-xs font-semibold transition-colors shadow-md disabled:opacity-40"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isVi ? 'Đang cắt & xử lý nhạc...' : 'Rendering audio...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {spliceList.length > 0
                      ? isVi
                        ? `Lưu & Ghép ${spliceList.length} Đoạn Nhạc`
                        : `Save & Splice ${spliceList.length} Clips`
                      : isVi
                      ? 'Cắt & Áp Dụng Đoạn Nhạc Này'
                      : 'Trim & Apply This Segment'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
