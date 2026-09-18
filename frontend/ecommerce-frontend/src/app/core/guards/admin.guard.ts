import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '../services/logger.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const storage = inject(StorageService);
  const notificationService = inject(NotificationService);
  const logger = inject(LoggerService);

  const role = storage.getRole();
  if (role && role.toUpperCase() === 'ADMIN') {
    return true;
  }

  logger.warn('Unauthorized admin access attempt', { url: state.url });
  notificationService.error('You do not have permission to access the admin area.');
  return router.createUrlTree(['/']);
};
