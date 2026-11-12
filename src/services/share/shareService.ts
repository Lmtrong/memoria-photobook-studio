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
 * Compresses a photo Blob for high-resolution web sharing (max 1600px, WebP/JPEG 0.88)
 * so the shared link loads quickly for visitors while staying crystal-clear on HD monitors.
 */
async function optimizePhotoBlobForSharing(blob: Blob): Promise<string> {
  if (blob.size <= 380 * 1024) {
    return blobToDataUrl(blob);
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1600;
      const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        blobToDataUrl(blob).then(resolve);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);

      // Prefer WebP for crisp quality at small size, fallback to JPEG
      let dataUrl = canvas.toDataURL('image/webp', 0.86);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      blobToDataUrl(blob).then(resolve);
    };
    img.src = url;
  });
}

/**
 * Builds a complete portable bundle containing the Album, all used Photos, and the Trimmed Audio.
 */
export async function buildSharedAlbumBundle(albumId: string): Promise<SharedAlbumBundle | null> {
  const album = await db.albums.get(albumId);
  if (!album) return null;

  // Collect only photos used in the album (cover + page slots) so payload is lean
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
    relevantPhotos.map(async (p) => ({
      id: p.id,
      albumId: p.albumId,
      name: p.name,
      mimeType: p.mimeType,
      width: p.width,
      height: p.height,
      dataUrl: await optimizePhotoBlobForSharing(p.originalBlob),
      thumbnailDataUrl: p.thumbnailDataUrl,
      createdAt: p.createdAt,
    }))
  );

  const audioRec = await db.audios.where('albumId').equals(albumId).first();
  let serializedAudio: SerializedSharedAudio | null = null;
  if (audioRec && audioRec.blob) {
    serializedAudio = {
      id: audioRec.id,
      albumId: audioRec.albumId,
      name: audioRec.name,
      mimeType: audioRec.mimeType,
      dataUrl: await blobToDataUrl(audioRec.blob),
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
 * Publishes the album bundle to:
 * 1) Local / LAN server endpoint `/api/shared-albums/:albumId` (so anyone on the same server/LAN can open `/slideshow/:albumId` directly)
 * 2) Public Cloud Relay (`https://bytebin.lucko.me/post`) so anyone on the internet clicking `/slideshow/:albumId?s=<key>` sees the album & hears the music!
 */
export async function publishSharedAlbumLink(albumId: string): Promise<{
  shareUrl: string;
  shareKey: string | null;
}> {
  const bundle = await buildSharedAlbumBundle(albumId);
  if (!bundle) {
    return {
      shareUrl: `${window.location.origin}/slideshow/${albumId}`,
      shareKey: null,
    };
  }

  const jsonPayload = JSON.stringify(bundle);

  // 1. Sync to local/LAN server middleware (non-blocking if static host)
  try {
    await fetch(`/api/shared-albums/${encodeURIComponent(albumId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonPayload,
    });
  } catch {
    // Ignore on pure static hosting
  }

  // 2. Upload to CORS-enabled public cloud relay (Bytebin) for universal internet sharing
  let cloudKey: string | null = null;
  try {
    const res = await fetch('https://bytebin.lucko.me/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonPayload,
    });
    if (res.ok) {
      const data = (await res.json()) as { key?: string };
      if (data && data.key) {
        cloudKey = data.key;
        await db.albums.update(albumId, { shareKey: cloudKey });
      }
    }
  } catch {
    // Fallback to existing shareKey if offline/LAN-only
    cloudKey = bundle.album.shareKey || null;
  }

  const baseUrl = `${window.location.origin}/slideshow/${albumId}`;
  const shareUrl = cloudKey ? `${baseUrl}?s=${encodeURIComponent(cloudKey)}` : baseUrl;

  return {
    shareUrl,
    shareKey: cloudKey,
  };
}

/**
 * Silently syncs the album bundle to the local/LAN server in the background whenever an album or audio is opened/saved.
 */
export async function syncAlbumToLocalServer(albumId: string): Promise<void> {
  try {
    const bundle = await buildSharedAlbumBundle(albumId);
    if (!bundle) return;
    await fetch(`/api/shared-albums/${encodeURIComponent(albumId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
  } catch {
    // Ignore if not running local server middleware
  }
}

/**
 * Hydrates a SharedAlbumBundle into the visitor's local IndexedDB so photos & trimmed audio work natively.
 */
async function importBundleIntoLocalDb(bundle: SharedAlbumBundle): Promise<{
  album: Album;
  audioRecord: StoredAudio | null;
}> {
  const { album, photos, audio } = bundle;

  const restoredPhotos: StoredPhoto[] = photos.map((p) => {
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
 * Loads an album for Slideshow / Viewer:
 * - If `?s=<shareKey>` is present OR if the album is not in the visitor's IndexedDB,
 *   fetches the shared bundle from the Cloud Relay (`bytebin`) or Local Server (`/api/shared-albums/:albumId`),
 *   hydrates IndexedDB, and returns the album + audio!
 */
export async function loadSharedOrLocalAlbum(
  albumId: string,
  shareKey: string | null
): Promise<{
  album: Album | null;
  audioRecord: StoredAudio | null;
}> {
  // 1. If a cloud shareKey is in the URL and we either don't have the album locally or want the latest shared snapshot:
  const localAlbum = await db.albums.get(albumId);
  const localAudio = (await db.audios.where('albumId').equals(albumId).first()) || null;

  if (shareKey && (!localAlbum || !localAudio)) {
    try {
      const res = await fetch(`https://bytebin.lucko.me/${encodeURIComponent(shareKey)}`);
      if (res.ok) {
        const bundle = (await res.json()) as SharedAlbumBundle;
        if (bundle && bundle.album) {
          return await importBundleIntoLocalDb(bundle);
        }
      }
    } catch (err) {
      console.warn('Cloud share fetch failed, trying local fallback:', err);
    }
  }

  // 2. If we already have the album in local IndexedDB:
  if (localAlbum) {
    // Also trigger background sync to local server so LAN visitors can open `/slideshow/:albumId` anytime
    syncAlbumToLocalServer(albumId);
    return {
      album: localAlbum,
      audioRecord: localAudio,
    };
  }

  // 3. Not in local IndexedDB -> Try fetching from LAN / Local Server (`/api/shared-albums/:albumId`)
  try {
    const res = await fetch(`/api/shared-albums/${encodeURIComponent(albumId)}`);
    if (res.ok) {
      const bundle = (await res.json()) as SharedAlbumBundle;
      if (bundle && bundle.album) {
        return await importBundleIntoLocalDb(bundle);
      }
    }
  } catch {
    // ignore
  }

  // 4. Last resort: if shareKey was present even if step 1 skipped
  if (shareKey) {
    try {
      const res = await fetch(`https://bytebin.lucko.me/${encodeURIComponent(shareKey)}`);
      if (res.ok) {
        const bundle = (await res.json()) as SharedAlbumBundle;
        if (bundle && bundle.album) {
          return await importBundleIntoLocalDb(bundle);
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    album: null,
    audioRecord: null,
  };
}
