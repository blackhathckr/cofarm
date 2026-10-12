import { Link, type AnyRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LoadMore } from '@/components/LoadMore';
import { MoneyText } from '@/components/MoneyText';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { AddPartnerDialog } from '../components/AddPartnerDialog';
import { usePartners } from '../hooks/use-partners.ts';
import { PARTNER_BADGE_LABELS, PARTNER_BADGE_VARIANTS } from '../partner-labels.ts';

export function PartnersPage() {
  const [search, setSearch] = useState('');
  const partners = usePartners({ search, limit: 50 });
  const roster = partners.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
          <p className="text-sm text-muted-foreground">
            A partner reaches a project only through an active membership.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Input
            placeholder="Search name, mobile or project code"
            className="max-w-xs"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
          <AddPartnerDialog />
        </div>
      </div>

      {partners.isPending ? (
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
                <TableHead />
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead className="text-right">Contribution</TableHead>
                <TableHead>Standing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((partner) => (
                <TableRow key={partner.id} className="relative cursor-pointer">
                  <TableCell>
                    <Avatar>
                      <AvatarFallback>{partner.initials}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    {/* The partners route is registered by the app shell, which
                        this feature cannot see, so the link takes any router. */}
                    <Link<AnyRouter, string, '/partners/$partnerId'>
                      to="/partners/$partnerId"
                      params={{ partnerId: partner.id }}
                      className="font-semibold text-clay-700 after:absolute after:inset-0 hover:underline"
                    >
                      {partner.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {partner.mobile ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.projectCodes.length === 0 ? '—' : partner.projectCodes.join(', ')}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText paise={partner.totalContributionPaise} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={PARTNER_BADGE_VARIANTS[partner.badge]}>
                      {PARTNER_BADGE_LABELS[partner.badge]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {roster.length === 0 ? (
                <EmptyState
                  colSpan={6}
                  title="No partners match that search"
                  detail="Clear the search box to see the full roster."
                />
              ) : null}
            </TableBody>
          </Table>
          <LoadMore paging={partners} label="Load more partners" />
        </div>
      )}
    </div>
  );
}
