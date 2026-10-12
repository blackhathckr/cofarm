import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LoadMore } from '@/components/LoadMore';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateProjectDialog } from '../components/CreateProjectDialog';
import { useProjects } from '../hooks/use-projects.ts';

const STATUS_TONE: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  planned: 'secondary',
  harvested: 'outline',
  closed: 'outline',
};

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const projects = useProjects({ search });
  const rows = projects.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Every record in the platform hangs off a project code.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search code, name or location"
            className="max-w-xs"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
          <CreateProjectDialog />
        </div>
      </div>

      {projects.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Variety</TableHead>
                <TableHead className="text-right">Acres</TableHead>
                <TableHead className="text-right">Partners</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: project.id }}
                      className="font-semibold text-clay-700 hover:underline"
                    >
                      {project.code}
                    </Link>
                  </TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">{project.location}</TableCell>
                  <TableCell className="text-muted-foreground">{project.variety}</TableCell>
                  <TableCell className="tabular text-right">{project.acreageAcres}</TableCell>
                  <TableCell className="tabular text-right">{project.partnerCount}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[project.status] ?? 'outline'}>
                      {project.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  title="No projects match that search"
                  detail="Clear the search box to see every project code."
                />
              ) : null}
            </TableBody>
          </Table>
          <LoadMore paging={projects} label="Load more projects" />
        </div>
      )}
    </div>
  );
}
