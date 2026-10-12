import type { Project } from '@cofarm/contracts/projects';
import { Chip } from 'heroui-native';
import { Text, View } from 'react-native';

type ProjectHeaderProps = {
  project: Project;
};

const STATUS_LABELS: Record<Project['status'], string> = {
  planned: 'Planned',
  active: 'Active',
  harvested: 'Harvested',
  closed: 'Closed',
};

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const cycle = project.currentCycle;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-3xl font-extrabold text-foreground">{project.code}</Text>
        <Chip size="sm" color={project.status === 'active' ? 'success' : 'default'}>
          {cycle === null
            ? STATUS_LABELS[project.status]
            : `${STATUS_LABELS[project.status]} · Cycle ${String(cycle.cycleNo)}`}
        </Chip>
      </View>
      <Text className="text-base font-bold text-foreground">{project.location}</Text>
      <Text className="text-sm text-muted">
        {`${project.acreageAcres} acres · ${project.variety} · ${String(project.partnerCount)} partners`}
      </Text>
    </View>
  );
}
