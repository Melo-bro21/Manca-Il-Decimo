import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type AdminReportStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

export interface AdminReportUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore?: number;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
}

export interface AdminReportMatch {
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
}

export interface AdminReport {
  id: number;
  reason: string;
  description?: string | null;
  status: AdminReportStatus;
  adminNote?: string | null;
  suspensionDays?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  matchId: number;
  reporterId: number;
  reportedUserId: number;
  resolvedByAdminId?: number | null;

  match?: AdminReportMatch;
  reporter?: AdminReportUser;
  reportedUser?: AdminReportUser;
  resolvedByAdmin?: AdminReportUser;
}

export interface SuspendReportRequest {
  days: number;
  adminNote?: string | null;
}

export interface CloseReportRequest {
  adminNote?: string | null;
}

export interface SuspendedUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore: number;
  suspendedUntil: string;
  suspensionReason?: string | null;
  createdAt: string;
}

export interface SuspendReportResult {
  user: SuspendedUser;
  report: AdminReport;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getReports(status?: AdminReportStatus): Observable<ApiResponse<AdminReport[]>> {
    const url = status
      ? `${this.apiUrl}/admin/reports?status=${status}`
      : `${this.apiUrl}/admin/reports`;

    return this.http.get<ApiResponse<AdminReport[]>>(url);
  }

  ignoreReport(
    reportId: number,
    body: CloseReportRequest
  ): Observable<ApiResponse<AdminReport>> {
    return this.http.patch<ApiResponse<AdminReport>>(
      `${this.apiUrl}/admin/reports/${reportId}/ignore`,
      body
    );
  }

  resolveReport(
    reportId: number,
    body: CloseReportRequest
  ): Observable<ApiResponse<AdminReport>> {
    return this.http.patch<ApiResponse<AdminReport>>(
      `${this.apiUrl}/admin/reports/${reportId}/resolve`,
      body
    );
  }

  suspendUserFromReport(
    reportId: number,
    body: SuspendReportRequest
  ): Observable<ApiResponse<SuspendReportResult>> {
    return this.http.patch<ApiResponse<SuspendReportResult>>(
      `${this.apiUrl}/admin/reports/${reportId}/suspend`,
      body
    );
  }

  getSuspendedUsers(): Observable<ApiResponse<SuspendedUser[]>> {
    return this.http.get<ApiResponse<SuspendedUser[]>>(
      `${this.apiUrl}/admin/suspended-users`
    );
  }

  unsuspendUser(
    userId: number,
    body: CloseReportRequest
  ): Observable<ApiResponse<{ user: SuspendedUser; removedByAdminId: number }>> {
    return this.http.patch<
      ApiResponse<{ user: SuspendedUser; removedByAdminId: number }>
    >(`${this.apiUrl}/admin/users/${userId}/unsuspend`, body);
  }
}