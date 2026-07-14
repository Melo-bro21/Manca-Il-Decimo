import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  chevronForwardOutline,
  exitOutline,
  locationOutline,
  notificationsOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  walletOutline,
  walkOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/services/auth.service';
import {
  PreferredRole,
  UsersService,
} from '../../core/services/users.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { WalletService } from '../../core/services/wallet.service';
import {
  MySuspensionAppealStatus,
  SuspensionAppealsService,
} from '../../core/services/suspension-appeals.service';

interface ProfileUser {
  name: string;
  location: string;
  role: string;
  reliabilityScore: number;
  walletBalance: number;
  preferredRole: PreferredRole | null;
  isPremium: boolean;
  notificationsCount: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class ProfilePage {
  user: ProfileUser = {
    name: '',
    location: 'Milano',
    role: 'USER',
    reliabilityScore: 100,
    walletBalance: 0,
    preferredRole: null,
    isPremium: false,
    notificationsCount: 0,
  };

  suspensionStatus: MySuspensionAppealStatus | null = null;

  isLoadingProfile = false;
  isSubmittingAppeal = false;

  errorMessage = '';
  appealErrorMessage = '';
  appealSuccessMessage = '';

  showAppealForm = false;
  appealMessage = '';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly walletService: WalletService,
    private readonly suspensionAppealsService: SuspensionAppealsService
  ) {
    addIcons({
      alertCircleOutline,
      chevronForwardOutline,
      exitOutline,
      locationOutline,
      notificationsOutline,
      settingsOutline,
      shieldCheckmarkOutline,
      walletOutline,
      walkOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadProfile();
  }

  get userInitials(): string {
    const name = this.user.name || 'Utente';

    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  get reliabilityLabel(): string {
    const score = this.user.reliabilityScore;

    if (score >= 90) {
      return 'Utente affidabile';
    }

    if (score >= 70) {
      return 'Buona affidabilità';
    }

    if (score >= 50) {
      return 'Affidabilità media';
    }

    return 'Affidabilità bassa';
  }

  get preferredRoleLabel(): string {
    switch (this.user.preferredRole) {
      case 'PORTIERE':
        return 'Portiere';

      case 'DIFENSORE':
        return 'Difensore';

      case 'CENTROCAMPISTA':
        return 'Centrocampista';

      case 'ATTACCANTE':
        return 'Attaccante';

      default:
        return 'Non impostato';
    }
  }

  get isAdmin(): boolean {
    return this.user.role === 'ADMIN';
  }

  get isSuspended(): boolean {
    return Boolean(this.suspensionStatus?.suspended);
  }

  get hasOpenAppeal(): boolean {
    return Boolean(this.suspensionStatus?.openAppeal);
  }

  get canRequestAppeal(): boolean {
    return Boolean(this.suspensionStatus?.canRequestAppeal);
  }

  loadProfile(): void {
    this.errorMessage = '';
    this.appealErrorMessage = '';
    this.appealSuccessMessage = '';
    this.isLoadingProfile = true;

    forkJoin({
      me: this.usersService.getMe(),
      unreadNotifications: this.notificationsService.getMyUnreadCount(),
      wallet: this.walletService.getMyWallet(),
      suspensionStatus: this.suspensionAppealsService.getMyStatus(),
    }).subscribe({
      next: ({ me, unreadNotifications, wallet, suspensionStatus }) => {
        const user = me.data.user;

        this.user = {
          name: user.name ?? 'Utente',
          location: 'Milano',
          role: user.role,
          reliabilityScore: user.reliabilityScore,
          walletBalance: wallet.wallet.balance,
          preferredRole: user.preferredRole,
          isPremium: user.isPremium,
          notificationsCount: unreadNotifications.data.unreadCount,
        };

        this.suspensionStatus = suspensionStatus.data;

        this.isLoadingProfile = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingProfile = false;

        this.errorMessage =
          error.error?.message || 'Impossibile caricare il profilo.';
      },
    });
  }

  formatBalance(value: number): string {
    return `${value.toFixed(2).replace('.', ',')}€`;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Data non disponibile';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Data non disponibile';
    }

    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  openAppealForm(): void {
    this.showAppealForm = true;
    this.appealErrorMessage = '';
    this.appealSuccessMessage = '';
  }

  closeAppealForm(): void {
    this.showAppealForm = false;
    this.appealMessage = '';
    this.appealErrorMessage = '';
  }

  submitAppeal(): void {
    if (this.isSubmittingAppeal) {
      return;
    }

    const cleanedMessage = this.appealMessage.trim();

    this.appealErrorMessage = '';
    this.appealSuccessMessage = '';

    if (!cleanedMessage) {
      this.appealErrorMessage =
        'Inserisci una motivazione per chiedere la revisione.';
      return;
    }

    const confirmed = window.confirm(
      'Vuoi inviare questa richiesta di revisione all’admin?'
    );

    if (!confirmed) {
      return;
    }

    this.isSubmittingAppeal = true;

    this.suspensionAppealsService
      .createAppeal({
        message: cleanedMessage,
      })
      .subscribe({
        next: (response) => {
          this.isSubmittingAppeal = false;
          this.appealSuccessMessage =
            response.message ||
            'Richiesta di revisione inviata. Un admin la valuterà.';

          this.showAppealForm = false;
          this.appealMessage = '';

          this.loadProfile();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmittingAppeal = false;

          this.appealErrorMessage =
            error.error?.message ||
            'Non è stato possibile inviare la richiesta di revisione.';
        },
      });
  }

  openNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  openAccountSettings(): void {
    this.router.navigate(['/account-settings']);
  }

  openPreferredRoleSettings(): void {
    this.router.navigate(['/account-settings'], {
      queryParams: {
        focus: 'preferredRole',
      },
    });
  }

  openPremium(): void {
    this.router.navigate(['/premium']);
  }

  openWallet(): void {
    this.router.navigate(['/wallet']);
  }

  openAdminDashboard(): void {
    this.router.navigate(['/admin']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/welcome']);
  }
}