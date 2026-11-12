import React, { useState, useEffect } from 'react';
import {
  Album,
  AlbumFormat,
  AlbumThemeId,
  CoverConfig,
  StoredPhoto,
} from '../../types';
import {
  FORMAT_DIMENSIONS,
  HARDCOVER_COLOR_SWATCHES,
  PREDEFINED_LAYOUTS,
  THEME_PRESETS,
} from '../../utils/constants';
import { createPageFromLayout, db } from '../../services/database/db';
import { isSupportedImageFile, processImageFile } from '../../services/image/imageService';
import { useI18n } from '../../i18n';
import { useToastStore } from '../../stores/useToastStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { syncAlbumToCloudInBackground } from '../../services/supabase/supabaseService';
import { BookCoverRenderer } from '../book/BookCoverRenderer';
import {
  X,
  Upload,
  Check,
  Sparkles,
  BookOpen,
  Layers,
  Maximize2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface AlbumWizardModalProps {
  isOpen: boolean;
  editingAlbum?: Album | null;
  onClose: () => void;
  onCreatedOrUpdated: (album: Album, isNew: boolean) => void;
}

export const AlbumWizardModal: React.FC<AlbumWizardModalProps> = ({
  isOpen,
  editingAlbum = null,
  onClose,
  onCreatedOrUpdated,
}) => {
  const { lang, t } = useI18n();
  const { addToast } = useToastStore();
  const { currentUser } = useAuthStore();

  const [step, setStep] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [createdAtDate, setCreatedAtDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [format, setFormat] = useState<AlbumFormat>('landscape');
  const [themeId, setThemeId] = useState<AlbumThemeId>('luxury-minimalist');
  const [coverColor, setCoverColor] = useState('#39332F');
  const [spineColor, setSpineColor] = useState('#26221F');
  const [titleColor, setTitleColor] = useState('#EFE9DF');
  const [coverStyle, setCoverStyle] = useState<CoverConfig['layoutStyle']>('classic');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  // Step 4 initial page settings
  const [photosPerPage, setPhotosPerPage] = useState<number>(4);
  const [initialPagesCount, setInitialPagesCount] = useState<number>(4);
  const [templateType, setTemplateType] = useState<'predefined' | 'blank'>('predefined');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setErrorMsg(null);

    if (editingAlbum) {
      setTitle(editingAlbum.title);
      setDescription(editingAlbum.description);
      setAuthor(editingAlbum.author);
      setCreatedAtDate(editingAlbum.createdAt.slice(0, 10));
      setFormat(editingAlbum.format);
      setThemeId(editingAlbum.themeId);
      setCoverColor(editingAlbum.cover.backgroundColor);
      setSpineColor(editingAlbum.cover.spineColor);
      setTitleColor(editingAlbum.cover.titleColor);
      setCoverStyle(editingAlbum.cover.layoutStyle);
      setCoverFile(null);

      // Load existing cover photo preview if any
      if (editingAlbum.cover.coverPhotoId) {
        db.photos.get(editingAlbum.cover.coverPhotoId).then((p) => {
          if (p) setCoverPreviewUrl(p.thumbnailDataUrl);
        });
      } else {
        setCoverPreviewUrl(null);
      }
    } else {
      const defaultTheme = THEME_PRESETS['luxury-minimalist'];
      setTitle('');
      setDescription('');
      setAuthor(currentUser?.displayName || '');
      setCreatedAtDate(new Date().toISOString().slice(0, 10));
      setFormat('landscape');
      setThemeId('luxury-minimalist');
      setCoverColor(defaultTheme.defaultCoverBg);
      setSpineColor(defaultTheme.defaultSpineColor);
      setTitleColor(defaultTheme.defaultCoverTextColor);
      setCoverStyle('classic');
      setCoverFile(null);
      setCoverPreviewUrl(null);
      setPhotosPerPage(4);
      setInitialPagesCount(4);
      setTemplateType('predefined');
    }
  }, [isOpen, editingAlbum]);

  if (!isOpen) return null;

  const handleSelectTheme = (id: AlbumThemeId) => {
    setThemeId(id);
    const preset = THEME_PRESETS[id];
    setCoverColor(preset.defaultCoverBg);
    setSpineColor(preset.defaultSpineColor);
    setTitleColor(preset.defaultCoverTextColor);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      addToast(t.common.toastUnsupportedFile, 'error');
      return;
    }
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreviewUrl(url);
  };

  const handleNextStep = () => {
    if (step === 1 && !title.trim()) {
      setErrorMsg(t.wizard.validationTitleRequired);
      return;
    }
    setErrorMsg(null);
    const maxStep = editingAlbum ? 3 : 4;
    if (step < maxStep) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    if (!title.trim()) {
      setErrorMsg(t.wizard.validationTitleRequired);
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const albumId = editingAlbum
        ? editingAlbum.id
        : `album-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      let coverPhotoId = editingAlbum?.cover.coverPhotoId ?? null;

      if (coverFile) {
        const processed = await processImageFile(coverFile);
        const newPhoto: StoredPhoto = {
          id: `photo-cover-${Date.now()}`,
          albumId,
          name: coverFile.name,
          mimeType: coverFile.type || 'image/jpeg',
          width: processed.width,
          height: processed.height,
          size: coverFile.size,
          originalBlob: processed.originalBlob,
          thumbnailDataUrl: processed.thumbnailDataUrl,
          createdAt: now,
        };
        await db.photos.put(newPhoto);
        coverPhotoId = newPhoto.id;
      }

      const preset = THEME_PRESETS[themeId];

      const coverConfig: CoverConfig = {
        backgroundColor: coverColor,
        spineColor,
        borderColor: preset.accentColor,
        coverPhotoId,
        title: title.trim(),
        subtitle: createdAtDate.slice(0, 4),
        titleFont: preset.defaultTitleFont,
        titleColor,
        layoutStyle: coverStyle,
      };

      if (editingAlbum) {
        const updatedAlbum: Album = {
          ...editingAlbum,
          ownerId: editingAlbum.ownerId || currentUser?.id,
          ownerUsername: editingAlbum.ownerUsername || currentUser?.username,
          ownerName: editingAlbum.ownerName || currentUser?.displayName,
          title: title.trim(),
          description: description.trim(),
          author: author.trim(),
          format,
          themeId,
          updatedAt: now,
          cover: coverConfig,
        };
        await db.albums.put(updatedAlbum);
        syncAlbumToCloudInBackground(updatedAlbum.id, currentUser);
        onCreatedOrUpdated(updatedAlbum, false);
      } else {
        // Build initial pages according to Step 4 configuration
        const matchingLayouts = PREDEFINED_LAYOUTS.filter(
          (l) => l.photoCount === photosPerPage
        );
        const fallbackLayout = matchingLayouts[0] || PREDEFINED_LAYOUTS[0];

        const pages = Array.from({ length: initialPagesCount }).map((_, idx) => {
          const layoutForPage =
            templateType === 'predefined'
              ? matchingLayouts[idx % matchingLayouts.length] || fallbackLayout
              : fallbackLayout;
          const page = createPageFromLayout(idx + 1, layoutForPage, themeId, []);

          if (templateType === 'predefined' && idx === 0) {
            page.textElements.push({
              id: `txt-init-${Date.now()}`,
              content: title.trim(),
              x: 10,
              y: 2,
              width: 80,
              fontFamily: preset.defaultTitleFont,
              fontSize: 24,
              fontWeight: 'semibold',
              fontStyle: 'italic',
              color: '#39332F',
              textAlign: 'center',
              letterSpacing: 1,
              rotation: 0,
              opacity: 1,
              zIndex: 15,
            });
          }
          return page;
        });

        const newAlbum: Album = {
          id: albumId,
          ownerId: currentUser?.id,
          ownerUsername: currentUser?.username,
          ownerName: currentUser?.displayName,
          isPublic: true,
          title: title.trim(),
          description: description.trim(),
          author: author.trim() || currentUser?.displayName || 'Memoria Studio',
          createdAt: new Date(createdAtDate).toISOString(),
          updatedAt: now,
          format,
          themeId,
          cover: coverConfig,
          pages,
        };

        await db.albums.put(newAlbum);
        syncAlbumToCloudInBackground(newAlbum.id, currentUser);
        addToast(t.common.toastAlbumCreated, 'success');
        onCreatedOrUpdated(newAlbum, true);
      }
    } catch (err) {
      console.error('Error saving album:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSteps = editingAlbum ? 3 : 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-ivory border border-beige rounded-2xl shadow-book max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-cream/70 border-b border-beige flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-charcoal">
              {editingAlbum ? t.wizard.editTitle : t.wizard.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, ...(editingAlbum ? [] : [4])].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s === 1 || title.trim()) setStep(s);
                  }}
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    step === s
                      ? 'bg-charcoal text-ivory'
                      : step > s
                      ? 'bg-taupe/30 text-charcoal'
                      : 'bg-beige/60 text-charcoal/50'
                  }`}
                >
                  {s}.{' '}
                  {s === 1
                    ? t.wizard.step1
                    : s === 2
                    ? t.wizard.step2
                    : s === 3
                    ? t.wizard.step3
                    : t.wizard.step4}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-charcoal/60 hover:text-charcoal hover:bg-beige/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Column */}
          <div className="lg:col-span-7 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            {/* STEP 1: BASIC INFO & COVER */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-1">
                    {t.wizard.albumTitle}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder={t.wizard.albumTitlePlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-beige focus:border-terracotta outline-none text-charcoal font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-1">
                    {t.wizard.albumDesc}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.wizard.albumDescPlaceholder}
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-beige focus:border-terracotta outline-none text-sm text-charcoal resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-1">
                      {t.wizard.authorName}
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder={t.wizard.authorPlaceholder}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-beige focus:border-terracotta outline-none text-sm text-charcoal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-1">
                      {t.wizard.creationDate}
                    </label>
                    <input
                      type="date"
                      value={createdAtDate}
                      onChange={(e) => setCreatedAtDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-beige focus:border-terracotta outline-none text-sm text-charcoal"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-beige/60">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                    {t.wizard.coverPhoto}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cream hover:bg-beige text-charcoal text-sm font-medium border border-beige transition-colors">
                      <Upload className="w-4 h-4 text-terracotta" />
                      <span>{coverPreviewUrl ? t.wizard.changeCover : t.wizard.uploadCover}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>
                    {coverPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverFile(null);
                          setCoverPreviewUrl(null);
                        }}
                        className="text-xs text-red-700 hover:underline"
                      >
                        {t.wizard.removeCover}
                      </button>
                    )}
                  </div>
                </div>

                {/* Hardcover Swatches */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                    {t.wizard.coverColor}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HARDCOVER_COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.color}
                        type="button"
                        onClick={() => {
                          setCoverColor(swatch.color);
                          setSpineColor(swatch.spine);
                          setTitleColor(swatch.text);
                        }}
                        title={swatch.name}
                        style={{ backgroundColor: swatch.color }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          coverColor === swatch.color
                            ? 'scale-110 border-gold ring-2 ring-charcoal/30'
                            : 'border-white shadow-xs'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DIMENSIONS */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(
                  [
                    {
                      id: 'square',
                      title: t.wizard.formatSquare,
                      desc: t.wizard.formatSquareDesc,
                      boxClass: 'w-14 h-14',
                    },
                    {
                      id: 'portrait',
                      title: t.wizard.formatPortrait,
                      desc: t.wizard.formatPortraitDesc,
                      boxClass: 'w-12 h-16',
                    },
                    {
                      id: 'landscape',
                      title: t.wizard.formatLandscape,
                      desc: t.wizard.formatLandscapeDesc,
                      boxClass: 'w-16 h-12',
                    },
                    {
                      id: 'panorama',
                      title: t.wizard.formatPanorama,
                      desc: t.wizard.formatPanoramaDesc,
                      boxClass: 'w-20 h-11',
                    },
                  ] as const
                ).map((item) => {
                  const selected = format === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormat(item.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selected
                          ? 'border-terracotta bg-cream/90 ring-2 ring-terracotta/25 shadow-xs'
                          : 'border-beige bg-white hover:bg-cream/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`${item.boxClass} rounded border-2 flex items-center justify-center text-[10px] font-semibold ${
                            selected
                              ? 'border-terracotta bg-terracotta/15 text-terracotta'
                              : 'border-taupe/60 bg-ivory text-charcoal/60'
                          }`}
                        >
                          {FORMAT_DIMENSIONS[item.id].label}
                        </div>
                        {selected && (
                          <span className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-serif font-semibold text-lg text-charcoal">
                          {item.title}
                        </h4>
                        <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP 3: VISUAL THEMES */}
            {step === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(THEME_PRESETS).map((theme) => {
                  const selected = themeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-terracotta bg-cream/90 ring-2 ring-terracotta/25'
                          : 'border-beige bg-white hover:bg-cream/40'
                      }`}
                    >
                      <div
                        className="h-12 w-full rounded-lg mb-2.5 border border-black/10 flex items-center justify-between px-3"
                        style={{ background: theme.previewGradient }}
                      >
                        <span
                          style={{ fontFamily: theme.defaultTitleFont }}
                          className="text-sm font-semibold text-charcoal bg-ivory/85 px-2 py-0.5 rounded"
                        >
                          Aa Bb
                        </span>
                        {selected && (
                          <span className="w-5 h-5 rounded-full bg-charcoal text-ivory flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif font-semibold text-base text-charcoal">
                        {lang === 'vi' ? theme.nameVi : theme.nameEn}
                      </h4>
                      <p className="text-xs text-charcoal/70 mt-0.5 line-clamp-2">
                        {lang === 'vi' ? theme.descVi : theme.descEn}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP 4: INITIAL PAGE SETUP */}
            {step === 4 && !editingAlbum && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                    {t.wizard.photosPerPage} (4–8)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[4, 5, 6, 7, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setPhotosPerPage(count)}
                        className={`py-2.5 rounded-lg border font-medium text-sm transition-colors ${
                          photosPerPage === count
                            ? 'bg-charcoal text-ivory border-charcoal'
                            : 'bg-white text-charcoal border-beige hover:bg-cream'
                        }`}
                      >
                        {count} {t.editor.layouts.photosUnit}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                    {t.wizard.initialPagesCount}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[4, 6, 8, 12].map((pCount) => (
                      <button
                        key={pCount}
                        type="button"
                        onClick={() => setInitialPagesCount(pCount)}
                        className={`py-2 rounded-lg border font-medium text-sm transition-colors ${
                          initialPagesCount === pCount
                            ? 'bg-terracotta text-white border-terracotta'
                            : 'bg-white text-charcoal border-beige hover:bg-cream'
                        }`}
                      >
                        {pCount} {t.dashboard.pagesCount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                    {t.wizard.templateType}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTemplateType('predefined')}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 ${
                        templateType === 'predefined'
                          ? 'border-terracotta bg-cream/90 ring-1 ring-terracotta'
                          : 'border-beige bg-white'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-charcoal">
                          {t.wizard.templatePredefined}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateType('blank')}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 ${
                        templateType === 'blank'
                          ? 'border-terracotta bg-cream/90 ring-1 ring-terracotta'
                          : 'border-beige bg-white'
                      }`}
                    >
                      <Layers className="w-5 h-5 text-taupe shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-charcoal">
                          {t.wizard.templateBlank}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Hardcover Preview Column */}
          <div className="lg:col-span-5 bg-cream/60 border border-beige rounded-xl p-5 flex flex-col items-center justify-center">
            <div className="text-xs uppercase tracking-widest text-charcoal/60 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Hardcover Preview ({FORMAT_DIMENSIONS[format].label})</span>
            </div>

            <div className="my-2 flex items-center justify-center">
              <BookCoverRenderer
                cover={{
                  backgroundColor: coverColor,
                  spineColor,
                  borderColor: THEME_PRESETS[themeId].accentColor,
                  coverPhotoId: null,
                  title: title.trim() || 'Untitled Keepsake',
                  subtitle: createdAtDate.slice(0, 4),
                  titleFont: THEME_PRESETS[themeId].defaultTitleFont,
                  titleColor,
                  layoutStyle: coverStyle,
                }}
                format={format}
                coverPhotoUrl={coverPreviewUrl}
                author={author.trim() || undefined}
                scale={0.33}
                className="rounded-r-md"
              />
            </div>

            {/* Cover Style Selector */}
            <div className="w-full mt-4 pt-3 border-t border-beige/70">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-charcoal/60 mb-2 text-center">
                {t.wizard.coverStyle}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'classic', label: t.editor.cover.styleClassic },
                    { id: 'modern', label: t.editor.cover.styleModern },
                    { id: 'full-bleed', label: t.editor.cover.styleFullBleed },
                    { id: 'minimal-frame', label: t.editor.cover.styleMinimalFrame },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCoverStyle(st.id)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                      coverStyle === st.id
                        ? 'bg-charcoal text-ivory border-charcoal'
                        : 'bg-ivory text-charcoal/80 border-beige hover:bg-beige/40'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cream/70 border-t border-beige flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-beige bg-ivory hover:bg-beige/40 text-charcoal transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.wizard.back}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-charcoal/70 hover:text-charcoal"
              >
                {t.wizard.cancel}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-charcoal text-ivory hover:bg-terracotta transition-colors"
              >
                <span>{t.wizard.next}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-terracotta text-white hover:bg-charcoal transition-colors shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{editingAlbum ? t.wizard.saveChanges : t.wizard.createAndOpen}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
