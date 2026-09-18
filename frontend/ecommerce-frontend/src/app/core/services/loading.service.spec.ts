import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';
import { LoggerService } from './logger.service';

describe('LoadingService', () => {
  let service: LoadingService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jasmine.createSpy('info')
    };
    TestBed.configureTestingModule({
      providers: [
        LoadingService,
        { provide: LoggerService, useValue: mockLogger }
      ]
    });
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update loading state', () => {
    service.show();
    expect(service.isLoading).toBeTrue();
  });

  it('should handle nested calls', () => {
    service.show();
    service.show();
    service.hide();
    expect(service.isLoading).toBeTrue();
    service.hide();
    expect(service.isLoading).toBeFalse();
  });

  it('should prevent negative counter', () => {
    service.hide();
    expect(service.isLoading).toBeFalse();
  });

  it('should reset loading state', () => {
    service.show();
    service.show();
    service.reset();
    expect(service.isLoading).toBeFalse();
  });
});
