import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleEditorDialog } from '../components/RoleEditorDialog';
import { RoleRowActions } from '../components/RoleRowActions';
import { useAdminUsers } from '../hooks/use-admin-users.ts';
import { useRoles } from '../hooks/use-roles.ts';

export function RolesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const roles = useRoles();
  const users = useAdminUsers({ status: 'active' });

  const accounts = users.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            A role is a set of permissions. Built-in roles are fixed; add your own alongside them.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
          }}
        >
          New role
        </Button>
      </div>

      {roles.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="text-right">Permissions</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(roles.data ?? []).map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {role.key}
                  </TableCell>
                  <TableCell className="tabular text-right">{role.permissions.length}</TableCell>
                  <TableCell className="tabular text-right">{role.userCount}</TableCell>
                  <TableCell>
                    <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                      {role.isSystem ? 'Built-in' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleRowActions
                      role={role}
                      holderNames={accounts
                        .filter((account) => account.roleKeys.includes(role.key))
                        .map((account) => account.name)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isCreating ? (
        <RoleEditorDialog
          role={null}
          isOpen
          onClose={() => {
            setIsCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}
