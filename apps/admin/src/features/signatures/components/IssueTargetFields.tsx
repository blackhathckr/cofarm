import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectOptions } from '@/lib/project-options.ts';
import { useProjectPartners } from '@/lib/project-partners.ts';

type IssueTargetFieldsProps = {
  projectId: string | null;
  userId: string | null;
  onProjectChange: (projectId: string) => void;
  onPartnerChange: (userId: string) => void;
};

export function IssueTargetFields({
  projectId,
  userId,
  onProjectChange,
  onPartnerChange,
}: IssueTargetFieldsProps) {
  const projects = useProjectOptions();
  const partners = useProjectPartners(projectId);

  return (
    <>
      <div className="space-y-2">
        <Label>Project</Label>
        <Select
          {...(projectId === null ? {} : { value: projectId })}
          onValueChange={onProjectChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a project" />
          </SelectTrigger>
          <SelectContent>
            {(projects.data?.items ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {`${project.code} · ${project.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Partner</Label>
        <Select
          {...(userId === null ? {} : { value: userId })}
          onValueChange={onPartnerChange}
          disabled={projectId === null || partners.isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={projectId === null ? 'Choose a project first' : 'Choose a partner'}
            />
          </SelectTrigger>
          <SelectContent>
            {(partners.data ?? [])
              .filter((partner) => partner.status === 'active')
              .map((partner) => (
                <SelectItem key={partner.partnerId} value={partner.partnerId}>
                  {partner.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
