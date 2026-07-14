import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type SuspensionAppealStatus = 'OPEN' | 'APPROVED' | 'REJECTED';

export interface SuspensionAppealUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore?: number;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
}

export interface SuspensionAppeal {
  id: number;
  message: string;
  status: SuspensionAppealStatus;
  adminNote?: string | null;
  userId: number;
  playerReportId?: number | null;
  resolvedByAdminId?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: SuspensionAppealUser;
  resolvedByAdmin?: SuspensionAppealUser;
  playerReport?: {
    id: number;
    reason: string;
    description?: string | null;
    adminNote?: string | null;
    suspensionDays?: number | null;
    match?: {
      id: number;
      title: string;
      startsAt: string;
      status: string;
      field?: {
        id: number;
        name: string;
        sportsCenter?: {
          id: number;
          name: string;
          city: string;
          address: string;
        };
      };
    };
    reporter?: {
      id: number;
      name: string | null;
      email: string;
    };
    reportedUser?: {
      id: number;
      name: string | null;
      email: string;
    };
  };
}

export interface MySuspensionAppealStatus {
  suspended: boolean;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  canRequestAppeal: boolean;
  openAppeal?: SuspensionAppeal | null;
  latestAppeal?: SuspensionAppeal | null;
}

export interface CreateSuspensionAppealRequest {
  message: string;
}

export interface ResolveSuspensionAppealRequest {
  adminNote: string;
}

export interface ApproveSuspensionAppealResult {
  user: {
    id: number;
    name: string | null;
    email: string;
    suspendedUntil: string | null;
    suspensionReason: string | null;
  };
  appeal: SuspensionAppeal;
}

@Injectable({
  providedIn: 'root',
})
export class SuspensionAppealsService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getMyStatus(): Observable<ApiResponse<MySuspensionAppealStatus>> {
    return this.http.get<ApiResponse<MySuspensionAppealStatus>>(
      `${this.apiUrl}/users/me/suspension-appeal-status`
    );
  }

  createAppeal(
    body: CreateSuspensionAppealRequest
  ): Observable<ApiResponse<SuspensionAppeal>> {
    return this.http.post<ApiResponse<SuspensionAppeal>>(
      `${this.apiUrl}/suspension-appeals`,
      body
    );
  }

  getAdminAppeals(
    status?: SuspensionAppealStatus
  ): Observable<ApiResponse<SuspensionAppeal[]>> {
    const url = status
      ? `${this.apiUrl}/admin/suspension-appeals?status=${status}`
      : `${this.apiUrl}/admin/suspension-appeals`;

    return this.http.get<ApiResponse<SuspensionAppeal[]>>(url);
  }

  rejectAppeal(
    appealId: number,
    body: ResolveSuspensionAppealRequest
  ): Observable<ApiResponse<SuspensionAppeal>> {
    return this.http.patch<ApiResponse<SuspensionAppeal>>(
      `${this.apiUrl}/admin/suspension-appeals/${appealId}/reject`,
      body
    );
  }

  approveAppeal(
    appealId: number,
    body: ResolveSuspensionAppealRequest
  ): Observable<ApiResponse<ApproveSuspensionAppealResult>> {
    return this.http.patch<ApiResponse<ApproveSuspensionAppealResult>>(
      `${this.apiUrl}/admin/suspension-appeals/${appealId}/approve`,
      body
    );
  }
}