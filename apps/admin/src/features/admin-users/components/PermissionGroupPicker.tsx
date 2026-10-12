import type { PermissionGroup } from '@cofarm/contracts/admin-users';
import type { Permission } from '@cofarm/contracts/permissions';

import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

type PermissionGroupPickerProps = {
  groups: PermissionGroup[];
  selected: Permission[];
  isReadOnly: boolean;
  onChange: (permissions: Permission[]) => void;
};

export function PermissionGroupPicker({
  groups,
  selected,
  isReadOnly,
  onChange,
}: PermissionGroupPickerProps) {
  function toggle(permission: Permission, isOn: boolean) {
    onChange(isOn ? [...selected, permission] : selected.filter((entry) => entry !== permission));
  }

  function toggleGroup(group: PermissionGroup, isOn: boolean) {
    const others = selected.filter((entry) => !group.permissions.includes(entry));
    onChange(isOn ? [...others, ...group.permissions] : others);
  }

  return (
    <div className="max-h-96 space-y-4 overflow-y-auto rounded-md border p-4">
      {groups.map((group) => {
        const isWholeGroupOn = group.permissions.every((entry) => selected.includes(entry));

        return (
          <div key={group.group} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Checkbox
                disabled={isReadOnly}
                checked={isWholeGroupOn}
                onCheckedChange={(checked) => {
                  toggleGroup(group, checked === true);
                }}
              />
              {group.group}
            </label>
            <Separator />
            <div className="grid gap-2 sm:grid-cols-2">
              {group.permissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    disabled={isReadOnly}
                    checked={selected.includes(permission)}
                    onCheckedChange={(checked) => {
                      toggle(permission, checked === true);
                    }}
                  />
                  <span className="font-mono text-xs">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
