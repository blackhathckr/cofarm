import type { HarvestPreview, HarvestShare } from '@cofarm/contracts/harvest';
import { useState } from 'react';

import { MoneyText } from '@/components/MoneyText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBasisPoints, shareOfPool } from '../share-percent.ts';
import { PartnerStatementDialog } from './PartnerStatementDialog';

type PartnerShareTableProps = {
  preview: HarvestPreview;
};

function sumPaise(amounts: readonly string[]): bigint {
  return amounts.reduce<bigint>((total, amount) => total + BigInt(amount), 0n);
}

export function PartnerShareTable({ preview }: PartnerShareTableProps) {
  const [statementFor, setStatementFor] = useState<HarvestShare | null>(null);

  const pool = BigInt(preview.partnerPoolPaise);
  const shareTotal = sumPaise(preview.partners.map((partner) => partner.sharePaise));
  const contributionTotal = sumPaise(preview.partners.map((partner) => partner.contributionPaise));
  const residual = pool - shareTotal;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card p-4">
        <div>
          <p className="text-xs font-semibold uppercase opacity-70">Partner pool</p>
          <p className="text-xl font-bold">
            <MoneyText paise={preview.partnerPoolPaise} showPaise />
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase opacity-70">Sum of partner shares</p>
          <p className="text-xl font-bold">
            <MoneyText paise={shareTotal.toString()} showPaise />
          </p>
        </div>
        <Badge variant={residual === 0n ? 'default' : 'destructive'}>
          {residual === 0n ? (
            'Reconciles to the paise'
          ) : (
            <>
              Off by <MoneyText paise={residual.toString()} showPaise />
            </>
          )}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
              <TableHead className="text-right">Share of pool</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.partners.map((partner) => (
              <TableRow key={partner.membershipId}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell className="text-right">
                  <MoneyText paise={partner.contributionPaise} showPaise />
                </TableCell>
                <TableCell className="tabular text-right">
                  {shareOfPool(partner.sharePaise, preview.partnerPoolPaise)}
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText paise={partner.sharePaise} showPaise />
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatBasisPoints(partner.returnBps)}
                </TableCell>
                <TableCell className="text-right">
                  {preview.status === 'published' ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => {
                        setStatementFor(partner);
                      }}
                    >
                      Statement
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">
                {`Sum of ${preview.partners.length} partner shares`}
              </TableCell>
              <TableCell className="text-right font-semibold">
                <MoneyText paise={contributionTotal.toString()} showPaise />
              </TableCell>
              <TableCell />
              <TableCell className="text-right font-semibold">
                <MoneyText paise={shareTotal.toString()} showPaise />
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
            <TableRow>
              <TableCell className="font-semibold">Partner pool</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-semibold">
                <MoneyText paise={preview.partnerPoolPaise} showPaise />
              </TableCell>
              <TableCell colSpan={2}>
                <Badge variant={residual === 0n ? 'default' : 'destructive'}>
                  {residual === 0n ? 'Matches' : 'Does not match'}
                </Badge>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {statementFor === null ? null : (
        <PartnerStatementDialog
          projectId={preview.projectId}
          cycleId={preview.cycleId}
          partner={statementFor}
          onClose={() => {
            setStatementFor(null);
          }}
        />
      )}
    </div>
  );
}
