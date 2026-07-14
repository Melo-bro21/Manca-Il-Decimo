import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  peopleOutline,
  personCircleOutline,
  refreshOutline,
  searchOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons';

import {
  JoinRequest,
  JoinRequestsService,
} from '../../core/services/join-requests.service';

@Component({
  selector: 'app-match-requests',
  templateUrl: './match-requests.page.html',
  styleUrls: ['./match-requests.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class MatchRequestsPage {
  matchId = 0;

  isLoading = false;
  actionLoadingId: number | null = null;

  requests: JoinRequest[] = [];

  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly joinRequestsService: JoinRequestsService
  ) {
   addIcons({
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  peopleOutline,
  personCircleOutline,
  refreshOutline,
  searchOutline,
  shieldCheckmarkOutline,
  timeOutline,
});

    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    this.matchId = Number.isNaN(idFromRoute) ? 0 : idFromRoute;
  }

  ionViewWillEnter(): void {
    this.loadRequests();
  }

  get hasRequests(): boolean {
    return this.requests.length > 0;
  }

  get pendingRequests(): JoinRequest[] {
    return this.requests.filter((request) => request.status === 'PENDING');
  }

  get completedRequests(): JoinRequest[] {
    return this.requests.filter((request) => request.status !== 'PENDING');
  }

  goBack(): void {
    this.router.navigate(['/matches', this.matchId]);
  }

  loadRequests(): void {
    this.clearMessages();
    this.isLoading = true;

    this.joinRequestsService.getMatchJoinRequests(this.matchId).subscribe({
      next: (response) => {
        this.requests = response.data;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare le richieste.';
      },
    });
  }

  approveRequest(request: JoinRequest): void {
    if (this.actionLoadingId !== null || request.status !== 'PENDING') {
      return;
    }

    this.clearMessages();
    this.actionLoadingId = request.id;

    this.joinRequestsService.approveJoinRequest(request.id).subscribe({
      next: () => {
        this.requests = this.requests.map((item) => {
          if (item.id !== request.id) {
            return item;
          }

          return {
            ...item,
            status: 'APPROVED',
          };
        });

        this.actionLoadingId = null;
        this.successMessage =
          'Richiesta accettata. Il giocatore è stato inserito nella partita.';

        this.refreshRequestsKeepingMessage();
      },
      error: (error: HttpErrorResponse) => {
        this.actionLoadingId = null;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile accettare la richiesta.';

        this.refreshRequestsKeepingMessage();
      },
    });
  }

  rejectRequest(request: JoinRequest): void {
    if (this.actionLoadingId !== null || request.status !== 'PENDING') {
      return;
    }

    this.clearMessages();
    this.actionLoadingId = request.id;

    this.joinRequestsService.rejectJoinRequest(request.id).subscribe({
      next: () => {
        this.requests = this.requests.map((item) => {
          if (item.id !== request.id) {
            return item;
          }

          return {
            ...item,
            status: 'REJECTED',
          };
        });

        this.actionLoadingId = null;
        this.successMessage = 'Richiesta rifiutata.';

        this.refreshRequestsKeepingMessage();
      },
      error: (error: HttpErrorResponse) => {
        this.actionLoadingId = null;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile rifiutare la richiesta.';

        this.refreshRequestsKeepingMessage();
      },
    });
  }

  getUserInitial(request: JoinRequest): string {
    const name = request.user?.name || request.user?.email || '?';
    return name.charAt(0).toUpperCase();
  }

  getUserName(request: JoinRequest): string {
    return request.user?.name || request.user?.email || 'Utente';
  }

  getUserRole(request: JoinRequest): string {
    return request.user?.preferredRole || 'Ruolo non indicato';
  }

  getStatusLabel(status: JoinRequest['status']): string {
    if (status === 'PENDING') {
      return 'In attesa';
    }

    if (status === 'APPROVED') {
      return 'Accettata';
    }

    return 'Rifiutata';
  }

  private refreshRequestsKeepingMessage(): void {
    this.joinRequestsService.getMatchJoinRequests(this.matchId).subscribe({
      next: (response) => {
        this.requests = response.data;
      },
      error: () => {


      },
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}