import React from 'react';
import { TextElement, TextFrameStyle } from '../../types';

export const TEXT_FRAME_STYLES: TextFrameStyle[] = [
  'classic-card',
  'gold-double',
  'vintage-paper',
  'ribbon-label',
  'polaroid-note',
  'glass-minimal',
  'arch-window',
  'none',
];

export const TEXT_FRAME_DEFAULTS: Record<
  TextFrameStyle,
  { bg: string; border: string; font: string; color: string; fontSize: number; italic: boolean }
> = {
  none: { bg: 'transparent', border: 'transparent', font: 'Cormorant Garamond', color: '#39332F', fontSize: 22, italic: false },
  'classic-card': { bg: '#FBF8F2', border: '#C9B39B', font: 'EB Garamond', color: '#39332F', fontSize: 20, italic: true },
  'gold-double': { bg: '#FFFDF8', border: '#C5A059', font: 'Bodoni Moda', color: '#3A2F28', fontSize: 19, italic: false },
  'vintage-paper': { bg: '#F3E6CC', border: '#B08D68', font: 'Charm', color: '#4A3628', fontSize: 21, italic: false },
  'ribbon-label': { bg: '#9C7560', border: '#7A5846', font: 'Prata', color: '#FFFDF9', fontSize: 17, italic: false },
  'polaroid-note': { bg: '#FFFFFF', border: '#D8C7B4', font: 'Dancing Script', color: '#5C493E', fontSize: 23, italic: false },
  'glass-minimal': { bg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.9)', font: 'Montserrat', color: '#2F2A26', fontSize: 15, italic: false },
  'arch-window': { bg: '#F8EFEC', border: '#C98F86', font: 'Great Vibes', color: '#6E3F3A', fontSize: 28, italic: false },
};

/** Style applied to the text box wrapper so html2canvas / PDF export renders it identically. */
export function getTextFrameWrapperStyle(txt: TextElement, scale: number): React.CSSProperties {
  const style = txt.frameStyle || 'none';
  if (style === 'none') return {};
  const bg = txt.frameBg || TEXT_FRAME_DEFAULTS[style].bg;
  const border = txt.frameBorderColor || TEXT_FRAME_DEFAULTS[style].border;
  const pad = `${Math.round(16 * scale)}px ${Math.round(22 * scale)}px`;

  switch (style) {
    case 'classic-card':
      return {
        backgroundColor: bg,
        border: `${Math.max(1, scale)}px solid ${border}`,
        outline: `${Math.max(1, scale)}px solid ${border}`,
        outlineOffset: `${-Math.round(6 * scale)}px`,
        borderRadius: 3 * scale,
        padding: pad,
        boxShadow: '0 6px 16px -6px rgba(57,51,47,0.22)',
      };
    case 'gold-double':
      return {
        backgroundColor: bg,
        border: `${Math.max(2, 3 * scale)}px double ${border}`,
        padding: pad,
        boxShadow: `inset 0 0 0 ${Math.round(5 * scale)}px ${bg}, inset 0 0 0 ${Math.round(6 * scale)}px ${border}`,
      };
    case 'vintage-paper':
      return {
        backgroundColor: bg,
        backgroundImage:
          'radial-gradient(at 15% 20%, rgba(156,117,96,0.18) 0px, transparent 55%), radial-gradient(at 85% 85%, rgba(120,85,60,0.16) 0px, transparent 50%)',
        border: `${Math.max(1, scale)}px dashed ${border}`,
        borderRadius: 2 * scale,
        padding: pad,
        boxShadow: '2px 4px 12px -4px rgba(57,51,47,0.3)',
      };
    case 'ribbon-label':
      return {
        backgroundColor: bg,
        border: `${Math.max(1, scale)}px solid ${border}`,
        padding: `${Math.round(10 * scale)}px ${Math.round(34 * scale)}px`,
        clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
      };
    case 'polaroid-note':
      return {
        backgroundColor: bg,
        border: `${Math.max(1, scale)}px solid ${border}`,
        padding: pad,
        boxShadow: '0 10px 20px -8px rgba(57,51,47,0.3)',
      };
    case 'glass-minimal':
      return {
        backgroundColor: bg,
        border: `${Math.max(1, scale)}px solid ${border}`,
        borderRadius: 10 * scale,
        padding: pad,
        boxShadow: '0 8px 24px -10px rgba(57,51,47,0.25)',
      };
    case 'arch-window':
      return {
        backgroundColor: bg,
        border: `${Math.max(1, 1.5 * scale)}px solid ${border}`,
        borderRadius: `${Math.round(120 * scale)}px ${Math.round(120 * scale)}px ${Math.round(6 * scale)}px ${Math.round(6 * scale)}px`,
        padding: `${Math.round(30 * scale)}px ${Math.round(22 * scale)}px ${Math.round(18 * scale)}px`,
      };
    default:
      return {};
  }
}

/** Extra decorative ornaments drawn on top of a framed text box. */
export function renderTextFrameOrnaments(txt: TextElement, scale: number): React.ReactNode {
  const style = txt.frameStyle || 'none';
  const border = txt.frameBorderColor || TEXT_FRAME_DEFAULTS[style].border;
  if (style === 'polaroid-note') {
    return (
      <div
        className="absolute left-1/2 pointer-events-none"
        style={{
          top: -Math.round(9 * scale),
          width: Math.round(70 * scale),
          height: Math.round(18 * scale),
          transform: 'translateX(-50%) rotate(-3deg)',
          backgroundColor: 'rgba(216,199,180,0.78)',
        }}
      />
    );
  }
  if (style === 'gold-double' || style === 'classic-card') {
    const s = Math.max(4, Math.round(7 * scale));
    return (
      <>
        {[
          { top: -s / 2, left: '50%' },
          { bottom: -s / 2, left: '50%' },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              ...pos,
              width: s,
              height: s,
              backgroundColor: border,
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        ))}
      </>
    );
  }
  return null;
}
