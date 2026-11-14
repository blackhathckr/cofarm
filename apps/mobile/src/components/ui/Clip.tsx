import { useVideoPlayer, VideoView } from 'expo-video';
import { withUniwind } from 'uniwind';

/** Wrapped so className applies; a bare VideoView ignores it and renders at zero size. */
const StyledVideoView = withUniwind(VideoView);

type ClipProps = {
  url: string;
  className: string;
};

/** Plays one clip with the platform's own controls. Remount per URL to swap clips. */
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
