import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface NotificationMatch {
  id: number;
  title: string;
  startsAt: string;
  status: string;
}

export interface NotificationBooking {
  id: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
}

export interface NotificationPenalty {
  id: number;
  type: string;
  points: number;
  reason: string;
}

export interface NotificationWaitlistEntry {
  id: number;
  status: string;
  position: number;
}

export interface AppBackendNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  matchId?: number | null;
  bookingId?: number | null;
  penaltyId?: number | null;
  waitlistEntryId?: number | null;
  createdAt: string;
  updatedAt: string;
  match?: NotificationMatch | null;
  booking?: NotificationBooking | null;
  penalty?: NotificationPenalty | null;
  waitlistEntry?: NotificationWaitlistEntry | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkAllReadResponse {
  updatedCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getMyNotifications(): Observable<ApiResponse<AppBackendNotification[]>> {
    return this.http.get<ApiResponse<AppBackendNotification[]>>(
      `${this.apiUrl}/notifications/me`
    );
  }

  getMyUnreadCount(): Observable<ApiResponse<UnreadCountResponse>> {
    return this.http.get<ApiResponse<UnreadCountResponse>>(
      `${this.apiUrl}/notifications/unread-count`
    );
  }

  markAsRead(
    notificationId: number
  ): Observable<ApiResponse<AppBackendNotification>> {
    return this.http.patch<ApiResponse<AppBackendNotification>>(
      `${this.apiUrl}/notifications/${notificationId}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<ApiResponse<MarkAllReadResponse>> {
    return this.http.patch<ApiResponse<MarkAllReadResponse>>(
      `${this.apiUrl}/notifications/read-all`,
      {}
    );
  }
}