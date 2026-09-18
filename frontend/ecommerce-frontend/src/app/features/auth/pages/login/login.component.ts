import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { StorageService } from '../../../../core/services/storage.service';

// Enterprise Design System components
import { PageContainerComponent } from '../../../../layout/page-container/page-container.component';
import { PageHeaderComponent } from '../../../../layout/page-header/page-header.component';
import { AppCardComponent } from '../../../../shared/components/app-card/app-card.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';

@Component({
  selector: 'app-login',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,

    // Design System
    PageContainerComponent,
    PageHeaderComponent,
    AppCardComponent,
    LoadingSkeletonComponent,
  ],

  templateUrl: './login.component.html',

  styleUrl: './login.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  private readonly logger = inject(LoggerService);

  private readonly storage = inject(StorageService);

  private readonly destroyRef = inject(DestroyRef);

  // Presentation-only signals
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {}

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],

    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      return;
    }

    this.error.set(null);
    this.loading.set(true);

    this.logger.info('Login requested.');

    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.logger.info('User authenticated, fetching profile.');

          this.authService.fetchProfile().subscribe({
            next: () => {
              this.loading.set(false);
              const role = this.storage.getRole();
              if (role && role.toUpperCase() === 'ADMIN') {
                this.router.navigate(['/admin/orders']);
              } else {
                this.router.navigate(['/products']);
              }
            },
            error: err => {
              this.logger.error('Failed to fetch profile.', err);
              this.error.set('Could not fetch user profile.');
              this.loading.set(false);
            }
          });
        },

        error: error => {
          /**
           * ErrorInterceptor has already
           * transformed the error.
           */

          this.logger.error('Login failed.', error);

          // Preserve existing error handling while surfacing message in UI
          const message =
            (error && (error.message || error.error?.message)) || 'Login failed. Please try again.';
          this.error.set(message);
          this.loading.set(false);
        },
      });
  }
}
