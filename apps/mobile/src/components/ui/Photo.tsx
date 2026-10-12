import { Image } from 'expo-image';
import { withUniwind } from 'uniwind';

/**
 * Uniwind only applies className to components it wraps, so a bare expo-image
 * silently ignores its size classes and renders at zero height.
 */
export const Photo = withUniwind(Image);
