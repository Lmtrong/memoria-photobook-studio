import { db } from '../database/db';
import { Album, AudioSegmentConfig, StoredAudio, StoredPhoto } from '../../types';

export interface SerializedSharedPhoto {
  id: string;
  albumId: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  dataUrl: string;
  thumbnailDataUrl: string;
  createdAt: string;
}

export interface SerializedSharedAudio {
  id: string;
  albumId: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  duration?: number;
  segments?: AudioSegmentConfig[];
  createdAt: string;
}

export interface SharedAlbumBundle {
  version: 1;
  exportedAt: string;
  album: Album;
  photos: SerializedSharedPhoto[];
  audio: SerializedSharedAudio | null;
}

// Session-level memoization caches so each photo/audio is compressed at most ONCE per session (0ms on repeat syncs)
const serializedPhotoCache = new Map<string, string>();
const serializedAudioCache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert Blob to DataURL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const base64 = parts[1] || '';
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Compresses a photo Blob for high-resolution web sharing (max 1200px, WebP/JPEG 0.84)
 * and caches it by `photoId` so subsequent syncs take 0ms.
 */
async function optimizePhotoBlobForSharing(photoId: string, blob: Blob): Promise<string> {
  const cached = serializedPhotoCache.get(photoId);
  if (cached) return cached;

  if (blob.size <= 260 * 1024) {
    const dataUrl = await blobToDataUrl(blob);
    serializedPhotoCache.set(photoId, dataUrl);
    return dataUrl;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1200;
      const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        blobToDataUrl(blob).then((d) => {
          serializedPhotoCache.set(photoId, d);
          resolve(d);
        });
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);

      let dataUrl = canvas.toDataURL('image/webp', 0.84);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      }
      serializedPhotoCache.set(photoId, dataUrl);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      blobToDataUrl(blob).then((d) => {
        serializedPhotoCache.set(photoId, d);
        resolve(d);
      });
    };
    img.src = url;
  });
}

async function optimizeAudioBlobForSharing(audio: StoredAudio): Promise<string> {
  const cacheKey = `${audio.id}:${audio.createdAt}:${audio.blob.size}`;
  const cached = serializedAudioCache.get(cacheKey);
  if (cached) return cached;

  const dataUrl = await blobToDataUrl(audio.blob);
  serializedAudioCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Builds a complete portable bundle containing the Album, all used Photos, and the Trimmed Audio.
 */
export async function buildSharedAlbumBundle(albumId: string): Promise<SharedAlbumBundle | null> {
  const album = await db.albums.get(albumId);
  if (!album) return null;

  // Collect only photos used in the album (cover + page slots) so payload is lean and fast
  const usedPhotoIds = new Set<string>();
  if (album.cover.coverPhotoId) {
    usedPhotoIds.add(album.cover.coverPhotoId);
  }
  for (const page of album.pages) {
    for (const slot of page.photoSlots) {
      if (slot.photoId) usedPhotoIds.add(slot.photoId);
    }
  }

  const allAlbumPhotos = await db.photos.where('albumId').equals(albumId).toArray();
  const relevantPhotos = allAlbumPhotos.filter((p) => usedPhotoIds.has(p.id));

  const serializedPhotos: SerializedSharedPhoto[] = await Promise.all(
    relevantPhotos.map(async (p) => {
      const optimizedDataUrl = await optimizePhotoBlobForSharing(p.id, p.originalBlob);
      return {
        id: p.id,
        albumId: p.albumId,
        name: p.name,
        mimeType: p.mimeType,
        width: p.width,
        height: p.height,
        dataUrl: optimizedDataUrl,
        // Omit duplicate thumbnailDataUrl to keep bundle 25% smaller; importer falls back to dataUrl
        thumbnailDataUrl: '',
        createdAt: p.createdAt,
      };
    })
  );

  const audioRec = await db.audios.where('albumId').equals(albumId).first();
  let serializedAudio: SerializedSharedAudio | null = null;
  if (audioRec && audioRec.blob && audioRec.blob.size > 0) {
    serializedAudio = {
      id: audioRec.id,
      albumId: audioRec.albumId,
      name: audioRec.name,
      mimeType: audioRec.mimeType,
      dataUrl: await optimizeAudioBlobForSharing(audioRec),
      duration: audioRec.duration,
      segments: audioRec.segments,
      createdAt: audioRec.createdAt,
    };
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    album,
    photos: serializedPhotos,
    audio: serializedAudio,
  };
}

/**
 * Uploads the SharedAlbumBundle through `/api/share` (Vercel Serverless Function / Vite Middleware)
 * and returns the permanent cloud `shareKey` (e.g. `cb_xxxxxx.json`).
 */
export async function uploadAlbumBundleToCloudRelay(albumId: string): Promise<string | null> {
  const bundle = await buildSharedAlbumBundle(albumId);
  if (!bundle) return null;

  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bundle),
    });

    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; key?: string };
      if (data?.key) {
        await db.albums.update(albumId, {
          shareKey: data.key,
          cloudSyncedAt: new Date().toISOString(),
        });
        return data.key;
      }
    }
  } catch (err) {
    console.warn('Cloud relay upload error:', err);
  }

  return bundle.album.shareKey || null;
}

/**
 * Hydrates a SharedAlbumBundle into the visitor's local IndexedDB so photos & trimmed audio work natively.
 */
async function importBundleIntoLocalDb(bundle: SharedAlbumBundle): Promise<{
  album: Album;
  audioRecord: StoredAudio | null;
}> {
  const { album, photos, audio } = bundle;

  const restoredPhotos: StoredPhoto[] = (photos || []).map((p) => {
    const blob = dataUrlToBlob(p.dataUrl);
    return {
      id: p.id,
      albumId: p.albumId,
      name: p.name,
      mimeType: p.mimeType,
      width: p.width,
      height: p.height,
      size: blob.size,
      originalBlob: blob,
      thumbnailDataUrl: p.thumbnailDataUrl || p.dataUrl,
      createdAt: p.createdAt,
    };
  });

  let restoredAudio: StoredAudio | null = null;
  if (audio && audio.dataUrl) {
    const audioBlob = dataUrlToBlob(audio.dataUrl);
    restoredAudio = {
      id: audio.id,
      albumId: audio.albumId,
      name: audio.name,
      mimeType: audio.mimeType,
      blob: audioBlob,
      duration: audio.duration,
      segments: audio.segments,
      createdAt: audio.createdAt,
    };
  }

  await db.transaction('rw', db.albums, db.photos, db.audios, async () => {
    await db.albums.put(album);
    if (restoredPhotos.length > 0) {
      await db.photos.bulkPut(restoredPhotos);
    }
    if (restoredAudio) {
      await db.audios.put(restoredAudio);
    }
  });

  return {
    album,
    audioRecord: restoredAudio,
  };
}

/**
 * Fetches a shared album bundle from `/api/share` by `shareKey` or `albumId`,
 * hydrates the visitor's local IndexedDB, and returns the album + trimmed audio.
 */
export async function loadSharedOrLocalAlbum(
  albumId: string,
  shareKey: string | null
): Promise<{
  album: Album | null;
  audioRecord: StoredAudio | null;
}> {
  // 1. If a cloud shareKey is in the URL, fetch the bundle from `/api/share?key=<shareKey>`
  if (shareKey) {
    try {
      const res = await fetch(
        `/api/share?key=${encodeURIComponent(shareKey)}&albumId=${encodeURIComponent(albumId)}`
      );
      if (res.ok) {
        const bundle = (await res.json()) as SharedAlbumBundle;
        if (bundle && bundle.album) {
          const importedAlbum: Album = {
            ...bundle.album,
            shareKey,
          };
          return await importBundleIntoLocalDb({
            ...bundle,
            album: importedAlbum,
          });
        }
      }
    } catch (err) {
      console.warn('Cloud share fetch failed, trying local fallback:', err);
    }
  }

  // 2. Check local IndexedDB
  const localAlbum = await db.albums.get(albumId);
  const localAudio = (await db.audios.where('albumId').equals(albumId).first()) || null;
  if (localAlbum) {
    return {
      album: localAlbum,
      audioRecord: localAudio,
    };
  }

  // 3. Try fetching by albumId from `/api/share?albumId=<albumId>` (works when on same server/LAN instance)
  try {
    const res = await fetch(`/api/share?albumId=${encodeURIComponent(albumId)}`);
    if (res.ok) {
      const bundle = (await res.json()) as SharedAlbumBundle;
      if (bundle && bundle.album) {
        return await importBundleIntoLocalDb(bundle);
      }
    }
  } catch {
    // ignore
  }

  return {
    album: null,
    audioRecord: null,
  };
}
