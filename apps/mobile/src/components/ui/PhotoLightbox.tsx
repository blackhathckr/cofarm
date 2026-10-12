import { Dialog, Spinner, useThemeColor } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { Photo as PhotoImage } from './Photo';
import type { Photo } from './PhotoGrid';

type PhotoLightboxProps = {
  photo: Photo | null;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (by: number) => void;
};

type LoadState = 'loading' | 'shown' | 'failed';

export function PhotoLightbox({ photo, position, total, onClose, onStep }: PhotoLightboxProps) {
  const onAccent = useThemeColor('accent-foreground');
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<LoadState>('loading');

  const url = photo?.url ?? '';
  useEffect(() => {
    setState(url === '' ? 'failed' : 'loading');
  }, [url]);

  return (
    <Dialog
      isOpen={photo !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal className="p-0">
        <Dialog.Overlay />
        <Dialog.Content
          isSwipeable={false}
          className="h-full w-full justify-between rounded-none bg-transparent p-0 shadow-none"
        >
          <View className="flex-row justify-end p-4" style={{ paddingTop: insets.top + 8 }}>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
            >
              <Icon name="close" color={onAccent} size={18} />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center">
            {url === '' ? null : (
              <PhotoImage
                source={{ uri: url }}
                className="h-full w-full"
                contentFit="contain"
                onLoad={() => {
                  setState('shown');
                }}
                onError={() => {
                  setState('failed');
                }}
              />
            )}

            {state === 'loading' ? (
              <View className="absolute">
                <Spinner />
              </View>
            ) : null}

            {state === 'failed' ? (
              <Text className="absolute px-8 text-center text-sm text-white">
                This photograph could not be loaded. Close and pull down to try again.
              </Text>
            ) : null}
          </View>

          <View
            className="flex-row items-center justify-between gap-4 px-6 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel="Previous photograph"
              accessibilityState={{ disabled: total < 2 }}
              disabled={total < 2}
              onPress={() => {
                onStep(-1);
              }}
            >
              <Icon name="chevronLeft" color={onAccent} size={20} />
            </Pressable>

            <View className="flex-1 items-center gap-1">
              {photo?.caption === undefined ? null : (
                <Text className="text-center text-sm text-white">{photo.caption}</Text>
              )}
              <Text className="text-xs font-bold text-white/70">
                {`${String(position)} / ${String(total)}`}
              </Text>
            </View>

            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel="Next photograph"
              accessibilityState={{ disabled: total < 2 }}
              disabled={total < 2}
              onPress={() => {
                onStep(1);
              }}
            >
              <Icon name="chevronRight" color={onAccent} size={20} />
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
