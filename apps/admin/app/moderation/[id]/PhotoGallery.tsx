'use client';

/**
 * Photo gallery for listing review — next/image thumbnails + lightbox.
 *
 * Uses `unoptimized` images because photo URLs point at the Supabase storage
 * host, which varies per environment (local / VPS); this avoids an env-coupled
 * next/image remotePatterns allowlist while still using next/image semantics.
 */

import { useState } from 'react';
import Image from 'next/image';
import { Modal } from '@dyafa/ui';
import type { Locale } from '@dyafa/i18n';
import { M, tl } from '../../../lib/moderation-i18n';

export interface GalleryPhoto {
  id: string;
  url: string | null;
  isCover: boolean;
}

export function PhotoGallery({
  photos,
  title,
  locale,
}: {
  photos: GalleryPhoto[];
  title: string;
  locale: Locale;
}) {
  const [active, setActive] = useState<GalleryPhoto | null>(null);

  if (photos.length === 0) {
    return <p className="text-body-sm italic text-text-muted">{tl(M.noPhotos, locale)}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => photo.url && setActive(photo)}
            disabled={!photo.url}
            aria-label={tl(M.openPhoto, locale)}
            className="group relative aspect-[4/3] overflow-hidden rounded-md bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {photo.url ? (
              <Image
                src={photo.url}
                alt={title}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                unoptimized
                className="object-cover transition-transform duration-base group-hover:scale-105 motion-reduce:transform-none"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-caption text-text-muted">—</span>
            )}
            {photo.isCover && (
              <span className="absolute start-xs top-xs rounded-pill bg-primary/90 px-sm py-[2px] text-overline font-semibold text-text-on-primary">
                {tl(M.coverLabel, locale)}
              </span>
            )}
          </button>
        ))}
      </div>

      <Modal
        open={active != null}
        onOpenChange={(o) => !o && setActive(null)}
        title={title}
        size="lg"
        closeLabel={tl(M.closePhoto, locale)}
      >
        {active?.url && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-surface-sunken">
            <Image src={active.url} alt={title} fill sizes="80vw" unoptimized className="object-contain" />
          </div>
        )}
      </Modal>
    </>
  );
}
