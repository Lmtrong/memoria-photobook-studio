import { useEffect, useRef, useState } from 'react';
import { StoredPhoto } from '../types';

export function usePhotoUrls(photos: StoredPhoto[] | undefined): Record<string, string> {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!photos || photos.length === 0) {
      // Revoke all cached URLs when photos become empty
      cacheRef.current.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      cacheRef.current.clear();
      setUrlMap({});
      return;
    }

    const currentIds = new Set<string>();
    let changed = false;

    for (const p of photos) {
      currentIds.add(p.id);
      if (!cacheRef.current.has(p.id)) {
        if (p.originalBlob && p.originalBlob.size > 0) {
          // Fast O(1) browser memory pointer — zero base64 string copying overhead during React renders
          const blobUrl = URL.createObjectURL(p.originalBlob);
          cacheRef.current.set(p.id, blobUrl);
          changed = true;
        } else if (p.thumbnailDataUrl) {
          cacheRef.current.set(p.id, p.thumbnailDataUrl);
          changed = true;
        }
      }
    }

    // Cleanup removed photos
    for (const [id, url] of cacheRef.current.entries()) {
      if (!currentIds.has(id)) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        cacheRef.current.delete(id);
        changed = true;
      }
    }

    if (changed || Object.keys(urlMap).length !== cacheRef.current.size) {
      const nextMap: Record<string, string> = {};
      cacheRef.current.forEach((url, id) => {
        nextMap[id] = url;
      });
      setUrlMap(nextMap);
    }
  }, [photos]);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      cache.clear();
    };
  }, []);

  return urlMap;
}
