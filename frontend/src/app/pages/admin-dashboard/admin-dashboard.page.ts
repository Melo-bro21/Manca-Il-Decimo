import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  banOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  peopleOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons';

import {
  AdminReport,
  AdminReportStatus,
  AdminService,
  SuspendedUser,
} from '../../core/services/admin.service';
import {
  SuspensionAppeal,
  SuspensionAppealsService,
  SuspensionAppealStatus,
} from '../../core/services/suspension-appeals.service';

type AdminTab = 'reports' | 'suspended' | 'appeals';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class AdminDashboardPage {
  selectedTab: AdminTab = 'reports';
  selectedStatus: AdminReportStatus = 'OPEN';
  selectedAppealStatus: SuspensionAppealStatus = 'OPEN';

  isLoadingReports = false;
  isLoadingSuspendedUsers = false;
  isLoadingAppeals = false;
  isActionLoading = false;

  errorMessage = '';
  successMessage = '';

  reports: AdminReport[] = [];
  suspendedUsers: SuspendedUser[] = [];
  appeals: SuspensionAppeal[] = [];

  reportStatuses: { label: string; value: AdminReportStatus }[] = [
    { label: 'Aperte', value: 'OPEN' },
    { label: 'Risolte', value: 'RESOLVED' },
    { label: 'Ignorate', value: 'IGNORED' },
  ];

  appealStatuses: { label: string; value: SuspensionAppealStatus }[] = [
    { label: 'Aperte', value: 'OPEN' },
    { label: 'Accolte', value: 'APPROVED' },
    { label: 'Respinte', value: 'REJECTED' },
  ];

  suspensionDays = [1, 3, 7, 30, 365];

  constructor(
    private readonly adminService: AdminService,
    private readonly suspensionAppealsService: SuspensionAppealsService,
    private readonly router: Router
  ) {
    addIcons({
      alertCircleOutline,
      banOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      peopleOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      timeOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadReports();
    this.loadSuspendedUsers();
    this.loadAppeals();
  }

  selectTab(tab: AdminTab): void {
    this.selectedTab = tab;
    this.clearMessages();

    if (tab === 'reports') {
      this.loadReports();
      return;
    }

    if (tab === 'suspended') {
      this.loadSuspendedUsers();
      return;
    }

    this.loadAppeals();
  }

  selectStatus(status: AdminReportStatus): void {
    this.selectedStatus = status;
    this.clearMessages();
    this.loadReports();
  }

  selectAppealStatus(status: SuspensionAppealStatus): void {
    this.selectedAppealStatus = status;
    this.clearMessages();
    this.loadAppeals();
  }

  refresh(): void {
    this.clearMessages();

    if (this.selectedTab === 'reports') {
      this.loadReports();
      return;
    }

    if (this.selectedTab === 'suspended') {
      this.loadSuspendedUsers();
      return;
    }

    this.loadAppeals();
  }

  loadReports(): void {
    this.isLoadingReports = true;
    this.errorMessage = '';

    this.adminService.getReports(this.selectedStatus).subscribe({
      next: (response) => {
        this.isLoadingReports = false;
        this.reports = response.data;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingReports = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare le segnalazioni.';
      },
    });
  }

  loadSuspendedUsers(): void {
    this.isLoadingSuspendedUsers = true;

    this.adminService.getSuspendedUsers().subscribe({
      next: (response) => {
        this.isLoadingSuspendedUsers = false;
        this.suspendedUsers = response.data;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingSuspendedUsers = false;

        if (this.selectedTab === 'suspended') {
          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile caricare gli utenti sospesi.';
        }
      },
    });
  }

  loadAppeals(): void {
    this.isLoadingAppeals = true;
    this.errorMessage = '';

    this.suspensionAppealsService
      .getAdminAppeals(this.selectedAppealStatus)
      .subscribe({
        next: (response) => {
          this.isLoadingAppeals = false;
          this.appeals = response.data;
        },
        error: (error: HttpErrorResponse) => {
          this.isLoadingAppeals = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile caricare le revisioni.';
        },
      });
  }

  ignoreReport(report: AdminReport): void {
    const confirmed = window.confirm(
      'Vuoi ignorare questa segnalazione? Verrà chiusa senza nota admin.'
    );

    if (!confirmed) {
      return;
    }

    this.isActionLoading = true;
    this.clearMessages();

    this.adminService
      .ignoreReport(report.id, {
        adminNote: null,
      })
      .subscribe({
        next: (response) => {
          this.isActionLoading = false;
          this.successMessage = response.message || 'Segnalazione ignorata.';
          this.loadReports();
        },
        error: (error: HttpErrorResponse) => {
          this.isActionLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile ignorare la segnalazione.';
        },
      });
  }

  resolveReport(report: AdminReport): void {
    const adminNote = window.prompt(
      'Spiega perché chiudi questa segnalazione senza sospendere l’utente:',
      'Segnalazione valutata, ma non abbastanza grave da applicare una sospensione.'
    );

    if (adminNote === null) {
      return;
    }

    const cleanedAdminNote = adminNote.trim();

    if (!cleanedAdminNote) {
      this.errorMessage =
        'Per chiudere senza sospensione devi inserire una motivazione.';
      this.successMessage = '';
      return;
    }

    const confirmed = window.confirm(
      'Vuoi chiudere questa segnalazione senza sospensione?'
    );

    if (!confirmed) {
      return;
    }

    this.isActionLoading = true;
    this.clearMessages();

    this.adminService
      .resolveReport(report.id, {
        adminNote: cleanedAdminNote,
      })
      .subscribe({
        next: (response) => {
          this.isActionLoading = false;
          this.successMessage =
            response.message || 'Segnalazione chiusa senza sospensione.';
          this.loadReports();
        },
        error: (error: HttpErrorResponse) => {
          this.isActionLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile chiudere la segnalazione.';
        },
      });
  }

  suspendFromReport(report: AdminReport, days: number): void {
    const reportedName = this.getUserName(report.reportedUser);

    const adminNote = window.prompt(
      `Nota/motivo sospensione per ${reportedName}:`,
      this.getReasonLabel(report.reason)
    );

    if (adminNote === null) {
      return;
    }

    const confirmed = window.confirm(
      `Vuoi sospendere ${reportedName} dalle partite per ${days} giorni?`
    );

    if (!confirmed) {
      return;
    }

    this.isActionLoading = true;
    this.clearMessages();

    this.adminService
      .suspendUserFromReport(report.id, {
        days,
        adminNote: adminNote.trim() || null,
      })
      .subscribe({
        next: (response) => {
          this.isActionLoading = false;

          this.successMessage =
            response.message ||
            `Utente sospeso dalle partite per ${days} giorni.`;

          this.loadReports();
          this.loadSuspendedUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.isActionLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile sospendere l’utente.';
        },
      });
  }

  rejectAppeal(appeal: SuspensionAppeal): void {
    const adminNote = window.prompt(
      'Spiega perché respingi questa richiesta di revisione:',
      'La sospensione è stata rivalutata e resta confermata.'
    );

    if (adminNote === null) {
      return;
    }

    const cleanedAdminNote = adminNote.trim();

    if (!cleanedAdminNote) {
      this.errorMessage =
        'Per respingere una revisione devi inserire una motivazione.';
      this.successMessage = '';
      return;
    }

    const confirmed = window.confirm(
      `Vuoi respingere la revisione di ${this.getAppealUserName(
        appeal.user
      )}?`
    );

    if (!confirmed) {
      return;
    }

    this.isActionLoading = true;
    this.clearMessages();

    this.suspensionAppealsService
      .rejectAppeal(appeal.id, {
        adminNote: cleanedAdminNote,
      })
      .subscribe({
        next: (response) => {
          this.isActionLoading = false;
          this.successMessage =
            response.message || 'Revisione respinta. Utente notificato.';
          this.loadAppeals();
        },
        error: (error: HttpErrorResponse) => {
          this.isActionLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile respingere la revisione.';
        },
      });
  }

  approveAppeal(appeal: SuspensionAppeal): void {
    const adminNote = window.prompt(
      'Spiega perché accogli questa richiesta di revisione:',
      'Revisione accolta: la sospensione viene rimossa.'
    );

    if (adminNote === null) {
      return;
    }

    const cleanedAdminNote = adminNote.trim();

    if (!cleanedAdminNote) {
      this.errorMessage =
        'Per accogliere una revisione devi inserire una motivazione.';
      this.successMessage = '';
      return;
    }

    const confirmed = window.confirm(
      `Vuoi accogliere la revisione di ${this.getAppealUserName(
        appeal.user
      )} e rimuovere la sospensione?`
    );

    if (!confirmed) {
      return;
    }

    this.isActionLoading = true;
    this.clearMessages();

    this.suspensionAppealsService
      .approveAppeal(appeal.id, {
        adminNote: cleanedAdminNote,
      })
      .subscribe({
        next: (response) => {
          this.isActionLoading = false;
          this.successMessage =
            response.message ||
            'Revisione accolta. Sospensione rimossa e utente notificato.';

          this.loadAppeals();
          this.loadSuspendedUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.isActionLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile accogliere la revisione.';
        },
      });
  }

  unsuspendUser(user: SuspendedUser): void {
    const adminNote = window.prompt(
      `Nota facoltativa per rimuovere la sospensione di ${
        user.name || user.email
      }:`,
      ''
    );

    if (adminNote === null) {
      return;
    }

    const confirmed = window.confirm(
      `Vuoi rimuovere la sospensione a ${user.name || user.email}?`
    );

    if (!confirmed) {
      return;
    }

    this.isActionLoading = true;
    this.clearMessages();

    this.adminService
      .unsuspendUser(user.id, {
        adminNote: adminNote.trim() || null,
      })
      .subscribe({
        next: (response) => {
          this.isActionLoading = false;
          this.successMessage = response.message || 'Sospensione rimossa.';
          this.loadSuspendedUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.isActionLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile rimuovere la sospensione.';
        },
      });
  }

  goToApp(): void {
    this.router.navigate(['/tabs/profile']);
  }

  getReasonLabel(reason?: string): string {
    const labels: Record<string, string> = {
      OFFENSIVE_BEHAVIOR: 'Comportamento offensivo',
      THREATS_AGGRESSION: 'Minacce o aggressività',
      DISCRIMINATION: 'Discriminazione',
      HARASSMENT: 'Molestie',
      SERIOUS_UNSPORTSMANLIKE: 'Comportamento antisportivo grave',
      PROPERTY_DAMAGE: 'Danni alla struttura',
      OTHER: 'Altro',
    };

    return labels[reason || ''] || reason || 'Motivo non indicato';
  }

  getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      OPEN: 'Aperta',
      RESOLVED: 'Chiusa senza sospensione',
      IGNORED: 'Ignorata',
    };

    return labels[status || ''] || status || 'N/D';
  }

  getAppealStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      OPEN: 'Aperta',
      APPROVED: 'Accolta',
      REJECTED: 'Respinta',
    };

    return labels[status || ''] || status || 'N/D';
  }

  getUserName(user?: { name: string | null; email: string }): string {
    if (!user) {
      return 'Utente non disponibile';
    }

    return user.name || user.email;
  }

  getAppealUserName(user?: { name: string | null; email: string }): string {
    if (!user) {
      return 'Utente non disponibile';
    }

    return user.name || user.email;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'N/D';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'N/D';
    }

    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMatchDate(value?: string | null): string {
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

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}