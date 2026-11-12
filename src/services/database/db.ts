import Dexie, { Table } from 'dexie';
import {
  Album,
  AlbumFormat,
  AlbumPage,
  AlbumThemeId,
  PhotoSlot,
  PredefinedLayout,
  StoredAudio,
  StoredPhoto,
} from '../../types';
import { PREDEFINED_LAYOUTS, THEME_PRESETS } from '../../utils/constants';
import { generateSamplePhotoBlob } from '../image/imageService';

export class MemoriaDatabase extends Dexie {
  albums!: Table<Album, string>;
  photos!: Table<StoredPhoto, string>;
  audios!: Table<StoredAudio, string>;

  constructor() {
    super('MemoriaPhotoBookStudioDB');
    this.version(1).stores({
      albums: 'id, title, updatedAt, createdAt, format, themeId',
      photos: 'id, albumId, name, createdAt',
      audios: 'id, albumId, createdAt',
    });
  }
}

export const db = new MemoriaDatabase();

export function createPageFromLayout(
  pageNumber: number,
  layout: PredefinedLayout,
  themeId: AlbumThemeId,
  photoIds: (string | null)[] = []
): AlbumPage {
  const theme = THEME_PRESETS[themeId] || THEME_PRESETS['luxury-minimalist'];

  const photoSlots: PhotoSlot[] = layout.slots.map((slot, idx) => ({
    id: `slot-${Date.now()}-${pageNumber}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
    rotation: slot.rotation ?? 0,
    zIndex: idx + 1,
    photoId: photoIds[idx] ?? null,
    cropX: 0,
    cropY: 0,
    cropZoom: 1,
    fitMode: 'cover',
    borderWidth: slot.borderWidth ?? theme.defaultPhotoBorderWidth,
    borderColor: theme.defaultPhotoBorderColor,
    cornerRadius: slot.cornerRadius ?? theme.defaultPhotoCornerRadius,
    shadow: slot.shadow ?? theme.defaultPhotoShadow,
    opacity: 1,
  }));

  return {
    id: `page-${Date.now()}-${pageNumber}-${Math.random().toString(36).slice(2, 7)}`,
    pageNumber,
    layoutId: layout.id,
    backgroundColor: theme.defaultPageBg,
    backgroundPattern: theme.defaultPattern,
    padding: 16,
    photoSlots,
    textElements: [],
    stickers: [],
  };
}

export async function ensureSampleAlbumInitialized(forceCreate = false): Promise<void> {
  const SAMPLE_FLAG_KEY = 'memoria_sample_album_initialized_v1';

  if (!forceCreate) {
    const alreadyInitialized = localStorage.getItem(SAMPLE_FLAG_KEY);
    const existingCount = await db.albums.count();
    if (alreadyInitialized === 'true' || existingCount > 0) {
      return;
    }
  }

  const albumId = `album-sample-${Date.now()}`;
  const now = new Date().toISOString();
  const theme = THEME_PRESETS['luxury-minimalist'];

  // Generate 10 local sample photographs
  const createdPhotos: StoredPhoto[] = [];
  for (let i = 0; i < 10; i++) {
    const sample = await generateSamplePhotoBlob(i);
    const photoRecord: StoredPhoto = {
      id: `photo-sample-${albumId}-${i}`,
      albumId,
      name: sample.name,
      mimeType: 'image/jpeg',
      width: sample.width,
      height: sample.height,
      size: sample.blob.size,
      originalBlob: sample.blob,
      thumbnailDataUrl: sample.thumbnailDataUrl,
      createdAt: now,
    };
    createdPhotos.push(photoRecord);
  }

  await db.photos.bulkPut(createdPhotos);

  const layout4Hero = PREDEFINED_LAYOUTS.find((l) => l.id === 'layout-4-hero-left')!;
  const layout5Collage = PREDEFINED_LAYOUTS.find((l) => l.id === 'layout-5-editorial-collage')!;
  const layout4Asym = PREDEFINED_LAYOUTS.find((l) => l.id === 'layout-4-asymmetric')!;
  const layout6Mosaic = PREDEFINED_LAYOUTS.find((l) => l.id === 'layout-6-two-large-four-small')!;

  const page1 = createPageFromLayout(
    1,
    layout4Hero,
    'luxury-minimalist',
    [createdPhotos[0].id, createdPhotos[1].id, createdPhotos[2].id, createdPhotos[3].id]
  );
  page1.textElements = [
    {
      id: 'txt-sample-1',
      content: 'Chapter I — Quiet Mornings',
      x: 8,
      y: 2,
      width: 50,
      fontFamily: 'Cormorant Garamond',
      fontSize: 24,
      fontWeight: 'semibold',
      fontStyle: 'italic',
      color: '#39332F',
      textAlign: 'left',
      letterSpacing: 1,
      rotation: 0,
      opacity: 1,
      zIndex: 15,
    },
    {
      id: 'txt-sample-2',
      content: 'Golden sunlight pouring across the wooden table...',
      x: 6,
      y: 93,
      width: 60,
      fontFamily: 'Caveat',
      fontSize: 22,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#6E5A4F',
      textAlign: 'left',
      letterSpacing: 0,
      rotation: -1,
      opacity: 0.95,
      zIndex: 16,
    },
  ];
  page1.stickers = [
    {
      id: 'stk-sample-1',
      stickerType: 'washi-beige',
      x: 24,
      y: 5,
      width: 18,
      height: 5,
      rotation: -4,
      opacity: 0.85,
      zIndex: 20,
      color: '#D8C7B4',
    },
  ];

  const page2 = createPageFromLayout(
    2,
    layout5Collage,
    'luxury-minimalist',
    [
      createdPhotos[4].id,
      createdPhotos[5].id,
      createdPhotos[6].id,
      createdPhotos[7].id,
      createdPhotos[8].id,
    ]
  );
  page2.backgroundColor = '#F3E9D2';
  page2.backgroundPattern = 'vintage';
  page2.textElements = [
    {
      id: 'txt-sample-3',
      content: 'The beauty of unhurried days',
      x: 50,
      y: 2.5,
      width: 44,
      fontFamily: 'Cormorant Garamond',
      fontSize: 22,
      fontWeight: 'normal',
      fontStyle: 'italic',
      color: '#543D2E',
      textAlign: 'right',
      letterSpacing: 0.5,
      rotation: 0,
      opacity: 1,
      zIndex: 15,
    },
  ];
  page2.stickers = [
    {
      id: 'stk-sample-2',
      stickerType: 'stamp-postmark',
      x: 72,
      y: 82,
      width: 22,
      height: 13,
      rotation: -6,
      opacity: 0.8,
      zIndex: 22,
      color: '#6B4F3B',
      label: 'AUTUMN • 2026',
    },
  ];

  const page3 = createPageFromLayout(
    3,
    layout4Asym,
    'luxury-minimalist',
    [createdPhotos[9].id, createdPhotos[2].id, createdPhotos[6].id, createdPhotos[0].id]
  );
  page3.backgroundColor = '#EFE9DF';
  page3.backgroundPattern = 'linen';
  page3.stickers = [
    {
      id: 'stk-sample-3',
      stickerType: 'flower-pressed-branch',
      x: 46,
      y: 40,
      width: 14,
      height: 18,
      rotation: 12,
      opacity: 0.85,
      zIndex: 25,
      color: '#6E7F68',
    },
    {
      id: 'stk-sample-4',
      stickerType: 'label-tag',
      x: 8,
      y: 88,
      width: 24,
      height: 8,
      rotation: 0,
      opacity: 0.95,
      zIndex: 26,
      color: '#C9B39B',
      label: 'Little Moments',
    },
  ];

  const page4 = createPageFromLayout(
    4,
    layout6Mosaic,
    'luxury-minimalist',
    [
      createdPhotos[3].id,
      createdPhotos[7].id,
      createdPhotos[1].id,
      createdPhotos[5].id,
      createdPhotos[8].id,
      createdPhotos[9].id,
    ]
  );
  page4.textElements = [
    {
      id: 'txt-sample-4',
      content: 'Every photograph keeps a whisper of who we were.',
      x: 15,
      y: 93,
      width: 70,
      fontFamily: 'Cormorant Garamond',
      fontSize: 20,
      fontWeight: 'medium',
      fontStyle: 'italic',
      color: '#39332F',
      textAlign: 'center',
      letterSpacing: 1,
      rotation: 0,
      opacity: 0.9,
      zIndex: 18,
    },
  ];

  const sampleAlbum: Album = {
    id: albumId,
    title: 'Little Moments',
    description:
      'Những khoảnh khắc bình yên của nắng sớm, tách cà phê thơm và những chuyến dạo bước mùa thu — A curated keepsake of quiet everyday beauty.',
    author: 'Memoria Studio',
    createdAt: now,
    updatedAt: now,
    format: 'landscape' as AlbumFormat,
    themeId: 'luxury-minimalist',
    cover: {
      backgroundColor: theme.defaultCoverBg,
      spineColor: theme.defaultSpineColor,
      borderColor: '#C5A059',
      coverPhotoId: createdPhotos[0].id,
      title: 'Little Moments',
      subtitle: 'COLLECTION • MMXXVI',
      titleFont: 'Cormorant Garamond',
      titleColor: theme.defaultCoverTextColor,
      layoutStyle: 'classic',
    },
    pages: [page1, page2, page3, page4],
    isSample: true,
  };

  await db.albums.put(sampleAlbum);
  localStorage.setItem(SAMPLE_FLAG_KEY, 'true');
}

export async function duplicateAlbumInDb(sourceAlbumId: string, suffix: string): Promise<Album | null> {
  const source = await db.albums.get(sourceAlbumId);
  if (!source) return null;

  const newAlbumId = `album-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // Duplicate photos belonging to source album
  const sourcePhotos = await db.photos.where('albumId').equals(sourceAlbumId).toArray();
  const photoIdMap = new Map<string, string>();
  const clonedPhotos: StoredPhoto[] = sourcePhotos.map((p) => {
    const newPhotoId = `photo-${newAlbumId}-${Math.random().toString(36).slice(2, 9)}`;
    photoIdMap.set(p.id, newPhotoId);
    return {
      ...p,
      id: newPhotoId,
      albumId: newAlbumId,
      createdAt: now,
    };
  });

  if (clonedPhotos.length > 0) {
    await db.photos.bulkPut(clonedPhotos);
  }

  const newPages: AlbumPage[] = source.pages.map((page) => ({
    ...page,
    id: `page-${Date.now()}-${page.pageNumber}-${Math.random().toString(36).slice(2, 6)}`,
    photoSlots: page.photoSlots.map((slot) => ({
      ...slot,
      id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      photoId: slot.photoId ? (photoIdMap.get(slot.photoId) ?? null) : null,
    })),
    textElements: page.textElements.map((txt) => ({
      ...txt,
      id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    })),
    stickers: page.stickers.map((stk) => ({
      ...stk,
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    })),
  }));

  const duplicatedAlbum: Album = {
    ...source,
    id: newAlbumId,
    title: `${source.title} ${suffix}`,
    createdAt: now,
    updatedAt: now,
    isSample: false,
    cover: {
      ...source.cover,
      title: `${source.cover.title} ${suffix}`,
      coverPhotoId: source.cover.coverPhotoId
        ? (photoIdMap.get(source.cover.coverPhotoId) ?? null)
        : null,
    },
    pages: newPages,
  };

  await db.albums.put(duplicatedAlbum);
  return duplicatedAlbum;
}

export async function deleteAlbumFromDb(albumId: string): Promise<void> {
  await db.transaction('rw', db.albums, db.photos, db.audios, async () => {
    await db.photos.where('albumId').equals(albumId).delete();
    await db.audios.where('albumId').equals(albumId).delete();
    await db.albums.delete(albumId);
  });
}

export async function estimateStorageUsage(): Promise<{ usedMB: string; quotaMB: string; percent: number }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const used = est.usage || 0;
      const quota = est.quota || 1024 * 1024 * 500;
      return {
        usedMB: (used / (1024 * 1024)).toFixed(1),
        quotaMB: (quota / (1024 * 1024)).toFixed(0),
        percent: Math.min(100, Math.round((used / quota) * 100)),
      };
    }
  } catch {
    // ignore
  }
  return { usedMB: '1.2', quotaMB: '500', percent: 1 };
}
