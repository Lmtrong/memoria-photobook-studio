const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function isSupportedImageFile(file: File): boolean {
  if (SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
}

export async function processImageFile(file: File): Promise<{
  width: number;
  height: number;
  thumbnailDataUrl: string;
  originalBlob: Blob;
}> {
  // Read raw ArrayBuffer into an independent in-memory Blob so IndexedDB never loses the file reference
  const arrayBuffer = await file.arrayBuffer();
  const safeOriginalBlob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' });

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(safeOriginalBlob);
    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth || 800;
        const height = img.naturalHeight || 600;

        // Lightweight thumbnail (max 320px) for instant sidebar & thumbnail rendering
        const maxThumbDim = 320;
        let thumbW = width;
        let thumbH = height;
        if (width > height && width > maxThumbDim) {
          thumbW = maxThumbDim;
          thumbH = Math.round((height * maxThumbDim) / width);
        } else if (height >= width && height > maxThumbDim) {
          thumbH = maxThumbDim;
          thumbW = Math.round((width * maxThumbDim) / height);
        }

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const tCtx = thumbCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, 0, 0, thumbW, thumbH);
        }
        const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

        URL.revokeObjectURL(objectUrl);
        resolve({
          width,
          height,
          thumbnailDataUrl,
          originalBlob: safeOriginalBlob,
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

/**
 * Generates high-resolution artistic procedural photographs locally as Blobs
 * so the sample album "Little Moments" works offline with zero external network URLs.
 */
export async function generateSamplePhotoBlob(
  sceneIndex: number
): Promise<{ blob: Blob; thumbnailDataUrl: string; width: number; height: number; name: string }> {
  const width = 1200;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const scenes = [
    {
      name: 'Morning_Sunlight_Warmth.jpg',
      bg1: '#E8D8C8',
      bg2: '#C8A98E',
      accent: '#8C5E45',
      title: 'Golden Hour Window',
      subtitle: 'Autumn Morning • 08:15 AM',
    },
    {
      name: 'Coffee_And_Open_Journal.jpg',
      bg1: '#DFD3C3',
      bg2: '#B69B84',
      accent: '#543D2E',
      title: 'Quiet Coffee Ritual',
      subtitle: 'Handwritten Pages & Espresso',
    },
    {
      name: 'Autumn_Botanical_Walk.jpg',
      bg1: '#D5DDD3',
      bg2: '#94A894',
      accent: '#3B4D43',
      title: 'Forest Path & Dried Leaves',
      subtitle: 'Peaceful Afternoon Stroll',
    },
    {
      name: 'Coastal_Horizon_Dusk.jpg',
      bg1: '#E6D2C9',
      bg2: '#B88D82',
      accent: '#694340',
      title: 'By The Quiet Sea',
      subtitle: 'Soft Waves at Sunset',
    },
    {
      name: 'Artisan_Ceramics_Table.jpg',
      bg1: '#EFE9DF',
      bg2: '#D0C2B0',
      accent: '#7D634F',
      title: 'Ceramics & Linen',
      subtitle: 'Simple Tactile Beauty',
    },
    {
      name: 'Mountain_Mist_Retreat.jpg',
      bg1: '#D8DEE3',
      bg2: '#9BAAB8',
      accent: '#394858',
      title: 'Misty Highlands',
      subtitle: 'Breathe in the Quiet Air',
    },
    {
      name: 'Dried_Wildflowers_Vase.jpg',
      bg1: '#F3E5DE',
      bg2: '#D6A29C',
      accent: '#8A5D59',
      title: 'Wildflower Bouquet',
      subtitle: 'Collected from the Meadow',
    },
    {
      name: 'Evening_Candlelight_Dinner.jpg',
      bg1: '#D6C2AE',
      bg2: '#9C7560',
      accent: '#3E2D23',
      title: 'Warm Candlelight',
      subtitle: 'Laughter Around the Table',
    },
    {
      name: 'Old_Town_Architecture.jpg',
      bg1: '#E5D5C0',
      bg2: '#B89A78',
      accent: '#634832',
      title: 'Sunlit Cobblestone Street',
      subtitle: 'Wandering Without Rush',
    },
    {
      name: 'Sunday_Reading_Corner.jpg',
      bg1: '#EAE2D7',
      bg2: '#C4B39F',
      accent: '#5C4B3E',
      title: 'Sunday Reading Nook',
      subtitle: 'Linen Curtains & Poetry',
    },
  ];

  const scene = scenes[sceneIndex % scenes.length];

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, scene.bg1);
  grad.addColorStop(1, scene.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = 'rgba(255, 252, 245, 0.32)';
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.3, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = scene.accent;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(width * 0.32, height * 0.75, 340, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.68);
  ctx.quadraticCurveTo(width * 0.35, height * 0.52, width * 0.7, height * 0.66);
  ctx.quadraticCurveTo(width * 0.88, height * 0.74, width, height * 0.6);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  ctx.globalAlpha = 0.82;
  ctx.fillStyle = scene.accent;
  ctx.font = 'italic 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(scene.title, width / 2, height * 0.46);

  ctx.font = '24px sans-serif';
  ctx.globalAlpha = 0.65;
  ctx.fillText(scene.subtitle, width / 2, height * 0.53);
  ctx.restore();

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 320;
  thumbCanvas.height = 240;
  const tCtx = thumbCanvas.getContext('2d')!;
  tCtx.drawImage(canvas, 0, 0, 320, 240);
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.9);
  });

  return {
    blob,
    thumbnailDataUrl,
    width,
    height,
    name: scene.name,
  };
}
