import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  optionsOutline,
  footballOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-premium',
  templateUrl: './premium.page.html',
  styleUrls: ['./premium.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class PremiumPage {
  isPremium = false;
  isLoading = false;
  isActivating = false;

  successMessage = '';
  errorMessage = '';

  benefits = [
    {
      icon: 'shield-checkmark-outline',
      title: 'Filtro “Solo utenti affidabili”',
      description: 'Limita l’iscrizione agli utenti con alta affidabilità.',
    },
    {
      icon: 'options-outline',
      title: 'Maggiore controllo sulle iscrizioni',
      description: 'Scegli regole avanzate per gestire chi può partecipare.',
    },
    {
      icon: 'football-outline',
      title: 'Partite più sicure',
      description: 'Riduci assenze e comportamenti poco affidabili.',
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly usersService: UsersService
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      shieldCheckmarkOutline,
      optionsOutline,
      footballOutline,
      sparklesOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadPremiumStatus();
  }

  goBack(): void {
    this.router.navigate(['/tabs/profile']);
  }

  loadPremiumStatus(): void {
    this.clearMessages();
    this.isLoading = true;

    this.usersService.getMe().subscribe({
      next: (response) => {
        this.isPremium = response.data.user.isPremium;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message || 'Impossibile caricare lo stato Premium.';
      },
    });
  }

  activatePremium(): void {
    if (this.isActivating || this.isPremium) {
      return;
    }

    this.clearMessages();
    this.isActivating = true;

    this.usersService.activatePremium().subscribe({
      next: (response) => {
        this.isPremium = response.data.user.isPremium;
        this.isActivating = false;
        this.successMessage = 'Premium attivato correttamente.';
      },
      error: (error: HttpErrorResponse) => {
        this.isActivating = false;
        this.errorMessage =
          error.error?.message || 'Impossibile attivare Premium.';
      },
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}