import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  mailOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonInput,
    IonIcon,
  ],
})
export class ForgotPasswordPage {
  email = '';

  isLoading = false;

  errorMessage = '';
  successMessage = '';

  constructor(private readonly authService: AuthService) {
    addIcons({
      arrowBackOutline,
      mailOutline,
    });
  }

  requestResetLink(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const email = this.email.trim();

    if (!email) {
      this.errorMessage = 'Inserisci la tua email.';
      return;
    }

    this.isLoading = true;

    this.authService.forgotPassword({ email }).subscribe({
      next: () => {
        this.isLoading = false;

        this.successMessage =
          'Se l’email è registrata, ti abbiamo inviato un link per reimpostare la password. Controlla anche Spam e Promozioni.';
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile inviare il link di recupero.';
      },
    });
  }
}