import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectOptions } from '@/lib/project-options.ts';

type ProjectSelectFieldProps = {
  value: string;
  onChange: (projectId: string) => void;
  excludeProjectIds: string[];
};

export function ProjectSelectField({
  value,
  onChange,
  excludeProjectIds,
}: ProjectSelectFieldProps) {
  const projects = useProjectOptions();
  const choices = (projects.data?.items ?? []).filter(
    (project) => !excludeProjectIds.includes(project.id),
  );

  const placeholder = projects.isPending ? 'Loading projects…' : 'Pick a project';

  return (
    <div className="space-y-2">
      <Label htmlFor="membership-project">Project</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="membership-project" className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {`${project.code} · ${project.name}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
