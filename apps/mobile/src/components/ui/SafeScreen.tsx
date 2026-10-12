import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

/**
 * Uniwind only applies className to components it wraps, so a bare
 * SafeAreaView silently ignores flex-1 and collapses to nothing.
 */
export const SafeScreen = withUniwind(SafeAreaView);
