import { MAX_UPDATE_PHOTOS } from '@cofarm/contracts/updates';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DocumentImage } from '@/components/DocumentImage';
import { ImageViewerDialog } from '@/components/ImageViewerDialog';
import { useDocumentUpload } from '@/lib/document-upload.ts';
import { acceptAttribute, checkUpload, IMAGE_MIMES } from '@/lib/upload-limits.ts';

type UpdatePhotoPickerProps = {
  projectId: string;
  documentIds: string[];
  onChange: (documentIds: string[]) => void;
  disabled?: boolean;
};

export function UpdatePhotoPicker({
  projectId,
  documentIds,
  onChange,
  disabled,
}: UpdatePhotoPickerProps) {
  const picker = useRef<HTMLInputElement>(null);
  const upload = useDocumentUpload();
  const [rejections, setRejections] = useState<string[]>([]);
  const [viewedId, setViewedId] = useState<string | null>(null);

  const room = MAX_UPDATE_PHOTOS - documentIds.length;

  const addFiles = async (files: File[]): Promise<void> => {
    const refused: string[] = [];
    const accepted: File[] = [];

    for (const file of files.slice(0, room)) {
      const checked = checkUpload(file, IMAGE_MIMES);
      if ('rejection' in checked) refused.push(checked.rejection);
      else accepted.push(file);
    }
    if (files.length > room) {
      refused.push(`Only ${MAX_UPDATE_PHOTOS.toString()} photos fit on one update.`);
    }
    setRejections(refused);

    const added: string[] = [];
    for (const file of accepted) {
      const stored = await upload.mutateAsync({
        projectId,
        type: 'update_photo',
        file,
        allowed: IMAGE_MIMES,
      });
      added.push(stored.id);
    }
    if (added.length > 0) onChange([...documentIds, ...added]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {documentIds.map((documentId, index) => (
          <div key={documentId} className="relative size-24 overflow-hidden rounded-md border">
            <button
              type="button"
              className="block size-24 cursor-zoom-in"
              aria-label={`View photo ${(index + 1).toString()}`}
              onClick={() => {
                setViewedId(documentId);
              }}
            >
              <DocumentImage
                documentId={documentId}
                alt={`Photo ${(index + 1).toString()}`}
                className="size-24"
              />
            </button>
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label="Remove photo"
              className="absolute top-1 right-1"
              onClick={() => {
                onChange(documentIds.filter((id) => id !== documentId));
              }}
            >
              <X />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          disabled={disabled === true || upload.isPending || room <= 0}
          className="size-24 flex-col gap-1 text-xs"
          onClick={() => {
            picker.current?.click();
          }}
        >
          <ImagePlus />
          {upload.isPending ? 'Uploading…' : 'Add photos'}
        </Button>
      </div>

      <input
        ref={picker}
        type="file"
        multiple
        hidden
        accept={acceptAttribute(IMAGE_MIMES)}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          void addFiles(files);
        }}
      />

      <p className="text-xs text-muted-foreground">
        {`${documentIds.length.toString()} of ${MAX_UPDATE_PHOTOS.toString()} photos. JPEG, PNG, WebP or HEIC up to 25 MiB each.`}
      </p>

      <ImageViewerDialog
        documentIds={documentIds}
        openDocumentId={viewedId}
        label="Update photo"
        onClose={() => {
          setViewedId(null);
        }}
      />

      {upload.error === null ? null : (
        <p role="alert" className="text-xs text-destructive">
          {upload.error.message}
        </p>
      )}
      {rejections.map((rejection) => (
        <p key={rejection} role="alert" className="text-xs text-destructive">
          {rejection}
        </p>
      ))}
    </div>
  );
}
