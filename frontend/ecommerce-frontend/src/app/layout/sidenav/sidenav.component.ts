import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';

import { NavigationItem } from '../../shared/models/navigation-item.model';
import { NAVIGATION_ITEMS } from '../layout.config';
import { LayoutService } from '../services/layout.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatRippleModule],
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent {
  @Input() isMobile = false;

  private readonly router = inject(Router);

  private readonly layoutService = inject(LayoutService);

  private readonly storageService = inject(StorageService);

  readonly navigationItems: NavigationItem[] = NAVIGATION_ITEMS;

  canAccess(item: NavigationItem): boolean {
    if (!item.requiredRole) {
      return true;
    }
    const role = this.storageService.getRole();
    return !!role && role.toUpperCase() === item.requiredRole.toUpperCase();
  }

  trackByItem(index: number, item: NavigationItem): string {
    return item.route;
  }

  isRouteActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'exact',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  isEnabled(item: NavigationItem): boolean {
    return item.enabled;
  }

  onItemClick(item: NavigationItem): void {
    if (!item.enabled) {
      return;
    }

    if (this.isMobile) {
      this.layoutService.close();
    }
  }
}
