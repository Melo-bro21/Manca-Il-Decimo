import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  reliabilityScore: number;
}

export interface AuthData {
  user: AuthUser;
  token: string;
  welcomeEmailSent?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordData {
  resetEmailSent: boolean;
  expiresAt?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordData {
  userId: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authUrl = `${environment.backendUrl}/auth`;

  constructor(
    private readonly http: HttpClient,
    private readonly tokenService: TokenService
  ) {}

  login(credentials: LoginRequest): Observable<AuthData> {
    return this.http
      .post<ApiResponse<AuthData>>(`${this.authUrl}/login`, credentials)
      .pipe(
        map((response) => response.data),
        tap((data) => {
          this.tokenService.saveToken(data.token);
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthData> {
    return this.http
      .post<ApiResponse<AuthData>>(`${this.authUrl}/register`, userData)
      .pipe(
        map((response) => response.data),
        tap((data) => {
          this.tokenService.saveToken(data.token);
        })
      );
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordData> {
    return this.http
      .post<ApiResponse<ForgotPasswordData>>(
        `${this.authUrl}/forgot-password`,
        body
      )
      .pipe(map((response) => response.data));
  }

  resetPassword(body: ResetPasswordRequest): Observable<ResetPasswordData> {
    return this.http
      .post<ApiResponse<ResetPasswordData>>(
        `${this.authUrl}/reset-password`,
        body
      )
      .pipe(map((response) => response.data));
  }

  logout(): void {
    this.tokenService.removeToken();
  }

  isLoggedIn(): boolean {
    return this.tokenService.hasToken();
  }
}