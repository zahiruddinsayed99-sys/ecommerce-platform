import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { adminGuard } from './admin.guard';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '../services/logger.service';

describe('AdminGuard', () => {
  let mockStorageService: any;
  let mockRouter: any;
  let mockNotification: any;
  let mockLogger: any;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    mockUrlTree = {} as UrlTree;
    mockStorageService = {
      getRole: jasmine.createSpy('getRole')
    };
    mockRouter = {
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(mockUrlTree)
    };
    mockNotification = {
      error: jasmine.createSpy('error')
    };
    mockLogger = {
      warn: jasmine.createSpy('warn')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotification },
        { provide: LoggerService, useValue: mockLogger }
      ]
    });
  });

  it('should allow access for admin role', () => {
    mockStorageService.getRole.and.returnValue('admin');
    const result = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot));
    expect(result).toBeTrue();
  });

  it('should allow access for ADMIN role (case insensitive)', () => {
    mockStorageService.getRole.and.returnValue('ADMIN');
    const result = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot));
    expect(result).toBeTrue();
  });

  it('should deny access and redirect for non-admin role', () => {
    mockStorageService.getRole.and.returnValue('customer');
    const result = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(mockLogger.warn).toHaveBeenCalledWith('Unauthorized admin access attempt', { url: '/admin' });
    expect(mockNotification.error).toHaveBeenCalledWith('You do not have permission to access the admin area.');
  });

  it('should deny access and redirect if no role', () => {
    mockStorageService.getRole.and.returnValue(null);
    const result = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
