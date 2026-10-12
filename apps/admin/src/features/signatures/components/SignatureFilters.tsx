import { signatureStatusSchema, type SignatureStatus } from '@cofarm/contracts/signatures';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectOptions } from '@/lib/project-options.ts';

export const ALL_PROJECTS = 'all-projects';
export const ALL_STATUSES = 'all-statuses';

const STATUSES = signatureStatusSchema.options;

type SignatureFiltersProps = {
  projectId: string | null;
  status: SignatureStatus | null;
  onProjectChange: (projectId: string | null) => void;
  onStatusChange: (status: SignatureStatus | null) => void;
};

export function SignatureFilters({
  projectId,
  status,
  onProjectChange,
  onStatusChange,
}: SignatureFiltersProps) {
  const projects = useProjectOptions();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Project</Label>
        <Select
          value={projectId ?? ALL_PROJECTS}
          onValueChange={(next) => {
            onProjectChange(next === ALL_PROJECTS ? null : next);
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
            {(projects.data?.items ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {`${project.code} · ${project.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={status ?? ALL_STATUSES}
          onValueChange={(next) => {
            const chosen = signatureStatusSchema.safeParse(next);
            onStatusChange(chosen.success ? chosen.data : null);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
