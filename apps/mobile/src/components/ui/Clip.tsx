import { useVideoPlayer, VideoView } from 'expo-video';
import { withUniwind } from 'uniwind';

const StyledVideoView = withUniwind(VideoView);

type ClipProps = {
  url: string;
  className: string;
};

export function Clip({ url, className }: ClipProps) {
  const player = useVideoPlayer(url, (created) => {
    created.play();
  });

  return (
    <StyledVideoView
      player={player}
      className={className}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
    />
  );
}
