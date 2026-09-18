import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show success message', () => {
    service.success('Success message');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Success message', 'OK', jasmine.objectContaining({ panelClass: ['snackbar-success'] }));
  });

  it('should show error message', () => {
    service.error('Error message');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error message', 'Dismiss', jasmine.objectContaining({ panelClass: ['snackbar-error'] }));
  });

  it('should show info message', () => {
    service.info('Info message');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Info message', 'OK', jasmine.objectContaining({ panelClass: ['snackbar-info'] }));
  });

  it('should show warning message', () => {
    service.warning('Warning message');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Warning message', 'OK', jasmine.objectContaining({ panelClass: ['snackbar-warning'] }));
  });
});
