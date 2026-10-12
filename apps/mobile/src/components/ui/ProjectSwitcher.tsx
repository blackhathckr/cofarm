import { Chip } from 'heroui-native';
import { ScrollView } from 'react-native';

export type SwitcherProject = {
  id: string;
  code: string;
  name: string;
  /** Rendered next to the code when it is above zero. */
  badge?: number;
};

type ProjectSwitcherProps = {
  projects: readonly SwitcherProject[];
  selectedId: string;
  onSelect: (projectId: string) => void;
};

export function ProjectSwitcher({ projects, selectedId, onSelect }: ProjectSwitcherProps) {
  if (projects.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2 py-1"
    >
      {projects.map((project) => (
        <Chip
          key={project.id}
          size="sm"
          variant={project.id === selectedId ? 'primary' : 'secondary'}
          accessibilityLabel={
            project.badge === undefined || project.badge === 0
              ? project.name
              : `${project.name}, ${String(project.badge)} unread`
          }
          onPress={() => {
            onSelect(project.id);
          }}
        >
          {project.badge === undefined || project.badge === 0
            ? project.code
            : `${project.code} · ${String(project.badge)}`}
        </Chip>
      ))}
    </ScrollView>
  );
}
