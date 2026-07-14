import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface JoinRequestUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore: number;
  preferredRole?: string | null;
}

export interface JoinRequestMatch {
  id: number;
  title: string;
  creatorId: number;
  requiresApproval: boolean;
}

export interface JoinRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userId: number;
  matchId: number;
  createdAt: string;
  updatedAt: string;
  user?: JoinRequestUser;
  match?: JoinRequestMatch;
}

@Injectable({
  providedIn: 'root',
})
export class JoinRequestsService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private http: HttpClient) {}

  requestToJoinMatch(matchId: number): Observable<ApiResponse<JoinRequest>> {
    return this.http.post<ApiResponse<JoinRequest>>(
      `${this.apiUrl}/matches/${matchId}/join-requests`,
      {}
    );
  }

  getMatchJoinRequests(matchId: number): Observable<ApiResponse<JoinRequest[]>> {
    return this.http.get<ApiResponse<JoinRequest[]>>(
      `${this.apiUrl}/matches/${matchId}/join-requests`
    );
  }

  approveJoinRequest(requestId: number): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.apiUrl}/join-requests/${requestId}/approve`,
      {}
    );
  }

  rejectJoinRequest(requestId: number): Observable<ApiResponse<JoinRequest>> {
    return this.http.patch<ApiResponse<JoinRequest>>(
      `${this.apiUrl}/join-requests/${requestId}/reject`,
      {}
    );
  }
}