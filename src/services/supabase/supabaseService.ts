import { db, StoredUserAccount } from '../database/db';
import { Album, AudioSegmentConfig, StoredAudio, UserProfile } from '../../types';
import { loadSharedOrLocalAlbum, uploadAlbumBundleToCloudRelay } from '../share/shareService';

const SUPABASE_CONFIG_STORAGE_KEY = 'memoria_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface CloudAlbumRecord {
  id: string;
  owner_id: string;
  owner_username: string;
  owner_name: string;
  title: string;
  is_public: boolean;
  album_data: Album;
  photo_urls: Record<string, string>;
  audio_url: string | null;
  audio_meta: {
    id: string;
    name: string;
    mimeType: string;
    duration?: number;
    segments?: AudioSegmentConfig[];
  } | null;
  created_at: string;
  updated_at: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

  if (envUrl && envKey) {
    return { url: envUrl.replace(/\/+$/, ''), anonKey: envKey };
  }

  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SupabaseConfig;
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim().replace(/\/+$/, ''),
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch {
    // ignore
  }

  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = anonKey.trim();
  if (!cleanUrl || !cleanKey) {
    localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    SUPABASE_CONFIG_STORAGE_KEY,
    JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
  );
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('http'));
}

function getHeaders(cfg: SupabaseConfig, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`memoria_salt_v1:${password}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function detectContactType(input: string): 'email' | 'phone' | null {
  const trimmed = input.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) return 'email';

  const normalizedPhone = trimmed.replace(/[\s.-]/g, '');
  const phoneRegex = /^(\+?\d{9,15})$/;
  if (phoneRegex.test(normalizedPhone)) return 'phone';

  return null;
}

export function normalizeContact(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return trimmed.replace(/[\s.-]/g, '');
}

/**
 * Tests whether the configured Supabase project has the `memoria_users` & `memoria_albums` tables ready.
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) {
    return { ok: false, message: 'Chưa nhập Supabase URL hoặc Anon Key.' };
  }
  try {
    const res = await fetch(`${cfg.url}/rest/v1/memoria_users?select=id&limit=1`, {
      headers: getHeaders(cfg),
    });
    if (res.ok) {
      return {
        ok: true,
        message: 'Kết nối Supabase Cloud thành công! Các bảng dữ liệu đã sẵn sàng.',
      };
    }
    const errText = await res.text();
    if (res.status === 404 || errText.includes('memoria_users')) {
      return {
        ok: false,
        message:
          'Đã kết nối tới Supabase nhưng chưa tạo bảng. Hãy copy đoạn mã SQL bên dưới và chạy trong Supabase SQL Editor.',
      };
    }
    return { ok: false, message: `Lỗi phản hồi từ Supabase (${res.status}): ${errText}` };
  } catch (err) {
    return { ok: false, message: `Không thể kết nối tới Supabase URL: ${String(err)}` };
  }
}

/**
 * Registers a new user with Username + (Gmail OR Phone Number) + Password.
 * Saves to Supabase `memoria_users` (if configured) and local IndexedDB `db.users`.
 */
export async function registerUserAccount(params: {
  username: string;
  emailOrPhone: string;
  displayName: string;
  password: string;
}): Promise<UserProfile> {
  const cleanUsername = params.username.trim().toLowerCase();
  const contactType = detectContactType(params.emailOrPhone);
  const cleanContact = normalizeContact(params.emailOrPhone);
  const cleanDisplayName = params.displayName.trim() || cleanUsername;

  if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
    throw new Error(
      'Username cần dài từ 3–30 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới.'
    );
  }
  if (!contactType) {
    throw new Error('Vui lòng nhập địa chỉ Gmail hợp lệ hoặc Số điện thoại (9–15 chữ số).');
  }
  if (params.password.length < 6) {
    throw new Error('Mật khẩu cần có ít nhất 6 ký tự.');
  }

  const passwordHash = await hashPassword(params.password);
  const now = new Date().toISOString();
  const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 1. If Supabase is configured, register in `public.memoria_users`
  if (isSupabaseConfigured()) {
    const cfg = getSupabaseConfig();
    const checkUrl = `${cfg.url}/rest/v1/memoria_users?or=(username.eq.${encodeURIComponent(
      cleanUsername
    )},email_or_phone.eq.${encodeURIComponent(cleanContact)})&select=username,email_or_phone`;

    const checkRes = await fetch(checkUrl, { headers: getHeaders(cfg) });
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as Array<{
        username: string;
        email_or_phone: string;
      }>;
      if (existing.length > 0) {
        if (existing.some((u) => u.username === cleanUsername)) {
          throw new Error('Username này đã có người sử dụng. Vui lòng chọn username khác.');
        }
        throw new Error('Gmail hoặc Số điện thoại này đã được đăng ký.');
      }
    }

    const insertRes = await fetch(`${cfg.url}/rest/v1/memoria_users`, {
      method: 'POST',
      headers: getHeaders(cfg, { Prefer: 'return=representation' }),
      body: JSON.stringify({
        id: userId,
        username: cleanUsername,
        email_or_phone: cleanContact,
        contact_type: contactType,
        display_name: cleanDisplayName,
        password_hash: passwordHash,
        created_at: now,
      }),
    });

    if (!insertRes.ok) {
      const errMsg = await insertRes.text();
      throw new Error(`Không thể tạo tài khoản trên Supabase: ${errMsg}`);
    }
  } else {
    // Check uniqueness in local IndexedDB
    const existingByUser = await db.users.where('username').equals(cleanUsername).first();
    if (existingByUser) {
      throw new Error('Username này đã tồn tại trên thiết bị. Vui lòng chọn username khác.');
    }
    const existingByContact = await db.users.where('emailOrPhone').equals(cleanContact).first();
    if (existingByContact) {
      throw new Error('Gmail hoặc Số điện thoại này đã được đăng ký.');
    }
  }

  const account: StoredUserAccount = {
    id: userId,
    username: cleanUsername,
    emailOrPhone: cleanContact,
    contactType,
    displayName: cleanDisplayName,
    passwordHash,
    createdAt: now,
  };

  await db.users.put(account);
  await claimUnownedLocalAlbums(account);

  const { passwordHash: _omitted, ...profile } = account;
  return profile;
}

/**
 * Logs in a user using Username, Gmail, OR Phone Number + Password.
 */
export async function loginUserAccount(params: {
  identifier: string;
  password: string;
}): Promise<UserProfile> {
  const rawId = params.identifier.trim();
  const cleanId = rawId.includes('@')
    ? rawId.toLowerCase()
    : /^[+\d\s.-]{8,}$/.test(rawId)
    ? normalizeContact(rawId)
    : rawId.toLowerCase();

  const passwordHash = await hashPassword(params.password);

  // 1. Try Supabase Cloud first if configured
  if (isSupabaseConfigured()) {
    const cfg = getSupabaseConfig();
    const queryUrl = `${cfg.url}/rest/v1/memoria_users?or=(username.eq.${encodeURIComponent(
      cleanId
    )},email_or_phone.eq.${encodeURIComponent(cleanId)})&select=*&limit=1`;

    const res = await fetch(queryUrl, { headers: getHeaders(cfg) });
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        id: string;
        username: string;
        email_or_phone: string;
        contact_type: 'email' | 'phone';
        display_name: string;
        password_hash: string;
        created_at: string;
      }>;

      if (rows.length > 0) {
        const row = rows[0];
        if (row.password_hash !== passwordHash) {
          throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        }
        const profile: UserProfile = {
          id: row.id,
          username: row.username,
          emailOrPhone: row.email_or_phone,
          contactType: row.contact_type,
          displayName: row.display_name,
          createdAt: row.created_at,
        };
        await db.users.put({ ...profile, passwordHash });
        await claimUnownedLocalAlbums(profile);
        // Pull user's cloud albums in background
        pullUserAlbumsFromSupabase(profile.id).catch(() => {});
        return profile;
      }
    }
  }

  // 2. Fallback to local IndexedDB `db.users`
  let localAccount = await db.users.where('username').equals(cleanId).first();
  if (!localAccount) {
    localAccount = await db.users.where('emailOrPhone').equals(cleanId).first();
  }

  if (!localAccount) {
    throw new Error(
      'Không tìm thấy tài khoản với Username / Gmail / SĐT này. Vui lòng đăng ký tài khoản mới.'
    );
  }

  if (localAccount.passwordHash !== passwordHash) {
    throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
  }

  const { passwordHash: _omitted, ...profile } = localAccount;
  await claimUnownedLocalAlbums(profile);
  return profile;
}

/**
 * Assigns any existing unowned albums on this browser to the user when they first sign up / log in.
 */
async function claimUnownedLocalAlbums(user: UserProfile): Promise<void> {
  const allAlbums = await db.albums.toArray();
  const unowned = allAlbums.filter((a) => !a.ownerId);
  if (unowned.length === 0) return;

  const updated = unowned.map((a) => ({
    ...a,
    ownerId: user.id,
    ownerUsername: user.username,
    ownerName: user.displayName,
    author: a.author === 'Memoria Studio' ? user.displayName : a.author,
  }));

  await db.albums.bulkPut(updated);
}

/**
 * Uploads a Blob to Supabase Storage bucket `memoria-media` and returns its public CDN URL.
 */
async function uploadBlobToSupabaseStorage(
  storagePath: string,
  blob: Blob,
  contentType: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const cfg = getSupabaseConfig();

  const uploadUrl = `${cfg.url}/storage/v1/object/memoria-media/${storagePath}`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: blob,
  });

  if (!res.ok) {
    console.warn('Supabase storage upload warning:', await res.text());
    return null;
  }

  return `${cfg.url}/storage/v1/object/public/memoria-media/${storagePath}`;
}

// Track active syncs per album so we don't duplicate work
const activeSyncPromises = new Map<string, Promise<string | null>>();

/**
 * Syncs an Album, its used Photos, and its Trimmed Audio to Cloud in the background:
 * 1) If Supabase is configured -> uploads binary photos & audio to `memoria-media` CDN bucket and upserts `public.memoria_albums`.
 * 2) Also updates a lightweight cloud share key (`album.shareKey`) in the background so copying a share link is ALWAYS 0ms instant!
 */
export function syncAlbumToCloudInBackground(
  albumId: string,
  currentUser?: UserProfile | null
): Promise<string | null> {
  const existing = activeSyncPromises.get(albumId);
  if (existing) return existing;

  const promise = (async (): Promise<string | null> => {
    try {
      const album = await db.albums.get(albumId);
      if (!album) return null;

      // Ensure owner fields are stamped if currentUser is owner
      if (currentUser && (!album.ownerId || album.ownerId === currentUser.id)) {
        album.ownerId = currentUser.id;
        album.ownerUsername = currentUser.username;
        album.ownerName = currentUser.displayName;
      }

      // Collect used photo IDs
      const usedPhotoIds = new Set<string>();
      if (album.cover.coverPhotoId) usedPhotoIds.add(album.cover.coverPhotoId);
      for (const p of album.pages) {
        for (const s of p.photoSlots) {
          if (s.photoId) usedPhotoIds.add(s.photoId);
        }
      }

      // PATH A: SUPABASE CLOUD STORAGE + POSTGRESQL DATABASE
      if (isSupabaseConfigured() && album.ownerId) {
        const cfg = getSupabaseConfig();
        const photos = await db.photos.where('albumId').equals(albumId).toArray();
        const usedPhotos = photos.filter((p) => usedPhotoIds.has(p.id));

        const photoUrlsMap: Record<string, string> = {};
        for (const photo of usedPhotos) {
          if (photo.remoteUrl) {
            photoUrlsMap[photo.id] = photo.remoteUrl;
          } else {
            const ext = photo.mimeType.includes('png')
              ? 'png'
              : photo.mimeType.includes('webp')
              ? 'webp'
              : 'jpg';
            const path = `photos/${albumId}/${photo.id}.${ext}`;
            const cdnUrl = await uploadBlobToSupabaseStorage(
              path,
              photo.originalBlob,
              photo.mimeType
            );
            if (cdnUrl) {
              photoUrlsMap[photo.id] = cdnUrl;
              await db.photos.update(photo.id, { remoteUrl: cdnUrl });
            }
          }
        }

        const audioRec = await db.audios.where('albumId').equals(albumId).first();
        let audioCdnUrl: string | null = null;
        let audioMeta: CloudAlbumRecord['audio_meta'] = null;

        if (audioRec && audioRec.blob) {
          audioMeta = {
            id: audioRec.id,
            name: audioRec.name,
            mimeType: audioRec.mimeType,
            duration: audioRec.duration,
            segments: audioRec.segments,
          };
          if (audioRec.remoteUrl) {
            audioCdnUrl = audioRec.remoteUrl;
          } else {
            const path = `audios/${albumId}/${audioRec.id}-${Date.now()}.wav`;
            const uploadedUrl = await uploadBlobToSupabaseStorage(
              path,
              audioRec.blob,
              audioRec.mimeType || 'audio/wav'
            );
            if (uploadedUrl) {
              audioCdnUrl = uploadedUrl;
              await db.audios.update(audioRec.id, { remoteUrl: uploadedUrl });
            }
          }
        }

        const now = new Date().toISOString();
        const record: CloudAlbumRecord = {
          id: album.id,
          owner_id: album.ownerId,
          owner_username: album.ownerUsername || 'user',
          owner_name: album.ownerName || album.author || 'Memoria User',
          title: album.title,
          is_public: album.isPublic ?? true,
          album_data: album,
          photo_urls: photoUrlsMap,
          audio_url: audioCdnUrl,
          audio_meta: audioMeta,
          created_at: album.createdAt,
          updated_at: now,
        };

        const upsertRes = await fetch(`${cfg.url}/rest/v1/memoria_albums?on_conflict=id`, {
          method: 'POST',
          headers: getHeaders(cfg, { Prefer: 'resolution=merge-duplicates' }),
          body: JSON.stringify(record),
        });

        if (upsertRes.ok) {
          await db.albums.update(albumId, { cloudSyncedAt: now });
        }
      }

      // PATH B: Always maintain a pre-generated cloud shareKey via `/api/share` so anyone on any device opening `?s=<key>` sees the exact album, photos, and trimmed music!
      const cloudKey = await uploadAlbumBundleToCloudRelay(albumId);
      return cloudKey || album.shareKey || null;
    } catch (err) {
      console.warn('Background cloud sync warning:', err);
      return null;
    } finally {
      activeSyncPromises.delete(albumId);
    }
  })();

  activeSyncPromises.set(albumId, promise);
  return promise;
}

/**
 * Pulls all albums belonging to `ownerId` from Supabase `memoria_albums` into local IndexedDB.
 */
export async function pullUserAlbumsFromSupabase(ownerId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const cfg = getSupabaseConfig();

  const res = await fetch(
    `${cfg.url}/rest/v1/memoria_albums?owner_id=eq.${encodeURIComponent(
      ownerId
    )}&select=*&order=updated_at.desc`,
    { headers: getHeaders(cfg) }
  );
  if (!res.ok) return;

  const rows = (await res.json()) as CloudAlbumRecord[];
  for (const row of rows) {
    const local = await db.albums.get(row.id);
    if (!local || new Date(row.updated_at).getTime() > new Date(local.updatedAt).getTime()) {
      await db.albums.put({
        ...row.album_data,
        id: row.id,
        ownerId: row.owner_id,
        ownerUsername: row.owner_username,
        ownerName: row.owner_name,
        cloudSyncedAt: row.updated_at,
      });
    }
  }
}

/**
 * Deletes an album from Supabase `memoria_albums` when the owner deletes it.
 */
export async function deleteAlbumFromSupabase(albumId: string, ownerId?: string): Promise<void> {
  if (!isSupabaseConfigured() || !ownerId) return;
  const cfg = getSupabaseConfig();
  try {
    await fetch(
      `${cfg.url}/rest/v1/memoria_albums?id=eq.${encodeURIComponent(
        albumId
      )}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      {
        method: 'DELETE',
        headers: getHeaders(cfg),
      }
    );
  } catch {
    // ignore
  }
}

/**
 * Loads an Album + Photo URLs + Trimmed Audio for SlideshowPage or BookViewerPage.
 * Supports:
 * 1) Local IndexedDB (instant for creator)
 * 2) Supabase `public.memoria_albums` + `memoria-media` CDN (instant for anyone clicking `/slideshow/:albumId`)
 * 3) Cloud Share Key `?s=<key>` fallback (instant for anyone even if Supabase env vars aren't set on Vercel yet)
 */
export async function loadAlbumForPresentation(
  albumId: string,
  shareKeyParam: string | null
): Promise<{
  album: Album | null;
  remotePhotoUrls: Record<string, string>;
  remoteAudioUrl: string | null;
  localAudio: StoredAudio | null;
}> {
  // 1. Check local IndexedDB first
  const localAlbum = await db.albums.get(albumId);
  const localAudio = (await db.audios.where('albumId').equals(albumId).first()) || null;
  const localPhotosCount = await db.photos.where('albumId').equals(albumId).count();

  if (localAlbum && localPhotosCount > 0) {
    return {
      album: localAlbum,
      remotePhotoUrls: {},
      remoteAudioUrl: localAudio?.remoteUrl || null,
      localAudio,
    };
  }

  // 2. Fetch from Supabase Cloud Database (`public.memoria_albums`) if configured
  if (isSupabaseConfigured()) {
    try {
      const cfg = getSupabaseConfig();
      const res = await fetch(
        `${cfg.url}/rest/v1/memoria_albums?id=eq.${encodeURIComponent(albumId)}&select=*&limit=1`,
        { headers: getHeaders(cfg) }
      );
      if (res.ok) {
        const rows = (await res.json()) as CloudAlbumRecord[];
        if (rows.length > 0) {
          const row = rows[0];
          const cloudAlbum: Album = {
            ...row.album_data,
            id: row.id,
            ownerId: row.owner_id,
            ownerUsername: row.owner_username,
            ownerName: row.owner_name,
          };

          const stubAudio: StoredAudio | null = row.audio_meta
            ? {
                id: row.audio_meta.id,
                albumId: row.id,
                name: row.audio_meta.name,
                mimeType: row.audio_meta.mimeType,
                blob: new Blob([]),
                remoteUrl: row.audio_url || undefined,
                duration: row.audio_meta.duration,
                segments: row.audio_meta.segments,
                createdAt: row.updated_at,
              }
            : null;

          return {
            album: cloudAlbum,
            remotePhotoUrls: row.photo_urls || {},
            remoteAudioUrl: row.audio_url,
            localAudio: stubAudio,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase presentation fetch warning:', err);
    }
  }

  // 3. Fallback: Hydrate from `/api/share` cloud relay bundle (via `?s=<shareKey>` or `albumId`)
  const hydrated = await loadSharedOrLocalAlbum(albumId, shareKeyParam);
  if (hydrated.album) {
    return {
      album: hydrated.album,
      remotePhotoUrls: {},
      remoteAudioUrl: null,
      localAudio: hydrated.audioRecord,
    };
  }

  return {
    album: localAlbum || null,
    remotePhotoUrls: {},
    remoteAudioUrl: null,
    localAudio,
  };
}
