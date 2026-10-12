import type { UpdateFeedItem } from '@cofarm/contracts/updates';

import { usePhotoUrls } from '../hooks/use-photo-urls.ts';
import { PhotoCarousel } from './PhotoCarousel';

type ProjectCarouselProps = {
  updates: readonly UpdateFeedItem[];
  cycleNo: number | null;
};

const CAROUSEL_PHOTO_LIMIT = 4;

/** The newest field photographs, captioned with the update they came from. */
export function ProjectCarousel({ updates, cycleNo }: ProjectCarouselProps) {
  const newest = updates
    .flatMap((update) => update.photoDocumentIds.map((id) => ({ id, title: update.title })))
    .slice(0, CAROUSEL_PHOTO_LIMIT);

  const gallery = usePhotoUrls(
    newest.map((photo) => photo.id),
    newest.length > 0,
  );

  if (gallery.photos.length === 0) return null;

  return (
    <PhotoCarousel
      photos={gallery.photos.map((photo, index) => {
        const title = newest[index]?.title;
        return title === undefined ? photo : { ...photo, caption: title };
      })}
      badge={cycleNo === null ? null : `Active · Cycle ${String(cycleNo)}`}
    />
  );
}
