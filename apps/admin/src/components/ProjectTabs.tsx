import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from 'cn';

type ProjectTabsProps = {
  projectId: string;
};

const TABS = [
  { suffix: '', label: 'Overview' },
  { suffix: '/updates', label: 'Updates' },
  { suffix: '/mis', label: 'MIS' },
  { suffix: '/expenses', label: 'Expenses' },
  { suffix: '/contributions', label: 'Contributions' },
  { suffix: '/harvest', label: 'Harvest' },
] as const;

/** Everything under a project code hangs off this strip. */
export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {TABS.map((tab) => {
        const target = `${base}${tab.suffix}`;
        const active = tab.suffix === '' ? pathname === base : pathname.startsWith(target);

        return (
          <Link
            key={tab.label}
            to={target}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-sand-100 text-foreground'
                : 'text-muted-foreground hover:bg-sand-50 hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
