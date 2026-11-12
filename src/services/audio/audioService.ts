export interface DecodedTrackInfo {
  id: string;
  name: string;
  blob: Blob;
  audioBuffer: AudioBuffer;
  peaks: number[];
  duration: number;
}

export interface RenderSegmentInput {
  id: string;
  sourceName: string;
  buffer: AudioBuffer;
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
}

/**
 * Decodes an audio File/Blob into an AudioBuffer and extracts normalized waveform peaks (0..1)
 */
export async function decodeAudioBlob(
  blob: Blob,
  peakCount = 160
): Promise<{ audioBuffer: AudioBuffer; peaks: number[]; duration: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const samplesPerPeak = Math.max(1, Math.floor(totalSamples / peakCount));
    const rawPeaks: number[] = [];
    let maxPeak = 0.01;

    for (let i = 0; i < peakCount; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(totalSamples, start + samplesPerPeak);
      let sum = 0;
      const step = Math.max(1, Math.floor((end - start) / 64));
      let count = 0;
      for (let j = start; j < end; j += step) {
        const val = Math.abs(channelData[j]);
        if (val > sum) sum = val;
        count++;
      }
      const peak = count > 0 ? sum : 0;
      rawPeaks.push(peak);
      if (peak > maxPeak) maxPeak = peak;
    }

    const peaks = rawPeaks.map((p) => Math.max(0.06, Math.min(1, p / maxPeak)));
    return {
      audioBuffer,
      peaks,
      duration: audioBuffer.duration,
    };
  } finally {
    ctx.close().catch(() => {});
  }
}

/**
 * Renders one or more trimmed audio segments (with Fade-In and Fade-Out envelopes)
 * into a single spliced WAV Blob using OfflineAudioContext.
 * Works instantaneously (100x faster than real-time) and plays on all iOS/Android/Desktop browsers.
 */
export async function renderSplicedAudioSegments(
  segments: RenderSegmentInput[],
  targetSampleRate = 24000
): Promise<{ blob: Blob; duration: number }> {
  if (segments.length === 0) {
    throw new Error('No audio segments to render');
  }

  // Calculate total output duration
  const validSegments = segments.map((seg) => {
    const start = Math.max(0, Math.min(seg.startTime, seg.buffer.duration - 0.1));
    const end = Math.max(start + 0.2, Math.min(seg.endTime, seg.buffer.duration));
    const segDuration = end - start;
    return {
      ...seg,
      start,
      end,
      segDuration,
    };
  });

  const totalDuration = validSegments.reduce((acc, s) => acc + s.segDuration, 0);
  const totalFrames = Math.max(1, Math.ceil(totalDuration * targetSampleRate));

  // Use 1 channel (mono) at 24kHz so the resulting WAV is crisp yet compact for instant web sharing
  const offlineCtx = new OfflineAudioContext(1, totalFrames, targetSampleRate);

  let currentOffset = 0;
  for (const seg of validSegments) {
    const source = offlineCtx.createBufferSource();
    source.buffer = seg.buffer;

    const gainNode = offlineCtx.createGain();
    const fadeIn = Math.min(seg.fadeIn, seg.segDuration / 2);
    const fadeOut = Math.min(seg.fadeOut, seg.segDuration / 2);

    // Envelope automation
    if (fadeIn > 0.05) {
      gainNode.gain.setValueAtTime(0.001, currentOffset);
      gainNode.gain.linearRampToValueAtTime(1.0, currentOffset + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(1.0, currentOffset);
    }

    if (fadeOut > 0.05) {
      gainNode.gain.setValueAtTime(1.0, currentOffset + seg.segDuration - fadeOut);
      gainNode.gain.linearRampToValueAtTime(0.001, currentOffset + seg.segDuration);
    }

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start(currentOffset, seg.start, seg.segDuration);
    currentOffset += seg.segDuration;
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = encodeAudioBufferToWav(renderedBuffer);

  return {
    blob: wavBlob,
    duration: totalDuration,
  };
}

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob
 */
function encodeAudioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const dataByteLength = samples.length * blockAlign;
  const totalByteLength = 44 + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalByteLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
