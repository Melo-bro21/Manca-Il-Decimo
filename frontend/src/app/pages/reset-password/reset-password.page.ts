import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  eyeOutline,
  lockClosedOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
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
export class ResetPasswordPage {
  token = '';
  newPassword = '';
  confirmPassword = '';

  passwordInputType: 'password' | 'text' = 'password';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
    addIcons({
      arrowBackOutline,
      eyeOutline,
      lockClosedOutline,
    });

    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.errorMessage =
        'Link di recupero non valido o mancante. Richiedi un nuovo link.';
    }
  }

  get hasValidToken(): boolean {
    return Boolean(this.token.trim());
  }

  togglePasswordVisibility(): void {
    this.passwordInputType =
      this.passwordInputType === 'password' ? 'text' : 'password';
  }

  resetPassword(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const token = this.token.trim();

    if (!token) {
      this.errorMessage =
        'Link di recupero non valido o mancante. Richiedi un nuovo link.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage = 'La nuova password deve contenere almeno 8 caratteri.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Le password non coincidono.';
      return;
    }

    this.isLoading = true;

    this.authService
      .resetPassword({
        token,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;

          this.successMessage =
            'Password aggiornata correttamente. Ora puoi effettuare il login.';

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1400);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile aggiornare la password.';
        },
      });
  }
}