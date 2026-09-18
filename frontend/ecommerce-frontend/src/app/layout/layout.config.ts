import { NavigationItem } from '../shared/models/navigation-item.model';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    enabled: true,
  },
  {
    label: 'Profile',
    icon: 'person',
    route: '/profile',
    enabled: true,
    requiredRole: 'CUSTOMER',
  },
  {
    label: 'Products',
    icon: 'inventory_2',
    route: '/products',
    enabled: true,
    requiredRole: 'CUSTOMER',
  },
  {
    label: 'Orders',
    icon: 'shopping_cart',
    route: '/orders',
    enabled: true,
    requiredRole: 'CUSTOMER',
  },
  {
    label: 'Cart',
    icon: 'shopping_bag',
    route: '/cart',
    enabled: true,
    requiredRole: 'CUSTOMER',
  },
  {
    label: 'Customers',
    icon: 'groups',
    route: '/customers',
    enabled: true,
    requiredRole: 'ADMIN',
  },
  {
    label: 'Reports',
    icon: 'analytics',
    route: '/reports',
    enabled: true,
    requiredRole: 'ADMIN',
  },
  {
    label: 'Admin Operations',
    icon: 'admin_panel_settings',
    route: '/admin/orders',
    enabled: true,
    requiredRole: 'ADMIN',
  },
];
