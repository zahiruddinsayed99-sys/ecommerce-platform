export interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  enabled: boolean;
  requiredRole?: string;
}
