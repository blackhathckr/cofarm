import type { ExpenseHead } from '@cofarm/contracts/expense-heads';
import { COST_HEAD_LABELS, COST_HEADS, type CostHead } from '@cofarm/core/pnl';
import { cn } from 'cn';
import { useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { subHeads, topHeads, useExpenseHeads } from '@/lib/expense-heads.ts';
import { HeadNameDialog } from '../components/HeadNameDialog';
import { useCreateExpenseHead, useUpdateExpenseHead } from '../hooks/use-expense-heads.ts';

type Editing =
  | { kind: 'head'; costHead: CostHead }
  | { kind: 'sub-head'; parent: ExpenseHead }
  | { kind: 'rename'; head: ExpenseHead };

export function ExpenseHeadsPage() {
  const heads = useExpenseHeads();
  const create = useCreateExpenseHead();
  const update = useUpdateExpenseHead();
  const [editing, setEditing] = useState<Editing | null>(null);

  function close(): void {
    setEditing(null);
    create.reset();
    update.reset();
  }

  function save(name: string): void {
    if (editing === null) return;
    if (editing.kind === 'rename') {
      update.mutate({ headId: editing.head.id, body: { name } }, { onSuccess: close });
    } else if (editing.kind === 'head') {
      create.mutate({ costHead: editing.costHead, name }, { onSuccess: close });
    } else {
      create.mutate({ parentId: editing.parent.id, name }, { onSuccess: close });
    }
  }

  function toggleArchived(head: ExpenseHead): void {
    update.mutate({ headId: head.id, body: { archived: !head.archived } });
  }

  const all = heads.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expense list</h1>
        <p className="text-sm text-muted-foreground">
          What a cost is recorded against. Partners see spend by category and can open each category
          to see its expenses. Archived entries stay on past costs but cannot be picked.
        </p>
      </div>

      {editing === null ? <ErrorNote error={update.error} /> : null}

      {heads.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {COST_HEADS.map((costHead) => (
            <Card key={costHead}>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>{COST_HEAD_LABELS[costHead]}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing({ kind: 'head', costHead });
                  }}
                >
                  Add expense
                </Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {topHeads(all, costHead).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses yet.</p>
                ) : null}
                {topHeads(all, costHead).map((head) => (
                  <div key={head.id}>
                    <HeadRow
                      head={head}
                      onRename={() => {
                        setEditing({ kind: 'rename', head });
                      }}
                      onToggleArchived={() => {
                        toggleArchived(head);
                      }}
                      onAddSubHead={() => {
                        setEditing({ kind: 'sub-head', parent: head });
                      }}
                    />
                    {subHeads(all, head.id).map((sub) => (
                      <HeadRow
                        key={sub.id}
                        head={sub}
                        isSubHead
                        onRename={() => {
                          setEditing({ kind: 'rename', head: sub });
                        }}
                        onToggleArchived={() => {
                          toggleArchived(sub);
                        }}
                      />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing === null ? null : (
        <HeadNameDialog
          {...dialogCopy(editing)}
          isPending={create.isPending || update.isPending}
          error={create.error ?? update.error}
          onSubmit={save}
          onClose={close}
        />
      )}
    </div>
  );
}

function dialogCopy(editing: Editing) {
  if (editing.kind === 'rename') {
    return {
      title: 'Rename',
      description: 'Past entries show the new name too.',
      initialName: editing.head.name,
      submitLabel: 'Rename',
    };
  }
  if (editing.kind === 'head') {
    return {
      title: `New expense in ${COST_HEAD_LABELS[editing.costHead]}`,
      description: 'Its spend counts towards this category.',
      initialName: '',
      submitLabel: 'Add expense',
    };
  }
  return {
    title: `New detail under ${editing.parent.name}`,
    description: 'Picked after the expense when a cost is recorded.',
    initialName: '',
    submitLabel: 'Add detail',
  };
}

type HeadRowProps = {
  head: ExpenseHead;
  isSubHead?: boolean;
  onRename: () => void;
  onToggleArchived: () => void;
  onAddSubHead?: () => void;
};

function HeadRow({ head, isSubHead, onRename, onToggleArchived, onAddSubHead }: HeadRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md py-1 pr-1',
        isSubHead === true ? 'pl-6' : 'pl-1',
      )}
    >
      <span
        className={cn(
          'text-sm',
          isSubHead === true ? 'text-muted-foreground' : 'font-medium',
          head.archived && 'line-through',
        )}
      >
        {head.name}
        {head.archived ? (
          <Badge variant="secondary" className="ml-2">
            Archived
          </Badge>
        ) : null}
      </span>
      <div className="flex shrink-0 gap-1">
        {onAddSubHead === undefined || head.archived ? null : (
          <Button size="sm" variant="ghost" onClick={onAddSubHead}>
            Add detail
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRename}>
          Rename
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggleArchived}>
          {head.archived ? 'Restore' : 'Archive'}
        </Button>
      </div>
    </div>
  );
}
