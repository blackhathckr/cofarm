import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Photo as PhotoImage } from './Photo';

import { PhotoLightbox } from './PhotoLightbox';

export type Photo = {
  id: string;
  url: string;
  caption?: string;
};

type PhotoGridProps = {
  photos: readonly Photo[];
  columns?: number;
};

const DEFAULT_COLUMNS = 3;

type PhotoRow = {
  start: number;
  photos: readonly Photo[];
};

function inRowsOf(photos: readonly Photo[], columns: number): PhotoRow[] {
  const rows: PhotoRow[] = [];
  for (let start = 0; start < photos.length; start += columns) {
    rows.push({ start, photos: photos.slice(start, start + columns) });
  }
  return rows;
}

/**
 * Photo URLs are short-lived signed links, so a grid holds whatever the caller
 * fetched and does not cache them beyond the screen.
 */
export function PhotoGrid({ photos, columns = DEFAULT_COLUMNS }: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : (photos[openIndex] ?? null);

  // Too few photos to fill a row and they share the full width; past that the
  // short last row is padded so its cells line up with the rows above.
  const isPadded = photos.length > columns;

  return (
    <View className="gap-2">
      {inRowsOf(photos, columns).map((row) => (
        <View key={row.start} className="flex-row gap-2">
          {row.photos.map((photo, offset) => (
            <Pressable
              key={photo.id}
              className="aspect-square flex-1 overflow-hidden rounded-2xl bg-surface-secondary"
              accessibilityRole="imagebutton"
              accessibilityLabel={photo.caption ?? 'Farm photograph'}
              onPress={() => {
                setOpenIndex(row.start + offset);
              }}
            >
              <PhotoImage
                source={{ uri: photo.url }}
                className="h-full w-full"
                contentFit="cover"
              />
            </Pressable>
          ))}

          {Array.from({ length: isPadded ? columns - row.photos.length : 0 }, (_, slot) => (
            <View key={`pad-${String(slot)}`} className="flex-1" />
          ))}
        </View>
      ))}

      <PhotoLightbox
        photo={open}
        position={(openIndex ?? 0) + 1}
        total={photos.length}
        onClose={() => {
          setOpenIndex(null);
        }}
        onStep={(by) => {
          setOpenIndex((current) =>
            current === null || photos.length === 0
              ? current
              : (current + by + photos.length) % photos.length,
          );
        }}
      />
    </View>
  );
}
