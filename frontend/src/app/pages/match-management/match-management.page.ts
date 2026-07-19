import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  flagOutline,
  footballOutline,
  locationOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import {
  MatchManagementData,
  MatchManagementParticipant,
  MatchesService,
  ReportReasonOption,
} from '../../core/services/matches.service';

@Component({
  selector: 'app-match-management',
  templateUrl: './match-management.page.html',
  styleUrls: ['./match-management.page.scss'],
  standalone: true,
  imports: [
  CommonModule,
  FormsModule,
  IonContent,
  IonIcon,
  IonTextarea,
  IonSelect,
  IonSelectOption,
],
})
export class MatchManagementPage {
  matchId = 0;

  isLoading = false;
  isSubmitting = false;

  errorMessage = '';
  successMessage = '';

  management: MatchManagementData | null = null;

  selectedParticipant: MatchManagementParticipant | null = null;
  selectedReason = '';
  description = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly matchesService: MatchesService
  ) {
    addIcons({
      arrowBackOutline,
      alertCircleOutline,
      calendarOutline,
      checkmarkCircleOutline,
      flagOutline,
      footballOutline,
      locationOutline,
      personCircleOutline,
      shieldCheckmarkOutline,
    });

    this.matchId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ionViewWillEnter(): void {
    this.loadManagement();
  }

  get reportReasons(): ReportReasonOption[] {
    return this.management?.reportReasons || [];
  }

  get participants(): MatchManagementParticipant[] {
    return this.management?.participants || [];
  }

  get isOtherReasonSelected(): boolean {
    return this.selectedReason === 'OTHER';
  }

  get selectedParticipantName(): string {
    if (!this.selectedParticipant) {
      return '';
    }

    return (
      this.selectedParticipant.user.name ||
      this.selectedParticipant.user.email ||
      'Utente'
    );
  }

  loadManagement(): void {
    if (!this.matchId || Number.isNaN(this.matchId)) {
      this.errorMessage = 'Partita non valida.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.matchesService.getMatchManagement(this.matchId).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.management = response.data;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare la gestione partita.';
      },
    });
  }

  selectParticipant(participant: MatchManagementParticipant, event: Event): void {
    event.stopPropagation();

    this.selectedParticipant = participant;
    this.selectedReason = '';
    this.description = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelReport(): void {
    this.selectedParticipant = null;
    this.selectedReason = '';
    this.description = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitReport(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.selectedParticipant) {
      this.errorMessage = 'Seleziona un utente da segnalare.';
      return;
    }

    if (!this.selectedReason) {
      this.errorMessage = 'Seleziona il motivo della segnalazione.';
      return;
    }

    const cleanedDescription = this.description.trim();

    if (this.selectedReason === 'OTHER' && !cleanedDescription) {
      this.errorMessage =
        'Inserisci una descrizione per spiegare il motivo della segnalazione.';
      return;
    }

    const confirmed = window.confirm(
      `Vuoi inviare una segnalazione per ${this.selectedParticipantName}?`
    );

    if (!confirmed) {
      return;
    }

    this.isSubmitting = true;

    this.matchesService
      .createPlayerReport(this.matchId, {
        reportedUserId: this.selectedParticipant.user.id,
        reason: this.selectedReason,
        description: cleanedDescription || null,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;

          this.successMessage =
            response.message ||
            'Segnalazione inviata. Un admin la valuterà.';

          this.selectedParticipant = null;
          this.selectedReason = '';
          this.description = '';
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile inviare la segnalazione.';
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/tabs/my-matches']);
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'Data non disponibile';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Data non disponibile';
    }

    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  formatTime(value?: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}