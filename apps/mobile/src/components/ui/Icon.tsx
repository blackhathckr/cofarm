import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ColorValue } from 'react-native';

type Glyph =
  | { set: 'feather'; glyph: React.ComponentProps<typeof Feather>['name'] }
  | { set: 'material'; glyph: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };

/** Our names for the glyphs, so a screen never spells an icon set's name. */
const GLYPHS = {
  home: { set: 'feather', glyph: 'home' },
  leaf: { set: 'material', glyph: 'sprout' },
  file: { set: 'feather', glyph: 'file-text' },
  chart: { set: 'feather', glyph: 'trending-up' },
  chat: { set: 'feather', glyph: 'message-square' },
  bell: { set: 'feather', glyph: 'bell' },
  pin: { set: 'feather', glyph: 'map-pin' },
  download: { set: 'feather', glyph: 'download' },
  user: { set: 'feather', glyph: 'user' },
  send: { set: 'feather', glyph: 'send' },
  close: { set: 'feather', glyph: 'x' },
  chevronLeft: { set: 'feather', glyph: 'chevron-left' },
  chevronRight: { set: 'feather', glyph: 'chevron-right' },
  calendar: { set: 'feather', glyph: 'calendar' },
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
};

export function Icon({ name, size = 22, color }: IconProps) {
  const icon: Glyph = GLYPHS[name];

  if (icon.set === 'material') {
    return <MaterialCommunityIcons name={icon.glyph} size={size} color={color} />;
  }

  return <Feather name={icon.glyph} size={size} color={color} />;
}
