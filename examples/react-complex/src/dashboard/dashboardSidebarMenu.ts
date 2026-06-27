import { createSidebarMenuItem } from '../shared/sidebarMenu';
import type { SidebarMenuItemDeps } from '../shared/sidebarMenu';

export function createDashboardSidebarMenuItem(deps: SidebarMenuItemDeps) {
  return createSidebarMenuItem(deps, {
    id: 'dashboard',
    label: 'Overview',
  });
}
