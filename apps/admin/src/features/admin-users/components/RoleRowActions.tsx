import type { Role } from '@cofarm/contracts/admin-users';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { RoleEditorDialog } from './RoleEditorDialog';

type RoleRowActionsProps = {
  role: Role;
  holderNames: string[];
};

function blockedReason(role: Role, holderNames: string[]): string | null {
  if (role.isSystem) {
    return 'Built-in roles cannot be deleted. Create a role of your own instead.';
  }
  if (role.userCount === 0) return null;

  const named = holderNames.length === 0 ? '' : ` (${holderNames.join(', ')})`;
  return `Still assigned to ${String(role.userCount)} account(s)${named}. Move them to another role first.`;
}

export function RoleRowActions({ role, holderNames }: RoleRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const reason = blockedReason(role, holderNames);

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setIsEditing(true);
        }}
      >
        {role.isSystem ? 'View' : 'Edit'}
      </Button>

      {reason === null ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => {
            setIsDeleting(true);
          }}
        >
          Delete
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button size="sm" variant="ghost" disabled>
                Delete
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      )}

      {isEditing ? (
        <RoleEditorDialog
          role={role}
          isOpen
          onClose={() => {
            setIsEditing(false);
          }}
        />
      ) : null}
      {isDeleting ? (
        <DeleteRoleDialog
          role={role}
          isOpen
          onClose={() => {
            setIsDeleting(false);
          }}
        />
      ) : null}
    </div>
  );
}
