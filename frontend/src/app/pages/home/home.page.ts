import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  flameOutline,
  footballOutline,
  locationOutline,
  notificationsOutline,
  searchOutline,
} from 'ionicons/icons';

import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { MatchCardData } from '../../shared/models/match-card.model';
import { NotificationsService } from '../../core/services/notifications.service';
import { Match, MatchesService } from '../../core/services/matches.service';

type DistanceFilter = 5 | 10 | 20 | 'ALL';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, MatchCardComponent],
})
export class HomePage {
  selectedFilter = 'Tutte';
  selectedDistanceFilter: DistanceFilter = 5;

  notificationsCount = 0;

  isLoadingMatches = false;
  matchesErrorMessage = '';

  filters = ['Tutte', 'Oggi', 'Domani', 'Entro 7 giorni'];

  distanceFilters: {
    label: string;
    value: DistanceFilter;
  }[] = [
    {
      label: '5 km',
      value: 5,
    },
    {
      label: '10 km',
      value: 10,
    },
    {
      label: '20 km',
      value: 20,
    },
    {
      label: 'Tutte',
      value: 'ALL',
    },
  ];

  matches: MatchCardData[] = [];

  constructor(
    private readonly router: Router,
    private readonly notificationsService: NotificationsService,
    private readonly matchesService: MatchesService
  ) {
    addIcons({
      addOutline,
      calendarOutline,
      flameOutline,
      footballOutline,
      locationOutline,
      notificationsOutline,
      searchOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadUnreadNotificationsCount();
    this.loadMatches();
  }

  get visibleMatches(): MatchCardData[] {
    return this.matches.filter((match) => {
      const matchesDate = this.matchesSelectedDateFilter(match);

      const matchesDistance =
        this.selectedDistanceFilter === 'ALL' ||
        match.distanceKm <= this.selectedDistanceFilter;

      return matchesDate && matchesDistance;
    });
  }

  get distanceLabel(): string {
    if (this.selectedDistanceFilter === 'ALL') {
      return 'tutte le distanze';
    }

    return `${this.selectedDistanceFilter} km`;
  }

  get almostFullMatches(): MatchCardData[] {
    return this.visibleMatches
      .filter((match) => match.availableSpots > 0 && match.availableSpots <= 2)
      .slice(0, 3);
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  selectDistanceFilter(distanceFilter: DistanceFilter): void {
    this.selectedDistanceFilter = distanceFilter;
  }

  openMatchDetail(matchId: number): void {
    this.router.navigate(['/matches', matchId]);
  }

  openNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goToCreateMatch(): void {
    this.router.navigate(['/tabs/create-match']);
  }

  goToFindField(): void {
    this.router.navigate(['/tabs/find-field']);
  }

  private loadUnreadNotificationsCount(): void {
    this.notificationsService.getMyUnreadCount().subscribe({
      next: (response) => {
        this.notificationsCount = response.data.unreadCount;
      },
      error: (_error: HttpErrorResponse) => {
        this.notificationsCount = 0;
      },
    });
  }

  private loadMatches(): void {
    this.isLoadingMatches = true;
    this.matchesErrorMessage = '';

    this.matchesService.getMatches().subscribe({
      next: (response) => {
        this.matches = response.data
          .filter((match) => this.shouldShowMatchInHome(match))
          .map((match) => this.mapBackendMatchToCard(match));

        this.isLoadingMatches = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingMatches = false;

        this.matchesErrorMessage =
          error.error?.message ||
          'Non è stato possibile caricare le partite disponibili.';
      },
    });
  }

  private shouldShowMatchInHome(match: Match): boolean {
    const startsAt = new Date(match.startsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return false;
    }

    if (match.status === 'CANCELLED') {
      return false;
    }

    if (match.status === 'COMPLETED') {
      return false;
    }

    if (startsAt < new Date()) {
      return false;
    }

    return true;
  }

  private matchesSelectedDateFilter(match: MatchCardData): boolean {
    if (this.selectedFilter === 'Tutte') {
      return true;
    }

    if (this.selectedFilter === 'Oggi' || this.selectedFilter === 'Domani') {
      return match.dayLabel === this.selectedFilter;
    }

    if (this.selectedFilter === 'Entro 7 giorni') {
      return match.daysFromToday >= 0 && match.daysFromToday <= 7;
    }

    return true;
  }

  private mapBackendMatchToCard(match: Match): MatchCardData {
    const startsAt = new Date(match.startsAt);

    const availableSpots = Math.max(match.maxPlayers - match.currentPlayers, 0);

    const sportType = match.field?.sportType || 'Calcetto';

    const size =
      match.field?.size || this.getSizeFromMaxPlayers(match.maxPlayers);

    return {
      id: match.id,
      imageUrl: 'assets/welcome-football-bg.png',
      dayLabel: this.getDayLabel(startsAt),
      time: this.formatTime(startsAt),
      type: `${sportType} · ${size}`,
      centerName:
        match.field?.sportsCenter?.name || 'Centro sportivo non indicato',
      address: match.field?.sportsCenter?.address || 'Indirizzo non indicato',
      availableSpots,
      deposit: match.depositAmount,
      distanceKm: match.field?.sportsCenter?.distanceKm ?? 999,
      daysFromToday: this.getDaysFromToday(startsAt),

      requiresApproval: match.requiresApproval ?? false,
      onlyReliableUsers: match.onlyReliableUsers ?? false,
      minReliabilityScore: match.minReliabilityScore ?? null,
    };
  }

  private getDayLabel(date: Date): string {
    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    if (this.isSameDay(date, today)) {
      return 'Oggi';
    }

    if (this.isSameDay(date, tomorrow)) {
      return 'Domani';
    }

    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private isSameDay(firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  }

  private getDaysFromToday(date: Date): number {
    const today = new Date();

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const startOfDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffMs = startOfDate.getTime() - startOfToday.getTime();

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private getSizeFromMaxPlayers(maxPlayers: number): string {
    if (maxPlayers === 10) {
      return '5vs5';
    }

    if (maxPlayers === 12) {
      return '6vs6';
    }

    if (maxPlayers === 14) {
      return '7vs7';
    }

    return `${maxPlayers} giocatori`;
  }
}