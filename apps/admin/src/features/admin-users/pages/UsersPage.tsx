import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LoadMore } from '@/components/LoadMore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatLastLogin } from '../admin-user-dates.ts';
import { CreateUserDialog } from '../components/CreateUserDialog';
import { UserRowActions } from '../components/UserRowActions';
import { useAdminUsers } from '../hooks/use-admin-users.ts';
import { isLastActiveSuperadmin } from '../superadmin-guard.ts';

const STATUS_TONE: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  suspended: 'secondary',
  deleted: 'outline',
};

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const users = useAdminUsers({ search });

  const accounts = users.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin accounts</h1>
          <p className="text-sm text-muted-foreground">
            Who can sign in to the console, and what they are allowed to do.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search name or email"
            className="max-w-xs"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
          <Button
            onClick={() => {
              setIsCreating(true);
            }}
          >
            New account
          </Button>
        </div>
      </div>

      {users.isPending ? (
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Two-factor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="text-muted-foreground">{account.email ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {account.roleKeys.map((roleKey) => (
                        <Badge key={roleKey} variant="outline">
                          {roleKey}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[account.status] ?? 'outline'}>
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatLastLogin(account.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    {account.twoFactorEnabled ? (
                      <Badge variant="secondary">Enrolled</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not enrolled</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      user={account}
                      isLastSuperadmin={isLastActiveSuperadmin(account, accounts)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  title="No accounts match that search"
                  detail="Clear the search box to see every console account."
                />
              ) : null}
            </TableBody>
          </Table>
          <LoadMore paging={users} label="Load more accounts" />
        </div>
      )}

      {isCreating ? (
        <CreateUserDialog
          isOpen
          onClose={() => {
            setIsCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}
