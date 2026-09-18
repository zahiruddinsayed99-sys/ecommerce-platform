import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log info messages', () => {
    spyOn(console, 'info');
    service.info('Info message');
    expect(console.info).toHaveBeenCalledWith('[INFO] Info message', '');
  });

  it('should log error messages', () => {
    spyOn(console, 'error');
    service.error('Error message');
    expect(console.error).toHaveBeenCalledWith('[ERROR] Error message', '');
  });

  it('should log warn messages', () => {
    spyOn(console, 'warn');
    service.warn('Warning message');
    expect(console.warn).toHaveBeenCalledWith('[WARN] Warning message', '');
  });

  it('should log debug messages', () => {
    spyOn(console, 'debug');
    service.debug('Debug message');
    expect(console.debug).toHaveBeenCalledWith('[DEBUG] Debug message', '');
  });
});
