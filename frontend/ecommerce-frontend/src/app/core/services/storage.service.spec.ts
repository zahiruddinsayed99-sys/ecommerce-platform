import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/storage.constants';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get item', () => {
    service.setItem('test-key', { data: 'test' });
    const val = service.getItem<{ data: string }>('test-key');
    expect(val).toEqual({ data: 'test' });
  });

  it('should remove item', () => {
    service.setItem('test-key', 'test');
    service.removeItem('test-key');
    expect(service.getItem('test-key')).toBeNull();
  });

  it('should clear storage', () => {
    service.setItem('k1', 'v1');
    service.setItem('k2', 'v2');
    service.clear();
    expect(service.getItem('k1')).toBeNull();
    expect(service.getItem('k2')).toBeNull();
  });

  it('should handle token methods', () => {
    service.setAccessToken('access');
    expect(service.getAccessToken()).toBe('access');
    expect(service.hasAccessToken()).toBeTrue();

    service.setRefreshToken('refresh');
    expect(service.getRefreshToken()).toBe('refresh');

    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should handle role methods', () => {
    service.setRole('admin');
    expect(service.getRole()).toBe('admin');
    service.clearRole();
    expect(service.getRole()).toBeNull();
  });

  it('should handle user methods', () => {
    service.setUser({ name: 'user' });
    expect(service.getUser()).toEqual({ name: 'user' });
    service.clearUser();
    expect(service.getUser()).toBeNull();
  });

  it('should clear authentication', () => {
    service.setAccessToken('access');
    service.setRefreshToken('refresh');
    service.setUser({ name: 'user' });
    service.setRole('admin');

    service.clearAuthentication();

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(service.getRole()).toBeNull();
  });

});
