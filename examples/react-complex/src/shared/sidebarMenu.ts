import type { AppRoute, RouterService } from './routerTypes';

export interface SidebarMenuItem {
  readonly id: AppRoute['id'];
  readonly label: string;
  select(): void;
}

export interface SidebarMenuItemDeps {
  readonly router: RouterService;
}

export function createSidebarMenuItem(
  { router }: SidebarMenuItemDeps,
  options: {
    readonly id: AppRoute['id'];
    readonly label: string;
  },
): SidebarMenuItem {
  return {
    id: options.id,
    label: options.label,
    select() {
      router.navigate({ id: options.id });
    },
  };
}
