import { useVideoPlayer, type VideoThumbnail } from 'expo-video';
import { useThemeColor } from 'heroui-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Icon } from './Icon';
import { Photo as PhotoImage } from './Photo';

type VideoTileProps = {
  url: string;
};

export function VideoTile({ url }: VideoTileProps) {
  const player = useVideoPlayer(url);
  const playMark = useThemeColor('accent-foreground');
  const [frame, setFrame] = useState<VideoThumbnail | null>(null);

  useEffect(() => {
    let isMounted = true;
    player
      .generateThumbnailsAsync(1)
      .then(([thumbnail]) => {
        if (isMounted && thumbnail !== undefined) setFrame(thumbnail);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [player]);

  return (
    <View className="h-full w-full items-center justify-center bg-sand-800">
      {frame === null ? null : (
        <PhotoImage source={frame} className="absolute inset-0" contentFit="cover" />
      )}
      <View className="h-12 w-12 items-center justify-center rounded-full bg-black/50">
        <Icon name="play" color={playMark} size={22} />
      </View>
    </View>
  );
}
