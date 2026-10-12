import { useState } from 'react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { UpdateComposeForm } from '../components/UpdateComposeForm';
import { useUpdateProject } from '../hooks/use-updates.ts';

type PostUpdatePageProps = {
  projectId: string;
};

export function PostUpdatePage({ projectId }: PostUpdatePageProps) {
  const project = useUpdateProject(projectId);
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-clay-600 uppercase">
          Post an update
        </p>
        {project.data === undefined ? (
          <Skeleton className="mt-2 h-8 w-64" />
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.data.code}</h1>
            <p className="text-sm text-muted-foreground">
              {`${project.data.name} · ${project.data.location}`}
            </p>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <UpdateComposeForm
          key={formKey}
          projectId={projectId}
          onSaved={(saved) => {
            toast.success(saved.status === 'published' ? 'Update published' : 'Draft saved');
            setFormKey(formKey + 1);
          }}
        />
      </div>
    </div>
  );
}
