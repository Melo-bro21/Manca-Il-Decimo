import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import {
  IonContent,
  IonButton,
  IonInput,
  IonIcon,
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  personOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  passwordInputType: 'password' | 'text' = 'password';
  confirmPasswordInputType: 'password' | 'text' = 'password';

  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({
      arrowBackOutline,
      personOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
    });
  }

  togglePasswordVisibility(): void {
    this.passwordInputType =
      this.passwordInputType === 'password' ? 'text' : 'password';
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordInputType =
      this.confirmPasswordInputType === 'password' ? 'text' : 'password';
  }

  onRegister(): void {
  if (this.isLoading) {
    return;
  }

  this.errorMessage = '';

  if (
    !this.name.trim() ||
    !this.email.trim() ||
    !this.password.trim() ||
    !this.confirmPassword.trim()
  ) {
    this.errorMessage = 'Compila tutti i campi.';
    return;
  }

  if (this.password !== this.confirmPassword) {
    this.errorMessage = 'Le password non coincidono.';
    return;
  }

   if (this.password.length < 8) {
    this.errorMessage = 'La password deve contenere almeno 8 caratteri.';
    return;
  }

  this.isLoading = true;

  this.authService
    .register({
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
    })
    .subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/tabs/home');
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Registrazione non riuscita. Controlla i dati e riprova.';
      },
    });
}
}