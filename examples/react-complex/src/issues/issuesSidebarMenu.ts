import { createSidebarMenuItem } from '../shared/sidebarMenu';
import type { SidebarMenuItemDeps } from '../shared/sidebarMenu';

export function createIssuesSidebarMenuItem(deps: SidebarMenuItemDeps) {
  return createSidebarMenuItem(deps, {
    id: 'issues',
    label: 'Issues',
  });
}
