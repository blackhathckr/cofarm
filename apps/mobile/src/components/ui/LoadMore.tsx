import { Button, Spinner } from 'heroui-native';

type LoadMoreProps = {
  hasMore: boolean;
  isLoading: boolean;
  label: string;
  onPress: () => void;
};

/** HeroUI's Button carries no pending state, so every paged list shares this. */
export function LoadMore({ hasMore, isLoading, label, onPress }: LoadMoreProps) {
  if (!hasMore) return null;

  return (
    <Button variant="tertiary" isDisabled={isLoading} onPress={onPress}>
      {isLoading ? <Spinner size="sm" /> : null}
      <Button.Label>{isLoading ? 'Loading…' : label}</Button.Label>
    </Button>
  );
}
