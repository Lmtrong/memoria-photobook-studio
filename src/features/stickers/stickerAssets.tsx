import React from 'react';
import { PageBorderStyle, StickerCategory } from '../../types';

export interface StickerPreset {
  id: string;
  category: StickerCategory;
  nameVi: string;
  nameEn: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  defaultLabel?: string;
}

export const STICKER_PRESETS: StickerPreset[] = [
  // ==================== RIBBONS & BOWS (NƠ & RUY BĂNG) ====================
  {
    id: 'ribbon-silk-bow',
    category: 'ribbons',
    nameVi: 'Nơ lụa Coquette mềm mại',
    nameEn: 'Coquette Silk Bow',
    defaultWidth: 18,
    defaultHeight: 16,
    defaultColor: '#C87D76',
  },
  {
    id: 'ribbon-velvet-long',
    category: 'ribbons',
    nameVi: 'Nơ nhung đuôi dài quý phái',
    nameEn: 'Long Tail Velvet Bow',
    defaultWidth: 16,
    defaultHeight: 24,
    defaultColor: '#8E433D',
  },
  {
    id: 'ribbon-banner-scroll',
    category: 'ribbons',
    nameVi: 'Dải lụa uốn lượn cổ điển',
    nameEn: 'Vintage Scroll Ribbon Banner',
    defaultWidth: 34,
    defaultHeight: 11,
    defaultColor: '#C5A059',
    defaultLabel: 'PRECIOUS MEMORIES',
  },
  {
    id: 'ribbon-corner-sash',
    category: 'ribbons',
    nameVi: 'Dải ruy băng vắt góc ảnh',
    nameEn: 'Corner Silk Sash',
    defaultWidth: 20,
    defaultHeight: 20,
    defaultColor: '#B99B83',
  },
  {
    id: 'ribbon-rosette-award',
    category: 'ribbons',
    nameVi: 'Huy hiệu nơ xếp ly',
    nameEn: 'Pleated Rosette Ribbon',
    defaultWidth: 15,
    defaultHeight: 21,
    defaultColor: '#9C7560',
    defaultLabel: '2026',
  },
  {
    id: 'ribbon-lace-divider',
    category: 'ribbons',
    nameVi: 'Dải ren lụa thắt nơ',
    nameEn: 'Lace & Bow Divider',
    defaultWidth: 36,
    defaultHeight: 8,
    defaultColor: '#D6A29C',
  },

  // ==================== BOTANICAL FLOWERS (HOA NGHỆ THUẬT CHI TIẾT) ====================
  {
    id: 'flower-peony-bloom',
    category: 'flowers',
    nameVi: 'Hoa Mẫu Đơn nở rộ',
    nameEn: 'Blush Peony Bloom',
    defaultWidth: 18,
    defaultHeight: 18,
    defaultColor: '#D98A82',
  },
  {
    id: 'flower-english-rose',
    category: 'flowers',
    nameVi: 'Đóa Hồng cổ điển Anh Quốc',
    nameEn: 'Layered English Rose',
    defaultWidth: 17,
    defaultHeight: 20,
    defaultColor: '#C25E56',
  },
  {
    id: 'flower-sunflower',
    category: 'flowers',
    nameVi: 'Hoa Hướng Dương rực rỡ',
    nameEn: 'Golden Sunflower',
    defaultWidth: 18,
    defaultHeight: 18,
    defaultColor: '#E09F3E',
  },
  {
    id: 'flower-cherry-branch',
    category: 'flowers',
    nameVi: 'Cành Hoa Anh Đào mùa xuân',
    nameEn: 'Cherry Blossom Branch',
    defaultWidth: 26,
    defaultHeight: 16,
    defaultColor: '#E5A9A9',
  },
  {
    id: 'flower-lotus',
    category: 'flowers',
    nameVi: 'Hoa Sen thanh khiết',
    nameEn: 'Sacred Water Lotus',
    defaultWidth: 19,
    defaultHeight: 15,
    defaultColor: '#D68981',
  },
  {
    id: 'flower-tulip-bouquet',
    category: 'flowers',
    nameVi: 'Bó hoa Tulip thắt nơ',
    nameEn: 'Tulip Bouquet with Bow',
    defaultWidth: 16,
    defaultHeight: 24,
    defaultColor: '#CF6F68',
  },
  {
    id: 'flower-wreath-botanical',
    category: 'flowers',
    nameVi: 'Vòng nguyệt quế Hoa & Lá',
    nameEn: 'Botanical Floral Wreath',
    defaultWidth: 24,
    defaultHeight: 24,
    defaultColor: '#6E7F68',
  },
  {
    id: 'flower-eucalyptus',
    category: 'flowers',
    nameVi: 'Nhánh lá Khuynh Diệp bạc',
    nameEn: 'Silver Dollar Eucalyptus',
    defaultWidth: 16,
    defaultHeight: 23,
    defaultColor: '#768F80',
  },
  {
    id: 'flower-lavender',
    category: 'flowers',
    nameVi: 'Bó Oải Hương Provence',
    nameEn: 'Dried Lavender Bundle',
    defaultWidth: 14,
    defaultHeight: 23,
    defaultColor: '#8D7B99',
  },
  {
    id: 'flower-daisy',
    category: 'flowers',
    nameVi: 'Cúc Họa Mi trắng muốt',
    nameEn: 'Wild Chamomile Daisy',
    defaultWidth: 15,
    defaultHeight: 15,
    defaultColor: '#E5B95C',
  },

  // ==================== WASHI TAPE (BĂNG KEO NGHỆ THUẬT) ====================
  {
    id: 'washi-gold-foil',
    category: 'tape',
    nameVi: 'Băng keo nhũ vàng ánh kim',
    nameEn: 'Gold Foil Botanical Washi',
    defaultWidth: 22,
    defaultHeight: 5.5,
    defaultColor: '#C5A059',
  },
  {
    id: 'washi-floral-print',
    category: 'tape',
    nameVi: 'Băng keo in hoa nhí',
    nameEn: 'Pressed Floral Washi Tape',
    defaultWidth: 22,
    defaultHeight: 5.5,
    defaultColor: '#D6A29C',
  },
  {
    id: 'washi-beige',
    category: 'tape',
    nameVi: 'Băng keo giấy Kraft',
    nameEn: 'Torn Kraft Washi Tape',
    defaultWidth: 20,
    defaultHeight: 5,
    defaultColor: '#D8C7B4',
  },
  {
    id: 'washi-grid',
    category: 'tape',
    nameVi: 'Băng keo kẻ caro cổ điển',
    nameEn: 'Checkered Grid Washi',
    defaultWidth: 20,
    defaultHeight: 5,
    defaultColor: '#9C7560',
  },
  {
    id: 'washi-sage',
    category: 'tape',
    nameVi: 'Băng keo xanh trà Matcha',
    nameEn: 'Sage Leaf Washi',
    defaultWidth: 20,
    defaultHeight: 5,
    defaultColor: '#8FA395',
  },

  // ==================== FRAMES, CLIPS & SEALS ====================
  {
    id: 'wax-seal',
    category: 'frames',
    nameVi: 'Dấu sáp đóng thư Hoàng Gia',
    nameEn: 'Botanical Wax Seal',
    defaultWidth: 12,
    defaultHeight: 12,
    defaultColor: '#9E4740',
  },
  {
    id: 'paper-clip-gold',
    category: 'frames',
    nameVi: 'Kẹp giấy đồng mạ vàng',
    nameEn: 'Brass Paperclip',
    defaultWidth: 7,
    defaultHeight: 15,
    defaultColor: '#C5A059',
  },
  {
    id: 'vintage-wooden-pin',
    category: 'frames',
    nameVi: 'Kẹp gỗ treo ảnh kỷ niệm',
    nameEn: 'Wooden Photo Clothespin',
    defaultWidth: 6,
    defaultHeight: 14,
    defaultColor: '#B68D65',
  },
  {
    id: 'photo-corners',
    category: 'frames',
    nameVi: '4 Góc cài ảnh cổ điển',
    nameEn: '4 Vintage Photo Corners',
    defaultWidth: 18,
    defaultHeight: 18,
    defaultColor: '#543D2E',
  },
  {
    id: 'polaroid-frame-overlay',
    category: 'frames',
    nameVi: 'Khung Polaroid kèm chữ',
    nameEn: 'Polaroid Frame Overlay',
    defaultWidth: 28,
    defaultHeight: 34,
    defaultColor: '#FFFFFF',
    defaultLabel: 'Sweet Memory',
  },
  {
    id: 'baroque-oval-frame',
    category: 'frames',
    nameVi: 'Khung gương Oval cổ điển',
    nameEn: 'Ornate Oval Cameo Frame',
    defaultWidth: 22,
    defaultHeight: 28,
    defaultColor: '#C5A059',
  },

  // ==================== STAMPS & POSTMARKS ====================
  {
    id: 'stamp-postmark',
    category: 'stamps',
    nameVi: 'Dấu bưu điện Kỷ Niệm',
    nameEn: 'Vintage Postmark',
    defaultWidth: 24,
    defaultHeight: 14,
    defaultColor: '#5C493E',
    defaultLabel: 'MEMORIA • 2026',
  },
  {
    id: 'stamp-graduation',
    category: 'stamps',
    nameVi: 'Huy hiệu Lễ Tốt Nghiệp',
    nameEn: 'Graduation Honor Seal',
    defaultWidth: 20,
    defaultHeight: 20,
    defaultColor: '#8C5843',
    defaultLabel: 'CLASS OF 2026',
  },
  {
    id: 'stamp-location',
    category: 'stamps',
    nameVi: 'Tem tọa độ hành trình',
    nameEn: 'Location Stamp',
    defaultWidth: 25,
    defaultHeight: 11,
    defaultColor: '#3B4D43',
    defaultLabel: 'SPECIAL PLACE',
  },
  {
    id: 'stamp-airmail',
    category: 'stamps',
    nameVi: 'Tem thư Par Avion',
    nameEn: 'Par Avion Postage',
    defaultWidth: 16,
    defaultHeight: 19,
    defaultColor: '#475C7A',
    defaultLabel: 'PAR AVION',
  },

  // ==================== VINTAGE ILLUSTRATIONS ====================
  {
    id: 'illust-butterfly',
    category: 'illustrations',
    nameVi: 'Cánh bướm mùa xuân',
    nameEn: 'Botanical Monarch Butterfly',
    defaultWidth: 15,
    defaultHeight: 14,
    defaultColor: '#C87D55',
  },
  {
    id: 'illust-grad-cap',
    category: 'illustrations',
    nameVi: 'Mũ Cử Nhân & Bằng Tốt Nghiệp',
    nameEn: 'Graduation Cap & Diploma',
    defaultWidth: 18,
    defaultHeight: 15,
    defaultColor: '#39332F',
  },
  {
    id: 'illust-camera',
    category: 'illustrations',
    nameVi: 'Máy ảnh Film Retro',
    nameEn: 'Analog Film Camera',
    defaultWidth: 16,
    defaultHeight: 14,
    defaultColor: '#4A3F39',
  },
  {
    id: 'illust-envelope',
    category: 'illustrations',
    nameVi: 'Phong thư gắn hoa khô',
    nameEn: 'Botanical Love Letter',
    defaultWidth: 16,
    defaultHeight: 14,
    defaultColor: '#9C7560',
  },
  {
    id: 'illust-coffee',
    category: 'illustrations',
    nameVi: 'Tách trà chiều ấm áp',
    nameEn: 'Porcelain Tea Cup',
    defaultWidth: 14,
    defaultHeight: 14,
    defaultColor: '#7A5640',
  },
  {
    id: 'illust-feather-quill',
    category: 'illustrations',
    nameVi: 'Bút lông vũ viết lưu bút',
    nameEn: 'Vintage Calligraphy Quill',
    defaultWidth: 18,
    defaultHeight: 18,
    defaultColor: '#6B4F3B',
  },

  // ==================== WATERCOLOR HEARTS & STARS ====================
  {
    id: 'heart-botanical-wreath',
    category: 'hearts',
    nameVi: 'Trái tim kết hoa lá',
    nameEn: 'Floral Heart Wreath',
    defaultWidth: 16,
    defaultHeight: 16,
    defaultColor: '#C25E56',
  },
  {
    id: 'heart-wax-embossed',
    category: 'hearts',
    nameVi: 'Trái tim lụa thêu nổi',
    nameEn: 'Embossed Velvet Heart',
    defaultWidth: 13,
    defaultHeight: 13,
    defaultColor: '#B84A42',
  },
  {
    id: 'heart-duo',
    category: 'hearts',
    nameVi: 'Đôi tim hồng phấn',
    nameEn: 'Twin Blush Hearts',
    defaultWidth: 14,
    defaultHeight: 12,
    defaultColor: '#D68981',
  },
  {
    id: 'star-constellation',
    category: 'stars',
    nameVi: 'Chòm sao lấp lánh mạ vàng',
    nameEn: 'Golden Constellation',
    defaultWidth: 18,
    defaultHeight: 14,
    defaultColor: '#C5A059',
  },
  {
    id: 'star-celestial',
    category: 'stars',
    nameVi: 'Trăng khuyết & Sao đêm',
    nameEn: 'Crescent Moon & Stars',
    defaultWidth: 15,
    defaultHeight: 15,
    defaultColor: '#B89552',
  },

  // ==================== TAGS & LABELS ====================
  {
    id: 'label-tag',
    category: 'shapes',
    nameVi: 'Thẻ bài giấy Kraft thắt dây',
    nameEn: 'Kraft Gift Tag',
    defaultWidth: 25,
    defaultHeight: 11,
    defaultColor: '#C9B39B',
    defaultLabel: 'Little Moments',
  },
  {
    id: 'label-ribbon',
    category: 'shapes',
    nameVi: 'Khung bảng tên cổ điển',
    nameEn: 'Editorial Plaque',
    defaultWidth: 28,
    defaultHeight: 10,
    defaultColor: '#B99B83',
    defaultLabel: 'OUR STORY',
  },
];

export const renderStickerSvg = (
  stickerType: string,
  color = '#9C7560',
  label?: string
): React.ReactNode => {
  switch (stickerType) {
    // ==================== RIBBONS & BOWS ====================
    case 'ribbon-silk-bow':
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-sm">
          {/* Left Ribbon Tail */}
          <path
            d="M95,78 C82,115 62,145 45,168 L68,162 L76,174 C88,145 96,115 102,82 Z"
            fill={color}
          />
          <path
            d="M95,78 C82,115 62,145 45,168"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
          {/* Right Ribbon Tail */}
          <path
            d="M105,78 C118,115 138,145 155,168 L132,162 L124,174 C112,145 104,115 98,82 Z"
            fill={color}
          />
          {/* Left Silk Loop */}
          <path
            d="M96,72 C65,30 18,36 22,72 C25,104 68,98 96,76 Z"
            fill={color}
            stroke="#39332F"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
          <path
            d="M88,68 C65,45 34,52 36,72 C38,88 68,85 88,73"
            fill="#000000"
            fillOpacity="0.12"
          />
          <path
            d="M35,55 Q58,42 86,64"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.45"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Right Silk Loop */}
          <path
            d="M104,72 C135,30 182,36 178,72 C175,104 132,98 104,76 Z"
            fill={color}
            stroke="#39332F"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
          <path
            d="M112,68 C135,45 166,52 164,72 C162,88 132,85 112,73"
            fill="#000000"
            fillOpacity="0.12"
          />
          <path
            d="M165,55 Q142,42 114,64"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.45"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Center Knot */}
          <rect
            x="88"
            y="58"
            width="24"
            height="26"
            rx="9"
            fill={color}
            stroke="#FFFFFF"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          <path d="M92,64 Q100,60 108,64" fill="none" stroke="#000000" strokeOpacity="0.2" strokeWidth="2" />
        </svg>
      );

    case 'ribbon-velvet-long':
      return (
        <svg viewBox="0 0 180 260" className="w-full h-full drop-shadow-md">
          {/* Flowing Long Tails */}
          <path
            d="M86,66 C72,120 48,180 26,245 L46,238 L54,252 C70,192 84,132 92,70 Z"
            fill={color}
          />
          <path
            d="M94,66 C108,120 132,180 154,245 L134,238 L126,252 C110,192 96,132 88,70 Z"
            fill={color}
          />
          {/* Velvet Loops */}
          <path
            d="M88,62 C52,22 14,35 20,66 C26,95 66,86 88,68 Z"
            fill={color}
          />
          <path
            d="M92,62 C128,22 166,35 160,66 C154,95 114,86 92,68 Z"
            fill={color}
          />
          {/* Gold Pearl Center */}
          <circle cx="90" cy="64" r="12" fill="#C5A059" />
          <circle cx="87" cy="61" r="4" fill="#FFF8E7" opacity="0.75" />
        </svg>
      );

    case 'ribbon-banner-scroll':
      return (
        <svg viewBox="0 0 340 110" className="w-full h-full drop-shadow-sm">
          {/* Back Ribbon Ends */}
          <path d="M12,42 L58,42 L58,86 L12,86 L28,64 Z" fill={color} filter="brightness(0.82)" />
          <path d="M328,42 L282,42 L282,86 L328,86 L312,64 Z" fill={color} filter="brightness(0.82)" />
          {/* Folds */}
          <polygon points="42,74 58,86 58,74" fill="#2A211B" opacity="0.45" />
          <polygon points="298,74 282,86 282,74" fill="#2A211B" opacity="0.45" />
          {/* Main Curved Front Banner */}
          <path
            d="M42,24 C120,14 220,14 298,24 L292,74 C220,64 120,64 48,74 Z"
            fill={color}
            stroke="#FFFDF9"
            strokeWidth="2"
          />
          <path
            d="M48,30 C120,20 220,20 292,30"
            fill="none"
            stroke="#FFFDF9"
            strokeOpacity="0.55"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <path
            d="M52,68 C120,58 220,58 288,68"
            fill="none"
            stroke="#FFFDF9"
            strokeOpacity="0.55"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text
            x="170"
            y="53"
            textAnchor="middle"
            fill="#FFFDF9"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="19"
            fontWeight="bold"
            letterSpacing="3.5"
          >
            {label || 'PRECIOUS MEMORIES'}
          </text>
        </svg>
      );

    case 'ribbon-corner-sash':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full drop-shadow-md">
          <polygon points="0,42 42,0 180,138 138,180" fill={color} />
          <line
            x1="6"
            y1="36"
            x2="144"
            y2="174"
            stroke="#FFFDF9"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <line
            x1="36"
            y1="6"
            x2="174"
            y2="144"
            stroke="#FFFDF9"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        </svg>
      );

    case 'ribbon-rosette-award':
      return (
        <svg viewBox="0 0 160 220" className="w-full h-full drop-shadow-md">
          {/* Tails */}
          <polygon points="56,115 36,205 60,190 74,210 82,115" fill={color} filter="brightness(0.88)" />
          <polygon points="104,115 124,205 100,190 86,210 78,115" fill={color} filter="brightness(0.88)" />
          {/* Scalloped Pleated Outer Ring */}
          {Array.from({ length: 16 }).map((_, i) => (
            <circle
              key={i}
              cx={80 + 44 * Math.cos((i * Math.PI) / 8)}
              cy={76 + 44 * Math.sin((i * Math.PI) / 8)}
              r="14"
              fill={color}
              stroke="#FFF8F0"
              strokeOpacity="0.3"
              strokeWidth="1"
            />
          ))}
          <circle cx="80" cy="76" r="40" fill={color} filter="brightness(1.08)" />
          <circle
            cx="80"
            cy="76"
            r="32"
            fill="#FAF6F0"
            stroke="#C5A059"
            strokeWidth="2.5"
          />
          <circle
            cx="80"
            cy="76"
            r="27"
            fill="none"
            stroke="#C5A059"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          <text
            x="80"
            y="82"
            textAnchor="middle"
            fill="#39332F"
            fontFamily="Cormorant Garamond, serif"
            fontSize="18"
            fontWeight="bold"
          >
            {label || '2026'}
          </text>
        </svg>
      );

    case 'ribbon-lace-divider':
      return (
        <svg viewBox="0 0 360 80" className="w-full h-full">
          <line x1="12" y1="40" x2="348" y2="40" stroke={color} strokeWidth="2.5" />
          <line
            x1="24"
            y1="33"
            x2="336"
            y2="33"
            stroke={color}
            strokeOpacity="0.5"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="24"
            y1="47"
            x2="336"
            y2="47"
            stroke={color}
            strokeOpacity="0.5"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Center dainty bow */}
          <path d="M180,40 C158,18 136,24 140,42 C144,58 164,52 180,40 Z" fill={color} />
          <path d="M180,40 C202,18 224,24 220,42 C216,58 196,52 180,40 Z" fill={color} />
          <path d="M178,42 L162,70 M182,42 L198,70" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="180" cy="40" r="5" fill="#FFFDF9" stroke={color} strokeWidth="2" />
        </svg>
      );

    // ==================== BOTANICAL FLOWERS (HOA NGHỆ THUẬT) ====================
    case 'flower-peony-bloom':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full drop-shadow-sm">
          {/* Botanical Leaves behind Peony */}
          <path d="M35,130 C12,115 18,82 52,92 C42,115 40,124 35,130 Z" fill="#637861" />
          <path d="M148,125 C172,108 162,76 128,88 C138,112 142,120 148,125 Z" fill="#637861" />
          <path d="M88,165 C68,158 64,132 90,128 C112,135 106,158 88,165 Z" fill="#526650" />
          {/* Outer Lush Petals */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
            <ellipse
              key={`outer-${ang}`}
              cx="90"
              cy="46"
              rx="28"
              ry="36"
              fill={color}
              fillOpacity="0.72"
              stroke="#FFF8F5"
              strokeWidth="1.2"
              transform={`rotate(${ang} 90 90)`}
            />
          ))}
          {/* Middle Ruffled Petals */}
          {[22, 67, 112, 157, 202, 247, 292, 337].map((ang) => (
            <ellipse
              key={`mid-${ang}`}
              cx="90"
              cy="58"
              rx="22"
              ry="28"
              fill={color}
              stroke="#FFF8F5"
              strokeWidth="1.2"
              transform={`rotate(${ang} 90 90)`}
            />
          ))}
          {/* Inner Delicate Cup Petals */}
          {[0, 60, 120, 180, 240, 300].map((ang) => (
            <ellipse
              key={`in-${ang}`}
              cx="90"
              cy="72"
              rx="15"
              ry="18"
              fill="#F9E3DF"
              stroke={color}
              strokeWidth="1"
              transform={`rotate(${ang} 90 90)`}
            />
          ))}
          {/* Golden Stamen Center */}
          <circle cx="90" cy="90" r="12" fill="#E6B85C" />
          {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((ang) => (
            <circle
              key={`st-${ang}`}
              cx={90 + 14 * Math.cos((ang * Math.PI) / 180)}
              cy={90 + 14 * Math.sin((ang * Math.PI) / 180)}
              r="2.5"
              fill="#FFF6D6"
            />
          ))}
        </svg>
      );

    case 'flower-english-rose':
      return (
        <svg viewBox="0 0 170 200" className="w-full h-full drop-shadow-sm">
          {/* Stem & Thorns & Leaves */}
          <path d="M85,105 Q80,150 88,192" fill="none" stroke="#4F664D" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M83,142 C52,132 38,148 56,164 C70,174 82,155 83,142 Z" fill="#5D755A" />
          <path d="M86,128 C116,116 132,132 114,148 C100,158 88,142 86,128 Z" fill="#6D8769" />
          {/* Layered Rose Bloom */}
          <circle cx="85" cy="68" r="46" fill={color} fillOpacity="0.82" />
          {/* Rose Petal Swirls */}
          <path
            d="M45,62 C45,32 125,32 125,62 C125,95 45,95 45,62 Z"
            fill={color}
            stroke="#FFF5F2"
            strokeWidth="2"
          />
          <path
            d="M54,68 C52,44 118,44 116,68 C114,94 56,94 54,68 Z"
            fill={color}
            filter="brightness(1.08)"
            stroke="#FFF5F2"
            strokeWidth="2"
          />
          <path
            d="M65,64 C65,48 105,48 105,64 C105,82 65,82 65,64 Z"
            fill="#F4C7C3"
            stroke={color}
            strokeWidth="2"
          />
          <path
            d="M74,63 C78,55 94,55 94,65 C94,73 76,73 78,63 C80,58 89,60 86,65"
            fill="none"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'flower-sunflower':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full drop-shadow-sm">
          {/* Back Layer Petals */}
          {Array.from({ length: 16 }).map((_, i) => (
            <path
              key={`b-${i}`}
              d="M90,14 C101,34 102,54 90,72 C78,54 79,34 90,14 Z"
              fill="#D48C29"
              transform={`rotate(${i * 22.5 + 11.25} 90 90)`}
            />
          ))}
          {/* Front Golden Petals */}
          {Array.from({ length: 16 }).map((_, i) => (
            <path
              key={`f-${i}`}
              d="M90,10 C102,32 102,55 90,74 C78,55 78,32 90,10 Z"
              fill={color}
              stroke="#FFF4D4"
              strokeWidth="0.8"
              transform={`rotate(${i * 22.5} 90 90)`}
            />
          ))}
          {/* Seed Disc Center */}
          <circle cx="90" cy="90" r="28" fill="#4A3222" stroke="#6E4B32" strokeWidth="4" />
          <circle cx="90" cy="90" r="21" fill="none" stroke="#C59142" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="90" cy="90" r="13" fill="none" stroke="#C59142" strokeWidth="1.5" strokeDasharray="2 3" />
        </svg>
      );

    case 'flower-cherry-branch':
      return (
        <svg viewBox="0 0 260 160" className="w-full h-full drop-shadow-xs">
          {/* Woody Branch */}
          <path
            d="M12,135 Q95,95 165,78 T248,38"
            fill="none"
            stroke="#5C4338"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M115,92 Q145,118 182,122"
            fill="none"
            stroke="#5C4338"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* 3 Sakura Blossoms */}
          {[
            { cx: 78, cy: 96, r: 1 },
            { cx: 158, cy: 72, r: 1.15 },
            { cx: 215, cy: 52, r: 0.85 },
          ].map((b, idx) => (
            <g key={idx} transform={`translate(${b.cx}, ${b.cy}) scale(${b.r})`}>
              {[0, 72, 144, 216, 288].map((ang) => (
                <path
                  key={ang}
                  d="M0,0 C-12,-14 -14,-32 -4,-36 L0,-31 L4,-36 C14,-32 12,-14 0,0 Z"
                  fill={color}
                  stroke="#FFF8F8"
                  strokeWidth="1.2"
                  transform={`rotate(${ang})`}
                />
              ))}
              <circle cx="0" cy="0" r="5" fill="#D46A6A" />
              {[0, 60, 120, 180, 240, 300].map((ang) => (
                <line
                  key={`st-${ang}`}
                  x1="0"
                  y1="0"
                  x2={11 * Math.cos((ang * Math.PI) / 180)}
                  y2={11 * Math.sin((ang * Math.PI) / 180)}
                  stroke="#C55A5A"
                  strokeWidth="1.2"
                />
              ))}
            </g>
          ))}
        </svg>
      );

    case 'flower-lotus':
      return (
        <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-xs">
          {/* Green Lotus Pad Base */}
          <ellipse cx="100" cy="122" rx="68" ry="12" fill="#5D7863" opacity="0.75" />
          {/* Side Outer Petals */}
          <path d="M100,118 C48,116 20,82 28,56 C54,64 78,88 100,118 Z" fill={color} opacity="0.75" />
          <path d="M100,118 C152,116 180,82 172,56 C146,64 122,88 100,118 Z" fill={color} opacity="0.75" />
          {/* Mid Layer Petals */}
          <path
            d="M100,118 C62,102 44,58 58,32 C82,48 94,82 100,118 Z"
            fill={color}
            stroke="#FFF6F5"
            strokeWidth="1.5"
          />
          <path
            d="M100,118 C138,102 156,58 142,32 C118,48 106,82 100,118 Z"
            fill={color}
            stroke="#FFF6F5"
            strokeWidth="1.5"
          />
          {/* Center Upright Petal */}
          <path
            d="M100,118 C74,84 74,38 100,14 C126,38 126,84 100,118 Z"
            fill={color}
            filter="brightness(1.08)"
            stroke="#FFF6F5"
            strokeWidth="1.8"
          />
          <circle cx="100" cy="96" r="9" fill="#E8B858" />
        </svg>
      );

    case 'flower-tulip-bouquet':
      return (
        <svg viewBox="0 0 160 230" className="w-full h-full drop-shadow-xs">
          {/* Stems */}
          <path d="M80,92 L80,210 M54,104 L88,208 M106,104 L72,208" stroke="#5A7358" strokeWidth="4" strokeLinecap="round" />
          {/* Long Tulip Leaves */}
          <path d="M78,175 C52,145 44,115 56,95 C64,125 70,150 78,175 Z" fill="#6B8568" />
          <path d="M82,175 C108,145 116,115 104,95 C96,125 90,150 82,175 Z" fill="#6B8568" />
          {/* Left Tulip */}
          <g transform="translate(50, 74) rotate(-18)">
            <path d="M0,26 C-18,22 -20,-12 -8,-22 C-2,-12 0,-4 0,26 Z" fill={color} />
            <path d="M0,26 C18,22 20,-12 8,-22 C2,-12 0,-4 0,26 Z" fill={color} />
            <path d="M0,26 C-12,10 -12,-18 0,-26 C12,-18 12,10 0,26 Z" fill={color} filter="brightness(1.1)" stroke="#FFF5F5" strokeWidth="1" />
          </g>
          {/* Right Tulip */}
          <g transform="translate(110, 74) rotate(18)">
            <path d="M0,26 C-18,22 -20,-12 -8,-22 C-2,-12 0,-4 0,26 Z" fill={color} />
            <path d="M0,26 C18,22 20,-12 8,-22 C2,-12 0,-4 0,26 Z" fill={color} />
            <path d="M0,26 C-12,10 -12,-18 0,-26 C12,-18 12,10 0,26 Z" fill={color} filter="brightness(1.1)" stroke="#FFF5F5" strokeWidth="1" />
          </g>
          {/* Center Tulip */}
          <g transform="translate(80, 56)">
            <path d="M0,30 C-20,24 -22,-14 -10,-26 C-2,-14 0,-4 0,30 Z" fill={color} />
            <path d="M0,30 C20,24 22,-14 10,-26 C2,-14 0,-4 0,30 Z" fill={color} />
            <path d="M0,30 C-14,12 -14,-20 0,-30 C14,-20 14,12 0,30 Z" fill={color} filter="brightness(1.12)" stroke="#FFF5F5" strokeWidth="1.2" />
          </g>
          {/* Ribbon Bow tying stems */}
          <path d="M80,162 C62,148 48,154 52,168 C56,178 70,172 80,162 Z" fill="#C5A059" />
          <path d="M80,162 C98,148 112,154 108,168 C104,178 90,172 80,162 Z" fill="#C5A059" />
          <circle cx="80" cy="162" r="5" fill="#FFF8E7" />
        </svg>
      );

    case 'flower-wreath-botanical':
      return (
        <svg viewBox="0 0 220 220" className="w-full h-full">
          <circle cx="110" cy="110" r="78" fill="none" stroke={color} strokeWidth="2.2" />
          <circle cx="110" cy="110" r="74" fill="none" stroke="#C5A059" strokeWidth="1" strokeDasharray="4 4" />
          {Array.from({ length: 12 }).map((_, i) => {
            const ang = (i * 30 * Math.PI) / 180;
            const x = 110 + 78 * Math.cos(ang);
            const y = 110 + 78 * Math.sin(ang);
            return (
              <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 30 + 90})`}>
                <ellipse cx="-8" cy="0" rx="10" ry="5" transform="rotate(-25 -8 0)" fill={color} opacity="0.85" />
                <ellipse cx="8" cy="0" rx="10" ry="5" transform="rotate(25 8 0)" fill={color} opacity="0.85" />
                {i % 3 === 0 && <circle cx="0" cy="0" r="6" fill="#D98A82" stroke="#FFF" strokeWidth="1" />}
              </g>
            );
          })}
        </svg>
      );

    case 'flower-eucalyptus':
    case 'flower-pressed-branch':
      return (
        <svg viewBox="0 0 140 200" className="w-full h-full">
          <path d="M70,190 Q62,105 78,16" fill="none" stroke="#5A6B5C" strokeWidth="2.8" strokeLinecap="round" />
          {[
            { cx: 48, cy: 152, r: 16, rot: -25 },
            { cx: 92, cy: 138, r: 16, rot: 25 },
            { cx: 46, cy: 112, r: 18, rot: -20 },
            { cx: 94, cy: 96, r: 17, rot: 22 },
            { cx: 52, cy: 70, r: 15, rot: -18 },
            { cx: 92, cy: 56, r: 14, rot: 20 },
            { cx: 76, cy: 26, r: 12, rot: -5 },
          ].map((lf, i) => (
            <ellipse
              key={i}
              cx={lf.cx}
              cy={lf.cy}
              rx={lf.r}
              ry={lf.r * 0.78}
              transform={`rotate(${lf.rot} ${lf.cx} ${lf.cy})`}
              fill={color}
              fillOpacity="0.82"
              stroke="#FFFDF9"
              strokeWidth="0.8"
            />
          ))}
        </svg>
      );

    case 'flower-daisy':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-xs">
          {Array.from({ length: 14 }).map((_, i) => (
            <ellipse
              key={i}
              cx="70"
              cy="28"
              rx="8.5"
              ry="26"
              fill="#FFFFFF"
              stroke="#E3D7C8"
              strokeWidth="1"
              transform={`rotate(${(i * 360) / 14} 70 70)`}
            />
          ))}
          <circle cx="70" cy="70" r="16" fill={color} stroke="#D49B38" strokeWidth="2" />
        </svg>
      );

    case 'flower-lavender':
      return (
        <svg viewBox="0 0 120 200" className="w-full h-full">
          <path d="M60,188 L60,24 M46,186 L68,32 M74,186 L52,32" stroke="#6E7F68" strokeWidth="2.5" strokeLinecap="round" />
          {[32, 48, 64, 80, 96, 112].map((y, idx) => (
            <g key={idx}>
              <ellipse cx="48" cy={y} rx="8" ry="5" transform={`rotate(-32 48 ${y})`} fill={color} />
              <ellipse cx="72" cy={y + 4} rx="8" ry="5" transform={`rotate(32 72 ${y + 4})`} fill={color} />
              <ellipse cx="60" cy={y - 4} rx="6" ry="4" fill={color} filter="brightness(1.12)" />
            </g>
          ))}
          <path d="M46,148 Q60,154 74,148" fill="none" stroke="#C5A059" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    // ==================== WASHI TAPE ====================
    case 'washi-gold-foil':
      return (
        <svg viewBox="0 0 240 60" className="w-full h-full drop-shadow-xs">
          <path
            d="M6,8 L234,6 L229,19 L235,31 L228,43 L234,54 L6,54 L12,42 L5,30 L11,18 Z"
            fill={color}
            fillOpacity="0.88"
          />
          <circle cx="45" cy="30" r="4" fill="#FFF8E7" opacity="0.8" />
          <path d="M85,30 Q120,16 155,30 Q120,44 85,30 Z" fill="none" stroke="#FFF8E7" strokeWidth="1.5" />
          <circle cx="120" cy="30" r="5" fill="#FFF8E7" />
          <circle cx="195" cy="30" r="4" fill="#FFF8E7" opacity="0.8" />
        </svg>
      );

    case 'washi-floral-print':
      return (
        <svg viewBox="0 0 240 60" className="w-full h-full drop-shadow-xs">
          <path
            d="M6,8 L234,6 L229,19 L235,31 L228,43 L234,54 L6,54 L12,42 L5,30 L11,18 Z"
            fill={color}
            fillOpacity="0.82"
          />
          {[42, 95, 148, 198].map((x, idx) => (
            <g key={idx} transform={`translate(${x}, ${idx % 2 === 0 ? 26 : 34})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle
                  key={a}
                  cx={6 * Math.cos((a * Math.PI) / 180)}
                  cy={6 * Math.sin((a * Math.PI) / 180)}
                  r="4"
                  fill="#FFFDF9"
                />
              ))}
              <circle cx="0" cy="0" r="3" fill="#E5B95C" />
            </g>
          ))}
        </svg>
      );

    case 'washi-beige':
    case 'washi-rose':
    case 'washi-sage':
      return (
        <svg viewBox="0 0 220 60" className="w-full h-full drop-shadow-xs">
          <path
            d="M6,8 L214,6 L210,18 L216,30 L209,42 L215,53 L5,55 L11,43 L4,31 L10,19 Z"
            fill={color}
            fillOpacity="0.78"
          />
          <line x1="14" y1="15" x2="205" y2="14" stroke="#FFFFFF" strokeOpacity="0.35" strokeDasharray="4 4" />
          <line x1="14" y1="45" x2="205" y2="44" stroke="#FFFFFF" strokeOpacity="0.35" strokeDasharray="4 4" />
        </svg>
      );

    case 'washi-grid':
      return (
        <svg viewBox="0 0 220 60" className="w-full h-full drop-shadow-xs">
          <defs>
            <pattern id="washiGrid" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.55" />
            </pattern>
          </defs>
          <path
            d="M5,7 L215,7 L211,20 L216,33 L210,45 L214,54 L6,54 L10,41 L4,28 L11,16 Z"
            fill={color}
            fillOpacity="0.82"
          />
          <path
            d="M5,7 L215,7 L211,20 L216,33 L210,45 L214,54 L6,54 L10,41 L4,28 L11,16 Z"
            fill="url(#washiGrid)"
          />
        </svg>
      );

    // ==================== FRAMES, CLIPS & SEALS ====================
    case 'paper-clip-gold':
      return (
        <svg viewBox="0 0 80 160" className="w-full h-full drop-shadow">
          <path
            d="M28,45 L28,125 C28,142 54,142 54,125 L54,28 C54,10 20,10 20,28 L20,112 C20,124 38,124 38,112 L38,50"
            fill="none"
            stroke={color}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'vintage-wooden-pin':
      return (
        <svg viewBox="0 0 70 160" className="w-full h-full drop-shadow-md">
          <rect x="20" y="8" width="14" height="142" rx="4" fill={color} />
          <rect x="36" y="8" width="14" height="142" rx="4" fill={color} filter="brightness(0.92)" />
          <rect x="18" y="64" width="34" height="14" rx="2" fill="#C5A059" />
          <circle cx="35" cy="71" r="4" fill="#543D2E" />
        </svg>
      );

    case 'photo-corners':
      return (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <polygon points="6,6 46,6 6,46" fill={color} opacity="0.88" />
          <polygon points="114,6 74,6 114,46" fill={color} opacity="0.88" />
          <polygon points="6,114 46,114 6,74" fill={color} opacity="0.88" />
          <polygon points="114,114 74,114 114,74" fill={color} opacity="0.88" />
        </svg>
      );

    case 'wax-seal':
      return (
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md">
          <path
            d="M60,8 C75,6 85,14 96,22 C108,32 114,45 111,60 C114,76 105,90 94,100 C82,110 72,113 60,111 C45,114 32,107 22,96 C11,85 7,73 9,60 C6,44 13,30 25,20 C36,11 47,9 60,8 Z"
            fill={color}
          />
          <circle cx="60" cy="60" r="36" fill="none" stroke="#F8F5F0" strokeOpacity="0.45" strokeWidth="2.5" />
          <path
            d="M60,36 C65,48 74,52 60,78 C46,52 55,48 60,36 Z"
            fill="none"
            stroke="#F8F5F0"
            strokeOpacity="0.7"
            strokeWidth="2"
          />
          <path d="M48,58 Q60,50 72,58" fill="none" stroke="#F8F5F0" strokeOpacity="0.7" strokeWidth="2" />
        </svg>
      );

    case 'polaroid-frame-overlay':
      return (
        <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-md">
          <rect x="6" y="6" width="188" height="228" rx="4" fill="#FFFFFF" stroke="#E3D7C8" strokeWidth="2" />
          <rect x="18" y="18" width="164" height="164" fill="none" stroke="#D5C5B5" strokeWidth="1.5" strokeDasharray="4 4" />
          <text
            x="100"
            y="212"
            textAnchor="middle"
            fill="#39332F"
            fontFamily="Caveat, cursive"
            fontSize="22"
          >
            {label || 'Sweet Memory'}
          </text>
        </svg>
      );

    case 'baroque-oval-frame':
      return (
        <svg viewBox="0 0 180 230" className="w-full h-full drop-shadow-sm">
          <ellipse cx="90" cy="115" rx="74" ry="94" fill="none" stroke={color} strokeWidth="6" />
          <ellipse cx="90" cy="115" rx="66" ry="86" fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="5 3" />
          {/* Top Crown Ornament */}
          <path d="M62,22 Q90,2 118,22 Q90,14 62,22 Z" fill={color} />
          <circle cx="90" cy="12" r="5" fill={color} />
          <path d="M62,208 Q90,228 118,208 Q90,216 62,208 Z" fill={color} />
        </svg>
      );

    // ==================== STAMPS & POSTMARKS ====================
    case 'stamp-postmark':
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full">
          <circle cx="65" cy="65" r="52" fill="none" stroke={color} strokeWidth="3" strokeDasharray="6 3" />
          <circle cx="65" cy="65" r="42" fill="none" stroke={color} strokeWidth="1.8" />
          <text
            x="65"
            y="60"
            textAnchor="middle"
            fill={color}
            fontSize="11"
            fontWeight="bold"
            letterSpacing="1.5"
          >
            {label || 'MEMORIA • 2026'}
          </text>
          <text x="65" y="78" textAnchor="middle" fill={color} fontSize="9" letterSpacing="2">
            ARCHIVE STUDIO
          </text>
          <path d="M122,42 Q150,34 178,42 T232,42" fill="none" stroke={color} strokeWidth="2.5" />
          <path d="M122,58 Q150,50 178,58 T232,58" fill="none" stroke={color} strokeWidth="2.5" />
          <path d="M122,74 Q150,66 178,74 T232,74" fill="none" stroke={color} strokeWidth="2.5" />
          <path d="M122,90 Q150,82 178,90 T232,90" fill="none" stroke={color} strokeWidth="2.5" />
        </svg>
      );

    case 'stamp-graduation':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full">
          <circle cx="90" cy="90" r="76" fill="none" stroke={color} strokeWidth="3.5" />
          <circle cx="90" cy="90" r="68" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 4" />
          {/* Laurel Wreath */}
          <path d="M48,125 C32,95 42,58 72,44" fill="none" stroke={color} strokeWidth="2.5" />
          <path d="M132,125 C148,95 138,58 108,44" fill="none" stroke={color} strokeWidth="2.5" />
          {/* Mortarboard Cap */}
          <polygon points="90,52 124,66 90,80 56,66" fill={color} />
          <path d="M72,73 L72,88 C72,94 108,94 108,88 L108,73" fill="none" stroke={color} strokeWidth="2.5" />
          <text
            x="90"
            y="120"
            textAnchor="middle"
            fill={color}
            fontFamily="Cormorant Garamond, serif"
            fontSize="16"
            fontWeight="bold"
            letterSpacing="2"
          >
            {label || 'CLASS OF 2026'}
          </text>
        </svg>
      );

    case 'stamp-location':
      return (
        <svg viewBox="0 0 240 100" className="w-full h-full">
          <rect x="6" y="10" width="228" height="80" rx="6" fill="none" stroke={color} strokeWidth="3" />
          <rect
            x="12"
            y="16"
            width="216"
            height="68"
            rx="3"
            fill="none"
            stroke={color}
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <path
            d="M42,36 C34,36 28,42 28,50 C28,61 42,72 42,72 C42,72 56,61 56,50 C56,42 50,36 42,36 Z"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
          <circle cx="42" cy="49" r="4" fill={color} />
          <text
            x="135"
            y="56"
            textAnchor="middle"
            fill={color}
            fontSize="16"
            fontWeight="bold"
            letterSpacing="2.5"
          >
            {label || 'SPECIAL PLACE'}
          </text>
        </svg>
      );

    case 'stamp-airmail':
      return (
        <svg viewBox="0 0 150 180" className="w-full h-full drop-shadow-xs">
          <rect
            x="10"
            y="10"
            width="130"
            height="160"
            fill="#FAF6EE"
            stroke={color}
            strokeWidth="4"
            strokeDasharray="6 4"
          />
          <rect x="20" y="20" width="110" height="140" fill="none" stroke={color} strokeWidth="1.5" />
          <text x="75" y="45" textAnchor="middle" fill={color} fontSize="13" fontWeight="bold" letterSpacing="2">
            {label || 'PAR AVION'}
          </text>
          <path d="M40,95 L110,75 L85,115 L72,98 L40,95 Z" fill="none" stroke={color} strokeWidth="2.5" />
          <text x="75" y="145" textAnchor="middle" fill={color} fontSize="11" letterSpacing="1.5">
            FIRST CLASS
          </text>
        </svg>
      );

    // ==================== VINTAGE ILLUSTRATIONS ====================
    case 'illust-butterfly':
      return (
        <svg viewBox="0 0 160 140" className="w-full h-full drop-shadow-xs">
          {/* Upper Wings */}
          <path
            d="M78,68 C48,18 8,22 16,64 C22,90 54,84 78,74 Z"
            fill={color}
            fillOpacity="0.85"
            stroke="#39332F"
            strokeWidth="2"
          />
          <path
            d="M82,68 C112,18 152,22 144,64 C138,90 106,84 82,74 Z"
            fill={color}
            fillOpacity="0.85"
            stroke="#39332F"
            strokeWidth="2"
          />
          {/* Lower Wings */}
          <path
            d="M78,76 C48,84 26,118 48,128 C68,136 76,105 78,80 Z"
            fill={color}
            fillOpacity="0.68"
            stroke="#39332F"
            strokeWidth="2"
          />
          <path
            d="M82,76 C112,84 134,118 112,128 C92,136 84,105 82,80 Z"
            fill={color}
            fillOpacity="0.68"
            stroke="#39332F"
            strokeWidth="2"
          />
          {/* Wing Gold Details */}
          <circle cx="38" cy="54" r="5" fill="#FFF8E7" opacity="0.75" />
          <circle cx="122" cy="54" r="5" fill="#FFF8E7" opacity="0.75" />
          {/* Body & Antennae */}
          <ellipse cx="80" cy="76" rx="3.5" ry="26" fill="#39332F" />
          <path d="M78,50 Q66,30 56,32 M82,50 Q94,30 104,32" fill="none" stroke="#39332F" strokeWidth="1.8" />
        </svg>
      );

    case 'illust-grad-cap':
      return (
        <svg viewBox="0 0 180 150" className="w-full h-full drop-shadow-xs">
          {/* Mortarboard */}
          <polygon points="90,22 162,52 90,82 18,52" fill={color} stroke="#C5A059" strokeWidth="2" />
          <path d="M48,66 L48,98 C48,112 132,112 132,98 L132,66" fill={color} filter="brightness(1.15)" />
          {/* Gold Tassel */}
          <path d="M90,52 L142,68 L142,102" fill="none" stroke="#C5A059" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="90" cy="52" r="5" fill="#C5A059" />
          {/* Rolled Diploma Scroll with Ribbon */}
          <rect x="42" y="114" width="96" height="18" rx="9" fill="#FAF3E6" stroke="#B99B83" strokeWidth="2" />
          <rect x="84" y="113" width="12" height="20" rx="2" fill="#C25E56" />
        </svg>
      );

    case 'illust-feather-quill':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <path
            d="M28,136 C56,98 92,56 138,18 C142,48 118,86 76,108 C92,92 104,76 112,62 C88,82 64,98 48,112 Z"
            fill={color}
            fillOpacity="0.78"
          />
          <path d="M22,142 Q76,84 138,18" fill="none" stroke="#39332F" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'illust-camera':
      return (
        <svg viewBox="0 0 150 120" className="w-full h-full">
          <rect x="16" y="32" width="118" height="74" rx="10" fill="#FAF6F0" stroke={color} strokeWidth="3.5" />
          <path d="M48,32 L56,18 L94,18 L102,32" fill={color} />
          <circle cx="75" cy="69" r="24" fill={color} />
          <circle cx="75" cy="69" r="14" fill="#FAF6F0" />
          <circle cx="114" cy="48" r="5" fill="#C5A059" />
        </svg>
      );

    case 'illust-coffee':
      return (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <path d="M24,48 L84,48 L78,88 C76,98 32,98 30,88 Z" fill="#FAF6F0" stroke={color} strokeWidth="3.5" />
          <path d="M84,54 C100,54 100,78 80,78" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="16" y1="98" x2="92" y2="98" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M44,36 Q48,24 42,16" fill="none" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M62,36 Q66,24 60,16" fill="none" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'illust-envelope':
      return (
        <svg viewBox="0 0 140 100" className="w-full h-full drop-shadow-xs">
          <rect x="10" y="15" width="120" height="72" rx="6" fill="#FAF6F0" stroke={color} strokeWidth="3" />
          <path d="M12,18 L70,58 L128,18" fill="none" stroke={color} strokeWidth="3" />
          <circle cx="70" cy="54" r="11" fill="#A6443D" />
          <path
            d="M70,59 C65,54 62,49 66,46 C68,44 70,47 70,49 C70,47 72,44 74,46 C78,49 75,54 70,59 Z"
            fill="#FAF6F0"
          />
        </svg>
      );

    // ==================== HEARTS & STARS ====================
    case 'heart-botanical-wreath':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <path
            d="M70,116 C26,86 14,48 36,28 C52,14 68,28 70,42 C72,28 88,14 104,28 C126,48 114,86 70,116 Z"
            fill="none"
            stroke="#6E7F68"
            strokeWidth="2.5"
          />
          {[
            { x: 34, y: 34 },
            { x: 106, y: 34 },
            { x: 26, y: 68 },
            { x: 114, y: 68 },
            { x: 48, y: 98 },
            { x: 92, y: 98 },
          ].map((pt, idx) => (
            <g key={idx} transform={`translate(${pt.x}, ${pt.y})`}>
              <circle cx="0" cy="0" r="7" fill={color} stroke="#FFF" strokeWidth="1" />
              <circle cx="0" cy="0" r="2.5" fill="#E5B95C" />
            </g>
          ))}
        </svg>
      );

    case 'heart-wax-embossed':
    case 'heart-handdrawn':
    case 'heart-watercolor':
      return (
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
          <path
            d="M60,102 C22,76 12,42 32,24 C46,12 58,24 60,36 C62,24 74,12 88,24 C108,42 98,76 60,102 Z"
            fill={color}
          />
          <path
            d="M60,92 C30,70 22,44 38,30 C48,21 58,30 60,40 C62,30 72,21 82,30 C98,44 90,70 60,92 Z"
            fill="none"
            stroke="#FFF8F5"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        </svg>
      );

    case 'heart-duo':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full">
          <path
            d="M42,76 C20,58 14,38 25,26 C34,18 42,26 42,33 C43,25 53,18 61,26 C72,38 64,58 42,76 Z"
            fill={color}
          />
          <path
            d="M84,64 C70,52 66,38 73,30 C79,24 84,30 84,35 C85,29 92,24 98,30 C105,38 99,52 84,64 Z"
            fill={color}
            fillOpacity="0.65"
          />
        </svg>
      );

    case 'star-constellation':
    case 'star-sparkle':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full">
          <polyline
            points="24,84 58,42 102,64 138,24"
            fill="none"
            stroke={color}
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          {[
            { x: 24, y: 84, s: 0.7 },
            { x: 58, y: 42, s: 1.1 },
            { x: 102, y: 64, s: 0.85 },
            { x: 138, y: 24, s: 1.2 },
          ].map((st, idx) => (
            <path
              key={idx}
              d="M0,-14 Q2,-2 14,0 Q2,2 0,14 Q-2,2 -14,0 Q-2,-2 0,-14 Z"
              fill={color}
              transform={`translate(${st.x}, ${st.y}) scale(${st.s})`}
            />
          ))}
        </svg>
      );

    case 'star-celestial':
      return (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <path
            d="M68,20 C44,24 30,48 36,72 C42,96 68,106 90,94 C70,94 54,78 54,56 C54,38 60,26 68,20 Z"
            fill={color}
          />
          <path d="M84,26 Q86,38 98,40 Q86,42 84,54 Q82,42 70,40 Q82,38 84,26 Z" fill={color} />
        </svg>
      );

    // ==================== SHAPES & TAGS ====================
    case 'label-tag':
      return (
        <svg viewBox="0 0 240 90" className="w-full h-full drop-shadow-xs">
          <path d="M12,12 L198,12 L228,45 L198,78 L12,78 Z" fill={color} stroke="#FFF8F0" strokeWidth="1.5" />
          <circle cx="202" cy="45" r="7" fill="#F8F5F0" stroke="#8C6D53" strokeWidth="2" />
          <path d="M208,45 Q225,38 238,48" fill="none" stroke="#8C6D53" strokeWidth="2" />
          <text
            x="104"
            y="53"
            textAnchor="middle"
            fill="#39332F"
            fontFamily="Caveat, cursive"
            fontSize="26"
            fontWeight="bold"
          >
            {label || 'Little Moments'}
          </text>
        </svg>
      );

    case 'label-ribbon':
    default:
      return (
        <svg viewBox="0 0 260 80" className="w-full h-full drop-shadow-xs">
          <path d="M24,16 L236,16 L224,40 L236,64 L24,64 L36,40 Z" fill={color} />
          <rect
            x="38"
            y="22"
            width="184"
            height="36"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <text
            x="130"
            y="46"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="Cormorant Garamond, serif"
            fontSize="18"
            fontWeight="bold"
            letterSpacing="3"
          >
            {label || 'OUR STORY'}
          </text>
        </svg>
      );
  }
};

/**
 * Renders full-page decorative border overlays that scale cleanly with the page
 * and export crisply to PDF.
 */
export const renderPageBorderSvg = (
  borderStyle: PageBorderStyle | undefined,
  borderColor = '#C5A059'
): React.ReactNode => {
  if (!borderStyle || borderStyle === 'none') return null;

  switch (borderStyle) {
    case 'double-gold':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <rect
            x="24"
            y="24"
            width="952"
            height="952"
            fill="none"
            stroke={borderColor}
            strokeWidth="3.5"
          />
          <rect
            x="36"
            y="36"
            width="928"
            height="928"
            fill="none"
            stroke={borderColor}
            strokeWidth="1.2"
          />
          {/* Corner Square Flourishes */}
          <rect x="18" y="18" width="18" height="18" fill="none" stroke={borderColor} strokeWidth="2.5" />
          <rect x="964" y="18" width="18" height="18" fill="none" stroke={borderColor} strokeWidth="2.5" />
          <rect x="18" y="964" width="18" height="18" fill="none" stroke={borderColor} strokeWidth="2.5" />
          <rect x="964" y="964" width="18" height="18" fill="none" stroke={borderColor} strokeWidth="2.5" />
        </svg>
      );

    case 'botanical-corners':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <rect
            x="32"
            y="32"
            width="936"
            height="936"
            fill="none"
            stroke={borderColor}
            strokeOpacity="0.6"
            strokeWidth="2"
          />
          {/* Top-Left Botanical Vines & Blossoms */}
          <g fill={borderColor}>
            <path d="M32,160 C32,75 75,32 160,32" fill="none" stroke={borderColor} strokeWidth="4" />
            <ellipse cx="64" cy="96" rx="18" ry="8" transform="rotate(-40 64 96)" />
            <ellipse cx="96" cy="64" rx="18" ry="8" transform="rotate(-50 96 64)" />
            <circle cx="52" cy="52" r="12" />
            <circle cx="52" cy="52" r="5" fill="#FFFDF9" />
          </g>
          {/* Top-Right */}
          <g fill={borderColor} transform="translate(1000, 0) scale(-1, 1)">
            <path d="M32,160 C32,75 75,32 160,32" fill="none" stroke={borderColor} strokeWidth="4" />
            <ellipse cx="64" cy="96" rx="18" ry="8" transform="rotate(-40 64 96)" />
            <ellipse cx="96" cy="64" rx="18" ry="8" transform="rotate(-50 96 64)" />
            <circle cx="52" cy="52" r="12" />
            <circle cx="52" cy="52" r="5" fill="#FFFDF9" />
          </g>
          {/* Bottom-Left */}
          <g fill={borderColor} transform="translate(0, 1000) scale(1, -1)">
            <path d="M32,160 C32,75 75,32 160,32" fill="none" stroke={borderColor} strokeWidth="4" />
            <ellipse cx="64" cy="96" rx="18" ry="8" transform="rotate(-40 64 96)" />
            <ellipse cx="96" cy="64" rx="18" ry="8" transform="rotate(-50 96 64)" />
            <circle cx="52" cy="52" r="12" />
            <circle cx="52" cy="52" r="5" fill="#FFFDF9" />
          </g>
          {/* Bottom-Right */}
          <g fill={borderColor} transform="translate(1000, 1000) scale(-1, -1)">
            <path d="M32,160 C32,75 75,32 160,32" fill="none" stroke={borderColor} strokeWidth="4" />
            <ellipse cx="64" cy="96" rx="18" ry="8" transform="rotate(-40 64 96)" />
            <ellipse cx="96" cy="64" rx="18" ry="8" transform="rotate(-50 96 64)" />
            <circle cx="52" cy="52" r="12" />
            <circle cx="52" cy="52" r="5" fill="#FFFDF9" />
          </g>
        </svg>
      );

    case 'vintage-filigree':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <rect
            x="28"
            y="28"
            width="944"
            height="944"
            fill="none"
            stroke={borderColor}
            strokeWidth="2.5"
          />
          <rect
            x="42"
            y="42"
            width="916"
            height="916"
            fill="none"
            stroke={borderColor}
            strokeWidth="1.2"
            strokeDasharray="8 4"
          />
          {/* Royal Filigree Corner Scrolls */}
          {[
            'translate(28, 28)',
            'translate(972, 28) scale(-1, 1)',
            'translate(28, 972) scale(1, -1)',
            'translate(972, 972) scale(-1, -1)',
          ].map((tr, idx) => (
            <g key={idx} transform={tr} fill="none" stroke={borderColor} strokeWidth="3.5">
              <path d="M0,90 C28,90 48,68 48,42 C48,22 32,14 22,24 C12,34 24,52 42,48 C68,48 90,28 90,0" />
              <circle cx="16" cy="16" r="5" fill={borderColor} />
            </g>
          ))}
        </svg>
      );

    case 'minimal-editorial':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <rect
            x="38"
            y="38"
            width="924"
            height="924"
            fill="none"
            stroke={borderColor}
            strokeWidth="1.8"
          />
          <line x1="20" y1="38" x2="980" y2="38" stroke={borderColor} strokeWidth="1" />
          <line x1="20" y1="962" x2="980" y2="962" stroke={borderColor} strokeWidth="1" />
          <line x1="38" y1="20" x2="38" y2="980" stroke={borderColor} strokeWidth="1" />
          <line x1="962" y1="20" x2="962" y2="980" stroke={borderColor} strokeWidth="1" />
        </svg>
      );

    case 'romantic-arch':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <path
            d="M36,964 L36,220 C36,68 964,68 964,220 L964,964 Z"
            fill="none"
            stroke={borderColor}
            strokeWidth="3"
          />
          <path
            d="M48,952 L48,224 C48,84 952,84 952,224 L952,952 Z"
            fill="none"
            stroke={borderColor}
            strokeWidth="1.2"
          />
        </svg>
      );

    case 'postCard-frame':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <rect
            x="22"
            y="22"
            width="956"
            height="956"
            fill="none"
            stroke={borderColor}
            strokeWidth="10"
            strokeDasharray="24 18"
          />
          <rect
            x="38"
            y="38"
            width="924"
            height="924"
            fill="none"
            stroke={borderColor}
            strokeWidth="2"
          />
        </svg>
      );

    case 'dotted-stitch':
      return (
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        >
          <rect
            x="28"
            y="28"
            width="944"
            height="944"
            rx="18"
            fill="none"
            stroke={borderColor}
            strokeWidth="3"
            strokeDasharray="10 8"
          />
        </svg>
      );

    default:
      return null;
  }
};
