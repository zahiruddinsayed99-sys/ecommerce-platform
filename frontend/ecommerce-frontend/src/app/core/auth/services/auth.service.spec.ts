import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { StorageService } from '../../services/storage.service';
import { LoggerService } from '../../services/logger.service';
import { API_CONSTANTS } from '../../constants/api.constants';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockStorageService: any;
  let mockLogger: any;
  let mockRouter: any;

  beforeEach(() => {
    mockStorageService = {
      setAccessToken: jasmine.createSpy('setAccessToken'),
      setRefreshToken: jasmine.createSpy('setRefreshToken'),
      setRole: jasmine.createSpy('setRole'),
      clearAuthentication: jasmine.createSpy('clearAuthentication'),
      getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue('mock-token'),
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false)
    };

    mockLogger = {
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error')
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should completely login and set storage', () => {
    service.login({ email: 'test@test.com', password: 'password' }).subscribe();

    const req = httpMock.expectOne(API_CONSTANTS.AUTH.LOGIN);
    expect(req.request.method).toBe('POST');
    req.flush({
      access_token: 'access-token',
      refresh_token: 'refresh-token'
    });

    expect(mockStorageService.setAccessToken).toHaveBeenCalledWith('access-token');
    expect(mockStorageService.setRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(mockLogger.info).toHaveBeenCalledWith('Login successful.');
  });

  it('should login and set storage without refresh token', () => {
    service.login({ email: 'test@test.com', password: 'password' }).subscribe();

    const req = httpMock.expectOne(API_CONSTANTS.AUTH.LOGIN);
    req.flush({
      access_token: 'access-token'
    });

    expect(mockStorageService.setAccessToken).toHaveBeenCalledWith('access-token');
    expect(mockStorageService.setRefreshToken).not.toHaveBeenCalled();
  });

  it('should handle register', () => {
    service.register({ email: 'test@test.com', password: 'password', role_id: '1' }).subscribe();
    const req = httpMock.expectOne(API_CONSTANTS.AUTH.REGISTER);
    expect(req.request.method).toBe('POST');
    req.flush({});
    expect(mockLogger.info).toHaveBeenCalledWith('Register request started.');
  });

  it('should logout and clear storage', () => {
    service.logout();
    expect(mockStorageService.clearAuthentication).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should get current access token', () => {
    expect(service.getAccessToken()).toBe('mock-token');
  });

  it('should check if authenticated', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should fetch profile and set role', () => {
    service.fetchProfile().subscribe();
    const req = httpMock.expectOne(API_CONSTANTS.AUTH.PROFILE);
    expect(req.request.method).toBe('GET');
    req.flush({ email: 'test@test.com', role: 'admin' });
    expect(mockStorageService.setRole).toHaveBeenCalledWith('admin');
  });

  it('should fetch profile and not set role if missing', () => {
    service.fetchProfile().subscribe();
    const req = httpMock.expectOne(API_CONSTANTS.AUTH.PROFILE);
    req.flush({ email: 'test@test.com' });
    expect(mockStorageService.setRole).not.toHaveBeenCalled();
  });
});

describe('AuthService initially authenticated', () => {
  let mockStorageService: any;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    mockStorageService = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      setRole: jasmine.createSpy('setRole')
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StorageService, useValue: mockStorageService }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch profile in constructor if authenticated', () => {
    TestBed.inject(AuthService); // instantiate
    const req = httpMock.expectOne(API_CONSTANTS.AUTH.PROFILE);
    req.flush({ email: 'test@test.com' });
  });
});
