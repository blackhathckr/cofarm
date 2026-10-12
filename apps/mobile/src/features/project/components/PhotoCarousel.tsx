import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Photo as PhotoImage } from '@/components/ui/Photo';
import type { Photo } from '@/components/ui/PhotoGrid';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';

type PhotoCarouselProps = {
  photos: readonly Photo[];
  /** Shown over the image, e.g. "Active · Cycle 2". */
  badge: string | null;
};

const SLIDE_MS = 3600;

export function PhotoCarousel({ photos, badge }: PhotoCarouselProps) {
  const [slide, setSlide] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (photos.length < 2) return;

    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % photos.length);
    }, SLIDE_MS);
    return () => {
      clearInterval(timer);
    };
  }, [photos.length]);

  const shown = photos[Math.min(slide, photos.length - 1)];
  if (shown === undefined) return null;

  return (
    <View className="h-48 overflow-hidden rounded-3xl bg-surface-secondary">
      <Pressable
        className="h-full w-full"
        accessibilityRole="imagebutton"
        accessibilityLabel={shown.caption ?? 'Open photograph'}
        onPress={() => {
          setIsOpen(true);
        }}
      >
        <PhotoImage
          source={{ uri: shown.url }}
          className="h-full w-full"
          contentFit="cover"
          transition={600}
        />
      </Pressable>

      {badge === null ? null : (
        <View className="absolute top-3 left-3 rounded-full bg-sage-600 px-3 py-1.5">
          <Text className="text-xs font-bold text-white">{badge}</Text>
        </View>
      )}

      <View className="absolute inset-x-0 bottom-0 flex-row items-end justify-between gap-3 px-4 pt-8 pb-3">
        <Text className="flex-1 text-sm font-bold text-white" numberOfLines={2}>
          {shown.caption ?? ''}
        </Text>

        {photos.length < 2 ? null : (
          <View className="flex-row gap-1.5 pb-1">
            {photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                className={`h-2 w-2 rounded-full ${index === slide ? 'bg-white' : 'bg-white/40'}`}
                accessibilityRole="button"
                accessibilityLabel={`Photograph ${String(index + 1)}`}
                onPress={() => {
                  setSlide(index);
                }}
              />
            ))}
          </View>
        )}
      </View>

      <PhotoLightbox
        photo={isOpen ? shown : null}
        position={slide + 1}
        total={photos.length}
        onClose={() => {
          setIsOpen(false);
        }}
        onStep={(by) => {
          setSlide((current) => (current + by + photos.length) % photos.length);
        }}
      />
    </View>
  );
}
