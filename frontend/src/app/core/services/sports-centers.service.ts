import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface SportsCenterField {
  id: number;
  name: string;
  sportType: string;
  size: string;
  surface: string;
  indoor: boolean;
  pricePerHour: number;
}

export interface SportsCenter {
  id: number;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  distanceKm: number;
  fields: SportsCenterField[];
}

@Injectable({
  providedIn: 'root',
})
export class SportsCentersService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getSportsCenters(): Observable<ApiResponse<SportsCenter[]>> {
    return this.http.get<ApiResponse<SportsCenter[]>>(
      `${this.apiUrl}/sports-centers`
    );
  }
}