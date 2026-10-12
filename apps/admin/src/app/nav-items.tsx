import {
  FileSignature,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

/** The console's top-level sections. Project-scoped screens live behind a
 * project, so they appear in the project tab strip rather than here. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { to: '/projects', label: 'Projects', icon: <FolderKanban className="size-4" /> },
  { to: '/partners', label: 'Partners', icon: <Users className="size-4" /> },
  { to: '/approvals', label: 'Approvals', icon: <FileSignature className="size-4" /> },
  { to: '/inbox', label: 'Inbox', icon: <MessagesSquare className="size-4" /> },
  { to: '/admin/users', label: 'Admin users', icon: <Users className="size-4" /> },
  { to: '/admin/roles', label: 'Roles', icon: <ShieldCheck className="size-4" /> },
  { to: '/security', label: 'Your security', icon: <KeyRound className="size-4" /> },
];
