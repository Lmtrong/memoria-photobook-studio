import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  deleteAlbumFromDb,
  duplicateAlbumInDb,
  ensureSampleAlbumInitialized,
  estimateStorageUsage,
} from '../services/database/db';
import { Album } from '../types';
import { FORMAT_DIMENSIONS, THEME_PRESETS } from '../utils/constants';
import { useI18n } from '../i18n';
import { useToastStore } from '../stores/useToastStore';
import { BookCoverRenderer } from '../components/book/BookCoverRenderer';
import { AlbumWizardModal } from '../components/dialogs/AlbumWizardModal';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import {
  BookOpen,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Copy,
  Trash2,
  Globe,
  Sparkles,
  Calendar,
  FileText,
  Image as ImageIcon,
  HardDrive,
  SlidersHorizontal,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang, t, toggleLanguage } = useI18n();
  const { addToast } = useToastStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'pages'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<Album | null>(null);
  const [storageInfo, setStorageInfo] = useState({ usedMB: '0.0', quotaMB: '500', percent: 1 });

  useEffect(() => {
    let mounted = true;
    ensureSampleAlbumInitialized(false)
      .then(() => estimateStorageUsage())
      .then((info) => {
        if (mounted) {
          setStorageInfo(info);
          setIsInitializing(false);
        }
      })
      .catch(() => {
        if (mounted) setIsInitializing(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const albums = useLiveQuery(() => db.albums.toArray(), [], []);
  const allPhotos = useLiveQuery(() => db.photos.toArray(), [], []);

  // Build cover thumbnail map
  const coverPhotoMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!allPhotos) return map;
    for (const p of allPhotos) {
      map[p.id] = p.thumbnailDataUrl;
    }
    return map;
  }, [allPhotos]);

  const countAlbumPhotos = (album: Album): number => {
    let count = 0;
    for (const p of album.pages) {
      for (const s of p.photoSlots) {
        if (s.photoId) count++;
      }
    }
    return count;
  };

  const filteredAlbums = useMemo(() => {
    if (!albums) return [];
    const q = searchQuery.trim().toLowerCase();
    const list = albums.filter((a) => {
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return b.pages.length - a.pages.length;
    });
  }, [albums, searchQuery, sortBy]);

  const handleDuplicate = async (album: Album) => {
    const duplicated = await duplicateAlbumInDb(album.id, t.common.duplicatedSuffix);
    if (duplicated) {
      addToast(t.common.toastAlbumDuplicated, 'success');
      estimateStorageUsage().then(setStorageInfo);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAlbum) return;
    await deleteAlbumFromDb(deletingAlbum.id);
    setDeletingAlbum(null);
    addToast(t.common.toastAlbumDeleted, 'info');
    estimateStorageUsage().then(setStorageInfo);
  };

  const handleRestoreSample = async () => {
    setIsInitializing(true);
    await ensureSampleAlbumInitialized(true);
    const info = await estimateStorageUsage();
    setStorageInfo(info);
    setIsInitializing(false);
    addToast(t.common.toastAlbumCreated, 'success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-charcoal">
      {/* Top Studio Header */}
      <header className="sticky top-0 z-30 bg-ivory/90 backdrop-blur-md border-b border-beige">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-charcoal text-ivory flex items-center justify-center shadow-sm border border-gold/40">
              <BookOpen className="w-5 h-5 text-gold" />
            </div>
            <div>
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.18em] text-charcoal block leading-none">
                {t.app.brand}
              </span>
              <span className="text-[11px] uppercase tracking-[0.22em] text-terracotta font-medium block mt-1">
                {t.app.tagline}
              </span>
            </div>
          </div>

          {/* Right Actions: Storage Indicator, Language Switcher & Create Button */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Storage Pill */}
            <div
              title={`${t.nav.storageUsage}: ${storageInfo.usedMB} MB / ${storageInfo.quotaMB} MB`}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cream border border-beige text-xs text-charcoal/75"
            >
              <HardDrive className="w-3.5 h-3.5 text-terracotta" />
              <span>
                {storageInfo.usedMB} MB
              </span>
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-beige bg-cream/60 hover:bg-beige/60 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-terracotta" />
              <span>{lang === 'vi' ? 'VI • Tiếng Việt' : 'EN • English'}</span>
            </button>

            {/* Primary Create Button */}
            <button
              type="button"
              onClick={() => {
                setEditingAlbum(null);
                setWizardOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-charcoal text-ivory hover:bg-terracotta text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.nav.createAlbum}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Hero Studio Banner */}
        <section className="relative rounded-2xl overflow-hidden border border-beige bg-gradient-to-br from-cream via-ivory to-beige/60 p-6 sm:p-10 shadow-paper">
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ivory/90 border border-beige text-xs font-medium text-terracotta">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.app.tagline}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-charcoal leading-tight">
              {t.app.welcomeTitle}
            </h1>
            <p className="text-sm sm:text-base text-charcoal/75 leading-relaxed">
              {t.app.welcomeSubtitle}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingAlbum(null);
                  setWizardOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-terracotta text-white hover:bg-charcoal text-sm font-medium transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t.nav.createAlbum}</span>
              </button>
              {albums && albums.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(`/viewer/${albums[0].id}`)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ivory hover:bg-cream text-charcoal border border-beige text-sm font-medium transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-terracotta" />
                  <span>
                    {t.dashboard.openBook} "{albums[0].title}"
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Decorative Right Book Illustration */}
          <div className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 items-center gap-4 opacity-90 pointer-events-none">
            {albums && albums[0] && (
              <div className="transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <BookCoverRenderer
                  cover={albums[0].cover}
                  format={albums[0].format}
                  coverPhotoUrl={
                    albums[0].cover.coverPhotoId
                      ? coverPhotoMap[albums[0].cover.coverPhotoId]
                      : null
                  }
                  author={albums[0].author}
                  scale={0.28}
                  className="rounded-r-md"
                />
              </div>
            )}
          </div>
        </section>

        {/* Search, Sort & View Controls Bar */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-beige">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-charcoal">
                {t.dashboard.allAlbums}
              </h2>
              <p className="text-xs text-charcoal/60 mt-0.5">
                {filteredAlbums.length} {t.nav.dashboard.toLowerCase()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-charcoal/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.dashboard.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-sm text-charcoal"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white border border-beige rounded-xl px-3 py-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-terracotta" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-xs font-medium text-charcoal outline-none cursor-pointer"
                >
                  <option value="updated">{t.dashboard.sortUpdatedDesc}</option>
                  <option value="created">{t.dashboard.sortCreatedDesc}</option>
                  <option value="title">{t.dashboard.sortTitleAsc}</option>
                  <option value="pages">{t.dashboard.sortPagesDesc}</option>
                </select>
              </div>

              {/* Grid / List View Toggle */}
              <div className="flex items-center bg-cream p-1 rounded-xl border border-beige">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title={t.dashboard.viewGrid}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-charcoal text-ivory shadow-xs'
                      : 'text-charcoal/60 hover:text-charcoal'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title={t.dashboard.viewList}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-charcoal text-ivory shadow-xs'
                      : 'text-charcoal/60 hover:text-charcoal'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isInitializing ? (
            <div className="py-20 text-center text-charcoal/60 font-serif text-xl animate-pulse">
              {t.common.loading}
            </div>
          ) : albums && albums.length === 0 ? (
            /* Empty Collection State */
            <div className="bg-cream/50 border border-dashed border-taupe/60 rounded-2xl p-12 text-center max-w-xl mx-auto my-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-ivory border border-beige flex items-center justify-center mx-auto text-terracotta shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-charcoal">
                {t.dashboard.emptyTitle}
              </h3>
              <p className="text-sm text-charcoal/70 leading-relaxed">{t.dashboard.emptyDesc}</p>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAlbum(null);
                    setWizardOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal text-ivory hover:bg-terracotta text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.nav.createAlbum}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestoreSample}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ivory border border-beige hover:bg-cream text-charcoal text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-terracotta" />
                  <span>{t.dashboard.restoreSample}</span>
                </button>
              </div>
            </div>
          ) : filteredAlbums.length === 0 ? (
            /* Empty Search Filter State */
            <div className="py-16 text-center space-y-3">
              <p className="text-charcoal/70">{t.dashboard.noSearchResults}</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-sm text-terracotta font-medium underline"
              >
                {t.dashboard.clearSearch}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredAlbums.map((album) => {
                const theme = THEME_PRESETS[album.themeId] || THEME_PRESETS['luxury-minimalist'];
                const photoCount = countAlbumPhotos(album);
                const coverUrl = album.cover.coverPhotoId
                  ? coverPhotoMap[album.cover.coverPhotoId]
                  : null;

                return (
                  <div
                    key={album.id}
                    className="group bg-white/80 hover:bg-white border border-beige rounded-2xl overflow-hidden shadow-paper hover:shadow-book transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Top Book Stage */}
                    <div
                      onClick={() => navigate(`/viewer/${album.id}`)}
                      className="relative bg-cream/60 py-7 px-4 flex items-center justify-center cursor-pointer overflow-hidden border-b border-beige/70"
                    >
                      {/* Format & Theme Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-ivory/90 border border-beige text-[10px] font-semibold uppercase tracking-wider text-charcoal">
                          {FORMAT_DIMENSIONS[album.format].label}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-ivory/90 border border-beige text-[10px] font-medium text-terracotta">
                          {lang === 'vi' ? theme.nameVi : theme.nameEn}
                        </span>
                      </div>

                      {/* 3D Hover Book Preview */}
                      <div className="transform group-hover:scale-105 group-hover:-rotate-1 transition-all duration-300 relative">
                        <BookCoverRenderer
                          cover={album.cover}
                          format={album.format}
                          coverPhotoUrl={coverUrl}
                          author={album.author}
                          scale={0.31}
                          className="rounded-r-md"
                        />
                        {/* Realistic page block thickness on right edge */}
                        <div className="absolute top-1 bottom-1 -right-2 w-2 bg-gradient-to-r from-ivory via-beige to-ivory border-y border-r border-taupe/40 rounded-r-xs pointer-events-none" />
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            onClick={() => navigate(`/viewer/${album.id}`)}
                            className="text-2xl font-serif font-semibold text-charcoal hover:text-terracotta cursor-pointer line-clamp-1"
                          >
                            {album.title}
                          </h3>
                        </div>
                        {album.description && (
                          <p className="text-xs text-charcoal/70 mt-1 line-clamp-2 leading-relaxed">
                            {album.description}
                          </p>
                        )}

                        {/* Metadata Pills */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-beige/60 text-xs text-charcoal/65">
                          <span className="inline-flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-terracotta" />
                            {album.pages.length} {t.dashboard.pagesCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-terracotta" />
                            {photoCount} {t.dashboard.photosCount}
                          </span>
                          <span className="inline-flex items-center gap-1 ml-auto">
                            <Calendar className="w-3.5 h-3.5 text-taupe" />
                            {new Date(album.updatedAt).toLocaleDateString(
                              lang === 'vi' ? 'vi-VN' : 'en-US'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/viewer/${album.id}`)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-charcoal text-ivory hover:bg-terracotta text-xs font-medium transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{t.dashboard.openBook}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/editor/${album.id}`)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cream hover:bg-beige text-charcoal border border-beige text-xs font-medium transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-terracotta" />
                          <span>{t.dashboard.editBook}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingAlbum(album);
                            setWizardOpen(true);
                          }}
                          title={t.dashboard.editInfo}
                          className="p-2 rounded-xl border border-beige text-charcoal/70 hover:text-charcoal hover:bg-cream transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(album)}
                          title={t.dashboard.duplicateBook}
                          className="p-2 rounded-xl border border-beige text-charcoal/70 hover:text-charcoal hover:bg-cream transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAlbum(album)}
                          title={t.dashboard.deleteBook}
                          className="p-2 rounded-xl border border-beige text-red-700/75 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-3">
              {filteredAlbums.map((album) => {
                const theme = THEME_PRESETS[album.themeId] || THEME_PRESETS['luxury-minimalist'];
                const photoCount = countAlbumPhotos(album);
                const coverUrl = album.cover.coverPhotoId
                  ? coverPhotoMap[album.cover.coverPhotoId]
                  : null;

                return (
                  <div
                    key={album.id}
                    className="bg-white/85 hover:bg-white border border-beige rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5 transition-all"
                  >
                    <div className="flex items-center gap-5 w-full sm:w-auto">
                      <div
                        onClick={() => navigate(`/viewer/${album.id}`)}
                        className="cursor-pointer shrink-0"
                      >
                        <BookCoverRenderer
                          cover={album.cover}
                          format={album.format}
                          coverPhotoUrl={coverUrl}
                          scale={0.14}
                          className="rounded-r-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => navigate(`/viewer/${album.id}`)}
                            className="text-xl font-serif font-semibold text-charcoal hover:text-terracotta cursor-pointer"
                          >
                            {album.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-cream border border-beige text-[10px] font-semibold">
                            {FORMAT_DIMENSIONS[album.format].label}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cream border border-beige text-[10px] text-terracotta">
                            {lang === 'vi' ? theme.nameVi : theme.nameEn}
                          </span>
                        </div>
                        {album.description && (
                          <p className="text-xs text-charcoal/70 line-clamp-1 max-w-xl">
                            {album.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/60 pt-1">
                          <span>
                            {album.pages.length} {t.dashboard.pagesCount}
                          </span>
                          <span>•</span>
                          <span>
                            {photoCount} {t.dashboard.photosCount}
                          </span>
                          <span>•</span>
                          <span>
                            {t.dashboard.updatedOn}:{' '}
                            {new Date(album.updatedAt).toLocaleDateString(
                              lang === 'vi' ? 'vi-VN' : 'en-US'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/viewer/${album.id}`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-charcoal text-ivory hover:bg-terracotta text-xs font-medium transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{t.dashboard.openBook}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/editor/${album.id}`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cream hover:bg-beige text-charcoal border border-beige text-xs font-medium transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-terracotta" />
                        <span>{t.dashboard.editBook}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(album)}
                        title={t.dashboard.duplicateBook}
                        className="p-2 rounded-xl border border-beige text-charcoal/70 hover:text-charcoal hover:bg-cream"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingAlbum(album)}
                        title={t.dashboard.deleteBook}
                        className="p-2 rounded-xl border border-beige text-red-700/75 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Create / Edit Album Wizard Modal */}
      <AlbumWizardModal
        isOpen={wizardOpen}
        editingAlbum={editingAlbum}
        onClose={() => {
          setWizardOpen(false);
          setEditingAlbum(null);
        }}
        onCreatedOrUpdated={(album, isNew) => {
          setWizardOpen(false);
          setEditingAlbum(null);
          if (isNew) {
            navigate(`/editor/${album.id}`);
          }
        }}
      />

      {/* Delete Album Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingAlbum)}
        title={t.common.deleteAlbumTitle}
        message={t.common.deleteAlbumMessage.replace('{title}', deletingAlbum?.title || '')}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingAlbum(null)}
      />
    </div>
  );
};
