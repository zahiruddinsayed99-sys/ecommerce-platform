import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { BehaviorSubject, Observable, tap } from 'rxjs';

import { RegisterRequest } from '../models/register-request.model';
import { AuthResponse } from '../models/auth.model';

import { API_CONSTANTS } from '../../constants/api.constants';
import { LoginRequest, User } from '../models/auth.model';
import { StorageService } from '../../services/storage.service';
import { LoggerService } from '../../../core/services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly storage = inject(StorageService);

  private readonly logger = inject(LoggerService);

  private readonly router = inject(Router);

  /**
   * ===================================================
   * Authentication State
   * ===================================================
   */

  private readonly authenticatedSubject = new BehaviorSubject<boolean>(
    this.storage.isAuthenticated(),
  );

  readonly isAuthenticated$ = this.authenticatedSubject.asObservable();

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (this.storage.isAuthenticated()) {
      this.fetchProfile().subscribe();
    }
  }

  fetchProfile(): Observable<User> {
    return this.http.get<User>(API_CONSTANTS.AUTH.PROFILE).pipe(
      tap(user => { if (user.role) { this.storage.setRole(user.role); } this.currentUserSubject.next(user); })
    );
  }

  /**
   * ===================================================
   * Register
   * ===================================================
   */

  register(request: RegisterRequest): Observable<AuthResponse> {
    this.logger.info('Register request started.');

    return this.http.post<AuthResponse>(API_CONSTANTS.AUTH.REGISTER, request);
  }

  /**
   * ===================================================
   * Login
   * ===================================================
   */

  login(request: LoginRequest): Observable<AuthResponse> {
    this.logger.info('Login request started.');

    return this.http.post<AuthResponse>(API_CONSTANTS.AUTH.LOGIN, request).pipe(
      tap(response => {
        this.storage.setAccessToken(response.access_token);

        if (response.refresh_token) {
          this.storage.setRefreshToken(response.refresh_token);
        }

        this.authenticatedSubject.next(true);

        this.logger.info('Login successful.');
      }),
    );
  }

  /**
   * ===================================================
   * Logout
   * ===================================================
   */

  logout(): void {
    this.storage.clearAuthentication();
    this.authenticatedSubject.next(false);
    this.logger.info('User logged out.');
    this.router.navigate(['/login']);
  }

  /**
   * ===================================================
   * Access Token
   * ===================================================
   */

  getAccessToken(): string | null {
    return this.storage.getAccessToken();
  }

  /**
   * ===================================================
   * Current Authentication State
   * ===================================================
   */

  isAuthenticated(): boolean {
    return this.storage.isAuthenticated();
  }
}
