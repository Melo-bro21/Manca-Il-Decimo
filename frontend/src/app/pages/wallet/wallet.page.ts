import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  bagHandleOutline,
  receiptOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  WalletService,
  WalletTransaction,
} from '../../core/services/wallet.service';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
  ],
})
export class WalletPage {
  currentBalance = 0;

  transactions: WalletTransaction[] = [];

  topUpOptions = [5, 10, 20, 50];

  isLoadingWallet = false;
  isTopUpLoading = false;

  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly router: Router,
    private readonly walletService: WalletService
  ) {
    addIcons({
      addOutline,
      arrowBackOutline,
      bagHandleOutline,
      receiptOutline,
      walletOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadWallet();
  }

  goBack(): void {
    this.router.navigate(['/tabs/profile']);
  }

  loadWallet(): void {
    this.clearMessages();
    this.isLoadingWallet = true;

    forkJoin({
      wallet: this.walletService.getMyWallet(),
      transactions: this.walletService.getMyTransactions(),
    }).subscribe({
      next: ({ wallet, transactions }) => {
        this.currentBalance = wallet.wallet.balance;
        this.transactions = transactions.transactions;
        this.isLoadingWallet = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingWallet = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare il wallet.';
      },
    });
  }

  topUp(amount: number): void {
    if (this.isTopUpLoading) {
      return;
    }

    this.clearMessages();
    this.isTopUpLoading = true;

    this.walletService.topUpWallet(amount).subscribe({
      next: () => {
        this.isTopUpLoading = false;
        this.successMessage = `Ricarica demo da ${this.formatBalance(amount)} completata.`;
        this.loadWallet();
      },
      error: (error: HttpErrorResponse) => {
        this.isTopUpLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile effettuare la ricarica demo.';
      },
    });
  }

  formatAmount(amount: number): string {
    const sign = amount > 0 ? '+' : '';

    return `${sign}${amount.toFixed(2).replace('.', ',')}€`;
  }

  formatBalance(balance: number): string {
    return `${balance.toFixed(2).replace('.', ',')}€`;
  }

  formatTransactionDate(createdAt: string): string {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
    });
  }

  getTransactionTitle(transaction: WalletTransaction): string {
    switch (transaction.type) {
      case 'TOP_UP':
        return 'Ricarica demo';

      case 'PAYMENT':
        return 'Pagamento partita';

      case 'REFUND':
        return 'Rimborso';

      case 'PENALTY':
        return 'Penalità';

      default:
        return 'Movimento wallet';
    }
  }

  getTransactionSubtitle(transaction: WalletTransaction): string {
    return transaction.reason || 'Movimento registrato nel wallet';
  }

  isPositiveTransaction(transaction: WalletTransaction): boolean {
    return transaction.amount > 0;
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}