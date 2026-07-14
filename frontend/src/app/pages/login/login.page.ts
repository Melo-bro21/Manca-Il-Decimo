import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonInput,
  IonIcon,
} from '@ionic/angular/standalone';

import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonInput,
    IonIcon,
    RouterLink,
  ],
})
export class LoginPage {
  email = '';
  password = '';

  passwordInputType: 'password' | 'text' = 'password';

  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    addIcons({
      arrowBackOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
    });
  }

  togglePasswordVisibility(): void {
    this.passwordInputType =
      this.passwordInputType === 'password' ? 'text' : 'password';
  }

  onLogin(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Inserisci email e password.';
      return;
    }

    this.isLoading = true;

    this.authService
      .login({
        email: this.email.trim(),
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigateByUrl('/tabs/home', {
            replaceUrl: true,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Login non riuscito. Controlla le credenziali.';
        },
      });
  }

  continueAsGuest(): void {
    this.authService.logout();

    this.router.navigateByUrl('/tabs/home', {
      replaceUrl: true,
    });
  }
}