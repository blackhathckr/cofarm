import { Text, View } from 'react-native';

import { Loading } from '@/components/ui/Loading';
import { PhotoGrid } from '@/components/ui/PhotoGrid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePhotoUrls } from '../hooks/use-photo-urls.ts';

type PhotoGalleryProps = {
  documentIds: readonly string[];
  isSingleUpdate: boolean;
};

export function PhotoGallery({ documentIds, isSingleUpdate }: PhotoGalleryProps) {
  const gallery = usePhotoUrls(documentIds, documentIds.length > 0);

  return (
    <View className="gap-3">
      <SectionHeader
        title={isSingleUpdate ? 'Photos from this update' : 'Photo gallery'}
        {...(isSingleUpdate && documentIds.length > 0
          ? { action: 'Tap the update again for all' }
          : {})}
      />

      {documentIds.length === 0 ? (
        <View className="rounded-3xl bg-surface-secondary px-6 py-8">
          <Text className="text-center text-sm text-muted">
            {isSingleUpdate
              ? 'This update has no photographs.'
              : 'Field photographs appear here as soon as the team uploads them.'}
          </Text>
        </View>
      ) : null}

      {gallery.isPending ? <Loading /> : null}

      <PhotoGrid photos={gallery.photos} />

      {gallery.unresolvedCount > 0 ? (
        <Text className="text-xs text-muted">
          {`${String(gallery.unresolvedCount)} photographs could not be loaded. Pull down to try again.`}
        </Text>
      ) : null}
    </View>
  );
}
