import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { customerGuard } from './customer.guard';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '../services/logger.service';

describe('CustomerGuard', () => {
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

  it('should allow access for customer role', () => {
    mockStorageService.getRole.and.returnValue('customer');
    const result = TestBed.runInInjectionContext(() => customerGuard({} as ActivatedRouteSnapshot, { url: '/products' } as RouterStateSnapshot));
    expect(result).toBeTrue();
  });

  it('should allow access for CUSTOMER role (case insensitive)', () => {
    mockStorageService.getRole.and.returnValue('CUSTOMER');
    const result = TestBed.runInInjectionContext(() => customerGuard({} as ActivatedRouteSnapshot, { url: '/products' } as RouterStateSnapshot));
    expect(result).toBeTrue();
  });

  it('should deny access and redirect for non-customer role', () => {
    mockStorageService.getRole.and.returnValue('admin');
    const result = TestBed.runInInjectionContext(() => customerGuard({} as ActivatedRouteSnapshot, { url: '/products' } as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(mockLogger.warn).toHaveBeenCalledWith('Unauthorized customer access attempt', { url: '/products' });
    expect(mockNotification.error).toHaveBeenCalledWith('You do not have permission to access this area.');
  });

  it('should deny access and redirect if no role', () => {
    mockStorageService.getRole.and.returnValue(null);
    const result = TestBed.runInInjectionContext(() => customerGuard({} as ActivatedRouteSnapshot, { url: '/products' } as RouterStateSnapshot));
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
