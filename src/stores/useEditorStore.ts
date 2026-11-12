import { create } from 'zustand';
import {
  Album,
  AlbumPage,
  AlbumThemeId,
  BackgroundPattern,
  CoverConfig,
  PageBorderStyle,
  PhotoSlot,
  PredefinedLayout,
  StickerElement,
  TextElement,
} from '../types';
import { db, createPageFromLayout } from '../services/database/db';
import { PREDEFINED_LAYOUTS, THEME_PRESETS } from '../utils/constants';

export type SelectedElementType = 'photo' | 'text' | 'sticker' | 'page' | 'cover';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface HistorySnapshot {
  pages: AlbumPage[];
  cover: CoverConfig;
  activePageIndex: number;
}

interface EditorState {
  album: Album | null;
  activePageIndex: number; // -1 if editing cover
  selectedType: SelectedElementType;
  selectedId: string | null;
  saveStatus: SaveStatus;
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Actions
  loadAlbumIntoEditor: (album: Album) => void;
  setActivePageIndex: (index: number) => void;
  selectElement: (type: SelectedElementType, id: string | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  persistAlbumDebounced: () => void;

  // Cover & Theme mutations
  updateCover: (partial: Partial<CoverConfig>, recordHistory?: boolean) => void;
  changeAlbumTheme: (themeId: AlbumThemeId) => void;

  // Page management
  addPage: (layout?: PredefinedLayout, initialPhotoIds?: (string | null)[]) => void;
  duplicatePage: (pageIndex: number) => void;
  deletePage: (pageIndex: number) => boolean;
  reorderPages: (oldIndex: number, newIndex: number) => void;
  updatePageBackground: (
    partial: {
      backgroundColor?: string;
      backgroundPattern?: BackgroundPattern;
      borderStyle?: PageBorderStyle;
      borderColor?: string;
      padding?: number;
    },
    applyToAll?: boolean
  ) => void;

  // Layout switching
  applyLayoutToActivePage: (
    layout: PredefinedLayout,
    overflowStrategy: 'move-next' | 'remove-from-page'
  ) => void;
  addExtraPhotoSlotToActivePage: (photoId?: string | null) => void;

  // Photo slot actions
  assignPhotoToSlot: (slotId: string, photoId: string | null) => void;
  autoAssignPhotoToEmptySlot: (photoId: string) => boolean;
  updatePhotoSlot: (slotId: string, partial: Partial<PhotoSlot>, recordHistory?: boolean) => void;
  deletePhotoSlot: (slotId: string) => void;

  // Text element actions
  addTextElement: (preset: Partial<TextElement>) => void;
  updateTextElement: (textId: string, partial: Partial<TextElement>, recordHistory?: boolean) => void;
  deleteTextElement: (textId: string) => void;

  // Sticker actions
  addStickerElement: (sticker: Omit<StickerElement, 'id' | 'zIndex'>) => void;
  updateStickerElement: (
    stickerId: string,
    partial: Partial<StickerElement>,
    recordHistory?: boolean
  ) => void;
  deleteStickerElement: (stickerId: string) => void;

  // Layer ordering
  shiftElementLayer: (
    elementType: 'photo' | 'text' | 'sticker',
    elementId: string,
    direction: 'up' | 'down'
  ) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function cloneSnapshot(album: Album, activePageIndex: number): HistorySnapshot {
  if (typeof structuredClone === 'function') {
    return {
      pages: structuredClone(album.pages),
      cover: structuredClone(album.cover),
      activePageIndex,
    };
  }
  return {
    pages: JSON.parse(JSON.stringify(album.pages)),
    cover: JSON.parse(JSON.stringify(album.cover)),
    activePageIndex,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  album: null,
  activePageIndex: 0,
  selectedType: 'page',
  selectedId: null,
  saveStatus: 'saved',
  past: [],
  future: [],

  loadAlbumIntoEditor: (album) => {
    if (saveTimer) clearTimeout(saveTimer);
    set({
      album: JSON.parse(JSON.stringify(album)),
      activePageIndex: 0,
      selectedType: 'page',
      selectedId: null,
      saveStatus: 'saved',
      past: [],
      future: [],
    });
  },

  setActivePageIndex: (index) => {
    const { album } = get();
    if (!album) return;
    if (index === -1) {
      set({ activePageIndex: -1, selectedType: 'cover', selectedId: null });
      return;
    }
    const clamped = Math.max(0, Math.min(album.pages.length - 1, index));
    set({ activePageIndex: clamped, selectedType: 'page', selectedId: null });
  },

  selectElement: (type, id) => {
    set({ selectedType: type, selectedId: id });
  },

  pushHistory: () => {
    const { album, activePageIndex, past } = get();
    if (!album) return;
    const snap = cloneSnapshot(album, activePageIndex);
    const nextPast = [...past.slice(-29), snap];
    set({ past: nextPast, future: [] });
  },

  undo: () => {
    const { album, activePageIndex, past, future } = get();
    if (!album || past.length === 0) return;

    const previous = past[past.length - 1];
    const currentSnap = cloneSnapshot(album, activePageIndex);

    const updatedAlbum: Album = {
      ...album,
      pages: previous.pages,
      cover: previous.cover,
      updatedAt: new Date().toISOString(),
    };

    set({
      album: updatedAlbum,
      activePageIndex: Math.min(previous.activePageIndex, updatedAlbum.pages.length - 1),
      past: past.slice(0, -1),
      future: [currentSnap, ...future.slice(0, 29)],
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  redo: () => {
    const { album, activePageIndex, past, future } = get();
    if (!album || future.length === 0) return;

    const next = future[0];
    const currentSnap = cloneSnapshot(album, activePageIndex);

    const updatedAlbum: Album = {
      ...album,
      pages: next.pages,
      cover: next.cover,
      updatedAt: new Date().toISOString(),
    };

    set({
      album: updatedAlbum,
      activePageIndex: Math.min(next.activePageIndex, updatedAlbum.pages.length - 1),
      past: [...past, currentSnap],
      future: future.slice(1),
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  persistAlbumDebounced: () => {
    if ( get().saveStatus !== 'saving') {
      set({ saveStatus: 'saving' });
    }
    if (saveTimer) clearTimeout(saveTimer);

    saveTimer = setTimeout(async () => {
      const currentAlbum = get().album;
      if (!currentAlbum) return;
      try {
        const albumToSave: Album = {
          ...currentAlbum,
          updatedAt: new Date().toISOString(),
        };
        await db.albums.put(albumToSave);
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Failed to auto-save album to IndexedDB:', err);
        set({ saveStatus: 'error' });
      }
    }, 650);
  },

  updateCover: (partial, recordHistory = true) => {
    const { album } = get();
    if (!album) return;
    if (recordHistory) get().pushHistory();

    const updatedCover = { ...album.cover, ...partial };
    set({
      album: {
        ...album,
        title: partial.title !== undefined ? partial.title : album.title,
        cover: updatedCover,
      },
    });
    get().persistAlbumDebounced();
  },

  changeAlbumTheme: (themeId) => {
    const { album } = get();
    if (!album) return;
    get().pushHistory();

    const preset = THEME_PRESETS[themeId];
    const updatedPages = album.pages.map((p) => ({
      ...p,
      backgroundColor: preset.defaultPageBg,
      backgroundPattern: preset.defaultPattern,
      photoSlots: p.photoSlots.map((slot) => ({
        ...slot,
        borderWidth: preset.defaultPhotoBorderWidth,
        borderColor: preset.defaultPhotoBorderColor,
        shadow: preset.defaultPhotoShadow,
        cornerRadius: preset.defaultPhotoCornerRadius,
      })),
    }));

    set({
      album: {
        ...album,
        themeId,
        cover: {
          ...album.cover,
          backgroundColor: preset.defaultCoverBg,
          spineColor: preset.defaultSpineColor,
          titleColor: preset.defaultCoverTextColor,
          titleFont: preset.defaultTitleFont,
        },
        pages: updatedPages,
      },
    });
    get().persistAlbumDebounced();
  },

  addPage: (layout, initialPhotoIds = []) => {
    const { album, activePageIndex } = get();
    if (!album) return;
    get().pushHistory();

    const chosenLayout = layout || PREDEFINED_LAYOUTS[0];
    const insertIndex = activePageIndex >= 0 ? activePageIndex + 1 : album.pages.length;
    const newPage = createPageFromLayout(
      insertIndex + 1,
      chosenLayout,
      album.themeId,
      initialPhotoIds
    );

    const nextPages = [
      ...album.pages.slice(0, insertIndex),
      newPage,
      ...album.pages.slice(insertIndex),
    ].map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    set({
      album: { ...album, pages: nextPages },
      activePageIndex: insertIndex,
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  duplicatePage: (pageIndex) => {
    const { album } = get();
    if (!album || !album.pages[pageIndex]) return;
    get().pushHistory();

    const source = album.pages[pageIndex];
    const clonedPage: AlbumPage = {
      ...JSON.parse(JSON.stringify(source)),
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      photoSlots: source.photoSlots.map((s) => ({
        ...s,
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      textElements: source.textElements.map((t) => ({
        ...t,
        id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      stickers: source.stickers.map((st) => ({
        ...st,
        id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };

    const nextPages = [
      ...album.pages.slice(0, pageIndex + 1),
      clonedPage,
      ...album.pages.slice(pageIndex + 1),
    ].map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    set({
      album: { ...album, pages: nextPages },
      activePageIndex: pageIndex + 1,
    });
    get().persistAlbumDebounced();
  },

  deletePage: (pageIndex) => {
    const { album, activePageIndex } = get();
    if (!album || album.pages.length <= 2) return false;
    get().pushHistory();

    const nextPages = album.pages
      .filter((_, idx) => idx !== pageIndex)
      .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    const nextActive = Math.max(0, Math.min(activePageIndex, nextPages.length - 1));
    set({
      album: { ...album, pages: nextPages },
      activePageIndex: nextActive,
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
    return true;
  },

  reorderPages: (oldIndex, newIndex) => {
    const { album } = get();
    if (!album || oldIndex === newIndex) return;
    get().pushHistory();

    const updated = [...album.pages];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);
    const renumbered = updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

    set({
      album: { ...album, pages: renumbered },
      activePageIndex: newIndex,
    });
    get().persistAlbumDebounced();
  },

  updatePageBackground: (partial, applyToAll = false) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (applyToAll || idx === activePageIndex) {
        return {
          ...page,
          ...partial,
        };
      }
      return page;
    });

    set({ album: { ...album, pages: nextPages } });
    get().persistAlbumDebounced();
  },

  applyLayoutToActivePage: (layout, overflowStrategy) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const currentPage = album.pages[activePageIndex];
    const existingPhotos = currentPage.photoSlots
      .map((s) => s.photoId)
      .filter((id): id is string => Boolean(id));

    const theme = THEME_PRESETS[album.themeId] || THEME_PRESETS['luxury-minimalist'];

    const newSlots: PhotoSlot[] = layout.slots.map((slotDef, idx) => {
      const prevSlot = currentPage.photoSlots[idx];
      return {
        id: prevSlot?.id || `slot-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        x: slotDef.x,
        y: slotDef.y,
        width: slotDef.width,
        height: slotDef.height,
        rotation: slotDef.rotation ?? 0,
        zIndex: idx + 1,
        photoId: existingPhotos[idx] ?? null,
        cropX: 0,
        cropY: 0,
        cropZoom: 1,
        fitMode: prevSlot?.fitMode ?? 'cover',
        borderWidth: prevSlot?.borderWidth ?? theme.defaultPhotoBorderWidth,
        borderColor: prevSlot?.borderColor ?? theme.defaultPhotoBorderColor,
        cornerRadius: prevSlot?.cornerRadius ?? theme.defaultPhotoCornerRadius,
        shadow: prevSlot?.shadow ?? theme.defaultPhotoShadow,
        opacity: 1,
      };
    });

    const updatedPage: AlbumPage = {
      ...currentPage,
      layoutId: layout.id,
      photoSlots: newSlots,
    };

    const nextPages = [...album.pages];
    nextPages[activePageIndex] = updatedPage;

    // Handle overflow photos if the user chose 'move-next'
    const overflowPhotoIds = existingPhotos.slice(layout.slots.length);
    if (overflowPhotoIds.length > 0 && overflowStrategy === 'move-next') {
      const overflowLayout =
        PREDEFINED_LAYOUTS.find((l) => l.photoCount >= Math.max(4, overflowPhotoIds.length)) ||
        PREDEFINED_LAYOUTS[0];
      const newOverflowPage = createPageFromLayout(
        activePageIndex + 2,
        overflowLayout,
        album.themeId,
        overflowPhotoIds
      );
      nextPages.splice(activePageIndex + 1, 0, newOverflowPage);
    }

    const renumbered = nextPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    set({
      album: { ...album, pages: renumbered },
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  addExtraPhotoSlotToActivePage: (photoId = null) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const page = album.pages[activePageIndex];
    const theme = THEME_PRESETS[album.themeId] || THEME_PRESETS['luxury-minimalist'];
    const newSlot: PhotoSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: 28,
      y: 28,
      width: 38,
      height: 38,
      rotation: 0,
      zIndex: page.photoSlots.length + 5,
      photoId,
      cropX: 0,
      cropY: 0,
      cropZoom: 1,
      fitMode: 'cover',
      borderWidth: theme.defaultPhotoBorderWidth,
      borderColor: theme.defaultPhotoBorderColor,
      cornerRadius: theme.defaultPhotoCornerRadius,
      shadow: theme.defaultPhotoShadow,
      opacity: 1,
    };

    const nextPages = album.pages.map((p, idx) =>
      idx === activePageIndex ? { ...p, photoSlots: [...p.photoSlots, newSlot] } : p
    );

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'photo',
      selectedId: newSlot.id,
    });
    get().persistAlbumDebounced();
  },

  assignPhotoToSlot: (slotId, photoId) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        photoSlots: page.photoSlots.map((slot) =>
          slot.id === slotId ? { ...slot, photoId, cropX: 0, cropY: 0, cropZoom: 1 } : slot
        ),
      };
    });

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'photo',
      selectedId: slotId,
    });
    get().persistAlbumDebounced();
  },

  autoAssignPhotoToEmptySlot: (photoId) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return false;
    const page = album.pages[activePageIndex];
    const emptySlot = page.photoSlots.find((s) => !s.photoId);
    if (!emptySlot) return false;

    get().assignPhotoToSlot(emptySlot.id, photoId);
    return true;
  },

  updatePhotoSlot: (slotId, partial, recordHistory = false) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    if (recordHistory) get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        photoSlots: page.photoSlots.map((slot) =>
          slot.id === slotId ? { ...slot, ...partial } : slot
        ),
      };
    });

    set({ album: { ...album, pages: nextPages } });
    get().persistAlbumDebounced();
  },

  deletePhotoSlot: (slotId) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        photoSlots: page.photoSlots.filter((slot) => slot.id !== slotId),
      };
    });

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  addTextElement: (preset) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const page = album.pages[activePageIndex];
    const newText: TextElement = {
      id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: (preset.content || 'New Caption').slice(0, 500),
      frameStyle: preset.frameStyle,
      frameBg: preset.frameBg,
      frameBorderColor: preset.frameBorderColor,
      x: preset.x ?? 20,
      y: preset.y ?? 42,
      width: preset.width ?? 60,
      fontFamily: preset.fontFamily || 'Cormorant Garamond',
      fontSize: preset.fontSize || 24,
      fontWeight: preset.fontWeight || 'normal',
      fontStyle: preset.fontStyle || 'normal',
      color: preset.color || '#39332F',
      textAlign: preset.textAlign || 'center',
      letterSpacing: preset.letterSpacing ?? 0.5,
      rotation: preset.rotation ?? 0,
      opacity: preset.opacity ?? 1,
      zIndex: 20 + page.textElements.length,
    };

    const nextPages = album.pages.map((p, idx) =>
      idx === activePageIndex ? { ...p, textElements: [...p.textElements, newText] } : p
    );

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'text',
      selectedId: newText.id,
    });
    get().persistAlbumDebounced();
  },

  updateTextElement: (textId, partial, recordHistory = false) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    if (recordHistory) get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        textElements: page.textElements.map((txt) =>
          txt.id === textId ? { ...txt, ...partial } : txt
        ),
      };
    });

    set({ album: { ...album, pages: nextPages } });
    get().persistAlbumDebounced();
  },

  deleteTextElement: (textId) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        textElements: page.textElements.filter((txt) => txt.id !== textId),
      };
    });

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  addStickerElement: (sticker) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const page = album.pages[activePageIndex];
    const newSticker: StickerElement = {
      ...sticker,
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      zIndex: 30 + page.stickers.length,
    };

    const nextPages = album.pages.map((p, idx) =>
      idx === activePageIndex ? { ...p, stickers: [...p.stickers, newSticker] } : p
    );

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'sticker',
      selectedId: newSticker.id,
    });
    get().persistAlbumDebounced();
  },

  updateStickerElement: (stickerId, partial, recordHistory = false) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    if (recordHistory) get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        stickers: page.stickers.map((stk) =>
          stk.id === stickerId ? { ...stk, ...partial } : stk
        ),
      };
    });

    set({ album: { ...album, pages: nextPages } });
    get().persistAlbumDebounced();
  },

  deleteStickerElement: (stickerId) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      return {
        ...page,
        stickers: page.stickers.filter((stk) => stk.id !== stickerId),
      };
    });

    set({
      album: { ...album, pages: nextPages },
      selectedType: 'page',
      selectedId: null,
    });
    get().persistAlbumDebounced();
  },

  shiftElementLayer: (elementType, elementId, direction) => {
    const { album, activePageIndex } = get();
    if (!album || activePageIndex < 0) return;
    get().pushHistory();

    const delta = direction === 'up' ? 2 : -2;
    const nextPages = album.pages.map((page, idx) => {
      if (idx !== activePageIndex) return page;
      if (elementType === 'photo') {
        return {
          ...page,
          photoSlots: page.photoSlots.map((s) =>
            s.id === elementId ? { ...s, zIndex: Math.max(1, s.zIndex + delta) } : s
          ),
        };
      }
      if (elementType === 'text') {
        return {
          ...page,
          textElements: page.textElements.map((t) =>
            t.id === elementId ? { ...t, zIndex: Math.max(1, t.zIndex + delta) } : t
          ),
        };
      }
      return {
        ...page,
        stickers: page.stickers.map((st) =>
          st.id === elementId ? { ...st, zIndex: Math.max(1, st.zIndex + delta) } : st
        ),
      };
    });

    set({ album: { ...album, pages: nextPages } });
    get().persistAlbumDebounced();
  },
}));
