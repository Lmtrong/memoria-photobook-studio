import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Album } from '../../types';
import { FORMAT_DIMENSIONS } from '../../utils/constants';
import { BookCoverRenderer } from '../book/BookCoverRenderer';
import { PageSurfaceRenderer } from '../book/PageSurfaceRenderer';
import { useI18n } from '../../i18n';
import { useToastStore } from '../../stores/useToastStore';
import { X, FileDown, Check, Loader2 } from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  album: Album;
  photoUrls: Record<string, string>;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  album,
  photoUrls,
  onClose,
}) => {
  const { t } = useI18n();
  const { addToast } = useToastStore();

  const [exportMode, setExportMode] = useState<'single' | 'spread'>('single');
  const [rangeType, setRangeType] = useState<'all' | 'custom'>('all');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(album.pages.length);
  const [includeCover, setIncludeCover] = useState(true);
  const [quality, setQuality] = useState<'standard' | 'high' | 'print'>('print');

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 1 });

  const renderStageRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const dims = FORMAT_DIMENSIONS[album.format] || FORMAT_DIMENSIONS.landscape;
  const coverPhotoUrl = album.cover.coverPhotoId ? photoUrls[album.cover.coverPhotoId] : null;

  const waitForStageImages = async (container: HTMLElement) => {
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map(async (img) => {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
        if (typeof img.decode === 'function') {
          try {
            await img.decode();
          } catch {
            // ignore decode errors on broken/empty urls
          }
        }
      })
    );
    // Allow React state updates from CroppedPhotoImage onLoad to flush to DOM
    await new Promise((r) => setTimeout(r, 80));
  };

  const handleStartExport = async () => {
    if (!renderStageRef.current) return;
    setIsExporting(true);

    try {
      const targetScale = quality === 'print' ? 3.5 : quality === 'high' ? 2.6 : 1.8;

      const stageNodes = Array.from(
        renderStageRef.current.querySelectorAll('[data-pdf-item]')
      ) as HTMLElement[];

      if (stageNodes.length === 0) {
        throw new Error('No pages available to render');
      }

      setProgress({ current: 0, total: stageNodes.length });

      // Ensure all high-res images in the offscreen stage are 100% decoded & cropped
      await waitForStageImages(renderStageRef.current);

      const pdfPageWidth = exportMode === 'spread' ? dims.width * 2 : dims.width;
      const pdfPageHeight = dims.height;

      let pdf: jsPDF | null = null;

      for (let i = 0; i < stageNodes.length; i++) {
        setProgress({ current: i + 1, total: stageNodes.length });
        // Yield to keep UI progress bar smooth and prevent browser freeze
        await new Promise((r) => setTimeout(r, 25));

        const node = stageNodes[i];
        const isSingleCoverNode = node.getAttribute('data-pdf-cover') === 'true';

        const nodeW = isSingleCoverNode ? dims.width : pdfPageWidth;
        const nodeH = pdfPageHeight;
        const pageOrientation = nodeW >= nodeH ? 'landscape' : 'portrait';

        // Cap canvas dimension safely at 4096px max side so browser canvas never overflows
        const maxAllowedScale = Math.min(targetScale, 4096 / Math.max(nodeW, nodeH));

        const canvas = await html2canvas(node, {
          scale: maxAllowedScale,
          width: nodeW,
          height: nodeH,
          useCORS: true,
          allowTaint: true,
          imageTimeout: 0,
          backgroundColor: '#F8F5F0',
          logging: false,
        });

        const jpegQuality = quality === 'standard' ? 0.92 : 0.99;
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);

        if (!pdf) {
          pdf = new jsPDF({
            orientation: pageOrientation,
            unit: 'px',
            format: [nodeW, nodeH],
            hotfixes: ['px_scaling'],
            compress: false,
          });
        } else {
          pdf.addPage([nodeW, nodeH], pageOrientation);
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, nodeW, nodeH, undefined, 'SLOW');
      }

      if (!pdf) {
        throw new Error('Failed to initialize PDF document');
      }

      const safeFilename =
        album.title.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9 -]/g, '').trim() || 'Memoria_Photobook';
      pdf.save(`${safeFilename}.pdf`);
      addToast(t.export.exportSuccess, 'success');
      onClose();
    } catch (err) {
      console.error('PDF Export error:', err);
      addToast(t.export.exportError, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Determine pages to render in offscreen stage
  const startIdx = rangeType === 'all' ? 0 : Math.max(0, fromPage - 1);
  const endIdx =
    rangeType === 'all'
      ? album.pages.length - 1
      : Math.min(album.pages.length - 1, Math.max(startIdx, toPage - 1));
  const pagesToExport = album.pages.slice(startIdx, endIdx + 1);

  // Group into pairs if spread mode
  const spreadPairs: Array<[typeof pagesToExport[0], typeof pagesToExport[0] | undefined]> = [];
  if (exportMode === 'spread') {
    for (let i = 0; i < pagesToExport.length; i += 2) {
      spreadPairs.push([pagesToExport[i], pagesToExport[i + 1]]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-ivory border border-beige rounded-2xl shadow-book max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-cream/70 border-b border-beige flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-charcoal">{t.export.title}</h2>
            <p className="text-xs text-charcoal/65 mt-0.5">{t.export.subtitle}</p>
          </div>
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="p-2 rounded-full text-charcoal/60 hover:text-charcoal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Export Mode */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
              {t.export.modeLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  exportMode === 'single'
                    ? 'border-terracotta bg-cream ring-1 ring-terracotta'
                    : 'border-beige bg-white'
                }`}
              >
                <div className="font-semibold text-charcoal text-sm">{t.export.modeSingle}</div>
                <p className="text-[11px] text-charcoal/65 mt-1 leading-relaxed">
                  {t.export.modeSingleDesc}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('spread')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  exportMode === 'spread'
                    ? 'border-terracotta bg-cream ring-1 ring-terracotta'
                    : 'border-beige bg-white'
                }`}
              >
                <div className="font-semibold text-charcoal text-sm">{t.export.modeSpread}</div>
                <p className="text-[11px] text-charcoal/65 mt-1 leading-relaxed">
                  {t.export.modeSpreadDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Page Range */}
          <div className="space-y-2.5">
            <label className="block font-semibold uppercase tracking-wider text-charcoal/70">
              {t.export.rangeLabel}
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={rangeType === 'all'}
                  onChange={() => setRangeType('all')}
                  className="accent-terracotta"
                />
                <span>{t.export.rangeAll}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={rangeType === 'custom'}
                  onChange={() => setRangeType('custom')}
                  className="accent-terracotta"
                />
                <span>{t.export.rangeCustom}</span>
              </label>
            </div>

            {rangeType === 'custom' && (
              <div className="flex items-center gap-3 pt-1">
                <div>
                  <span className="text-charcoal/65 mr-1.5">{t.export.fromPage}:</span>
                  <input
                    type="number"
                    min={1}
                    max={album.pages.length}
                    value={fromPage}
                    onChange={(e) => setFromPage(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-white border border-beige"
                  />
                </div>
                <div>
                  <span className="text-charcoal/65 mr-1.5">{t.export.toPage}:</span>
                  <input
                    type="number"
                    min={fromPage}
                    max={album.pages.length}
                    value={toPage}
                    onChange={(e) => setToPage(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-white border border-beige"
                  />
                </div>
              </div>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeCover}
                onChange={(e) => setIncludeCover(e.target.checked)}
                className="accent-terracotta"
              />
              <span>{t.export.includeCover}</span>
            </label>
          </div>

          {/* Quality */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
              {t.export.qualityLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'standard', label: t.export.qualityStandard },
                  { id: 'high', label: t.export.qualityHigh },
                  { id: 'print', label: t.export.qualityPrint },
                ] as const
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuality(q.id)}
                  className={`p-2.5 rounded-xl border text-left transition-colors ${
                    quality === q.id
                      ? 'border-charcoal bg-charcoal text-ivory font-medium'
                      : 'border-beige bg-white text-charcoal'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="line-clamp-2">{q.label}</span>
                    {quality === q.id && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar if Exporting */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-cream border border-beige space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-charcoal">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-terracotta" />
                  {t.export.exportingProgress
                    .replace('{current}', String(progress.current))
                    .replace('{total}', String(progress.total))}
                </span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-beige overflow-hidden">
                <div
                  className="h-full bg-terracotta transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cream/70 border-b border-beige flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-charcoal/70 hover:text-charcoal"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleStartExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta text-white hover:bg-charcoal text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{t.export.startExport}</span>
          </button>
        </div>
      </div>

      {/* Offscreen DOM Rendering Stage exclusively for Album Pages */}
      <div
        ref={renderStageRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0px',
          pointerEvents: 'none',
          zIndex: -50,
        }}
      >
        {includeCover && (
          <div data-pdf-item="cover-front" data-pdf-cover="true">
            <BookCoverRenderer
              cover={album.cover}
              format={album.format}
              coverPhotoUrl={coverPhotoUrl}
              author={album.author}
              scale={1}
            />
          </div>
        )}

        {exportMode === 'single'
          ? pagesToExport.map((page) => (
              <div key={page.id} data-pdf-item={page.id}>
                <PageSurfaceRenderer
                  page={page}
                  format={album.format}
                  photoUrls={photoUrls}
                  scale={1}
                  interactive={false}
                />
              </div>
            ))
          : spreadPairs.map(([leftPage, rightPage], idx) => (
              <div
                key={`spread-${idx}`}
                data-pdf-item={`spread-${idx}`}
                style={{
                  width: dims.width * 2,
                  height: dims.height,
                  display: 'flex',
                  backgroundColor: '#F8F5F0',
                }}
              >
                <PageSurfaceRenderer
                  page={leftPage}
                  format={album.format}
                  photoUrls={photoUrls}
                  scale={1}
                  pageSide="left"
                  interactive={false}
                />
                {rightPage ? (
                  <PageSurfaceRenderer
                    page={rightPage}
                    format={album.format}
                    photoUrls={photoUrls}
                    scale={1}
                    pageSide="right"
                    interactive={false}
                  />
                ) : (
                  <div
                    style={{
                      width: dims.width,
                      height: dims.height,
                      backgroundColor: leftPage.backgroundColor,
                    }}
                  />
                )}
              </div>
            ))}
      </div>
    </div>
  );
};
