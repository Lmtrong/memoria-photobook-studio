export type Language = 'vi' | 'en';

export type AlbumFormat = 'square' | 'portrait' | 'landscape' | 'panorama';

export type AlbumThemeId =
  | 'luxury-minimalist'
  | 'vintage-scrapbook'
  | 'modern-editorial'
  | 'romantic'
  | 'travel-journal'
  | 'minimal-white';

export type ImageFitMode = 'cover' | 'contain';

export interface PhotoSlot {
  id: string;
  /** Percentage 0-100 relative to page canvas */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  photoId: string | null;
  /** Crop & pan offset inside frame (-50 to 50) */
  cropX: number;
  cropY: number;
  cropZoom: number; // 1 to 3
  fitMode: ImageFitMode;
  borderWidth: number;
  borderColor: string;
  cornerRadius: number;
  shadow: 'none' | 'soft' | 'polaroid' | 'deep';
  opacity: number;
  polaroidCaption?: string;
}

export type TextFrameStyle =
  | 'none'
  | 'classic-card'
  | 'gold-double'
  | 'vintage-paper'
  | 'ribbon-label'
  | 'polaroid-note'
  | 'glass-minimal'
  | 'arch-window';

export const TEXT_BOX_MAX_CHARS = 500;

export interface TextElement {
  id: string;
  content: string;
  /** Decorative frame around the text (text box). Undefined/'none' = plain text */
  frameStyle?: TextFrameStyle;
  frameBg?: string;
  frameBorderColor?: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 10-100
  fontFamily: string;
  fontSize: number; // px relative to base 800px canvas
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  rotation: number;
  opacity: number;
  zIndex: number;
}

export type StickerCategory =
  | 'ribbons'
  | 'flowers'
  | 'tape'
  | 'frames'
  | 'stamps'
  | 'illustrations'
  | 'hearts'
  | 'stars'
  | 'shapes';

export type PageBorderStyle =
  | 'none'
  | 'double-gold'
  | 'botanical-corners'
  | 'vintage-filigree'
  | 'minimal-editorial'
  | 'romantic-arch'
  | 'postCard-frame'
  | 'dotted-stitch';

export interface StickerElement {
  id: string;
  stickerType: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 5-60
  height: number; // Percentage 5-60
  rotation: number;
  opacity: number;
  zIndex: number;
  color?: string;
  label?: string;
}

export type BackgroundPattern =
  | 'none'
  | 'subtle'
  | 'linen'
  | 'vintage'
  | 'floral'
  | 'dots'
  | 'grid';

export interface AlbumPage {
  id: string;
  pageNumber: number;
  layoutId: string;
  backgroundColor: string;
  backgroundPattern: BackgroundPattern;
  borderStyle?: PageBorderStyle;
  borderColor?: string;
  padding: number; // percentage or px (0 - 48)
  photoSlots: PhotoSlot[];
  textElements: TextElement[];
  stickers: StickerElement[];
}

export interface CoverConfig {
  backgroundColor: string;
  spineColor: string;
  borderColor: string;
  coverPhotoId: string | null;
  title: string;
  subtitle: string;
  titleFont: string;
  titleColor: string;
  layoutStyle: 'classic' | 'modern' | 'full-bleed' | 'minimal-frame';
  ornament?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  emailOrPhone: string;
  contactType: 'email' | 'phone';
  displayName: string;
  createdAt: string;
}

export interface Album {
  id: string;
  ownerId?: string;
  ownerUsername?: string;
  ownerName?: string;
  isPublic?: boolean;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  format: AlbumFormat;
  themeId: AlbumThemeId;
  cover: CoverConfig;
  pages: AlbumPage[];
  isSample?: boolean;
  shareKey?: string;
  cloudSyncedAt?: string;
}

export interface StoredPhoto {
  id: string;
  albumId: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  originalBlob: Blob;
  thumbnailDataUrl: string;
  remoteUrl?: string;
  createdAt: string;
}

export interface AudioSegmentConfig {
  id: string;
  sourceName: string;
  startTime: number; // seconds
  endTime: number; // seconds
  fadeIn: number; // seconds
  fadeOut: number; // seconds
}

export interface StoredAudio {
  id: string;
  albumId: string;
  name: string;
  mimeType: string;
  blob: Blob;
  remoteUrl?: string;
  duration?: number;
  segments?: AudioSegmentConfig[];
  createdAt: string;
}

export interface PredefinedLayout {
  id: string;
  nameVi: string;
  nameEn: string;
  photoCount: number;
  slots: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    shadow?: 'none' | 'soft' | 'polaroid' | 'deep';
    borderWidth?: number;
    cornerRadius?: number;
  }>;
}

export interface ThemePreset {
  id: AlbumThemeId;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  defaultCoverBg: string;
  defaultSpineColor: string;
  defaultCoverTextColor: string;
  defaultPageBg: string;
  defaultPattern: BackgroundPattern;
  defaultTitleFont: string;
  defaultBodyFont: string;
  defaultPhotoBorderWidth: number;
  defaultPhotoBorderColor: string;
  defaultPhotoShadow: 'none' | 'soft' | 'polaroid' | 'deep';
  defaultPhotoCornerRadius: number;
  accentColor: string;
  previewGradient: string;
}
