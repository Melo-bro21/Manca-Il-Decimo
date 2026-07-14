import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowBackOutline,
  cashOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  footballOutline,
  personAddOutline,
  shieldCheckmarkOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';

import {
  AppBackendNotification,
  NotificationsService,
} from '../../core/services/notifications.service';

type NotificationViewType =
  | 'booking-confirmed'
  | 'match-reminder'
  | 'deposit-refund'
  | 'attendance-confirmed'
  | 'penalty'
  | 'join-request'
  | 'late-cancel'
  | 'suspension'
  | 'unsuspended'
  | 'generic';

interface AppNotification {
  id: number;
  backendType: string;
  groupLabel: string;
  type: NotificationViewType;
  title: string;
  message: string;
  timeLabel: string;
  isRead: boolean;
  matchId?: number | null;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class NotificationsPage {
  isLoading = false;
  errorMessage = '';

  notifications: AppNotification[] = [];

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    private readonly notificationsService: NotificationsService
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      footballOutline,
      cashOutline,
      shieldCheckmarkOutline,
      alertCircleOutline,
      warningOutline,
      timeOutline,
      personAddOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadNotifications();
  }

  get hasNotifications(): boolean {
    return this.notifications.length > 0;
  }

  get hasUnreadNotifications(): boolean {
    return this.notifications.some((notification) => !notification.isRead);
  }

  get groupedNotifications(): { groupLabel: string; items: AppNotification[] }[] {
    const groups: { groupLabel: string; items: AppNotification[] }[] = [];

    for (const notification of this.notifications) {
      const existingGroup = groups.find(
        (group) => group.groupLabel === notification.groupLabel
      );

      if (existingGroup) {
        existingGroup.items.push(notification);
      } else {
        groups.push({
          groupLabel: notification.groupLabel,
          items: [notification],
        });
      }
    }

    return groups;
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigateByUrl('/tabs/profile');
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationsService.getMyNotifications().subscribe({
      next: (response) => {
        this.notifications = response.data.map((notification) =>
          this.mapBackendNotification(notification)
        );

        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare le notifiche.';
      },
    });
  }

  markAllAsRead(): void {
    if (!this.hasUnreadNotifications || this.isLoading) {
      return;
    }

    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((notification) => ({
          ...notification,
          isRead: true,
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile segnare tutte le notifiche come lette.';
      },
    });
  }

  openNotification(notification: AppNotification): void {
    if (!notification.isRead) {
      this.markOneAsReadLocally(notification.id);

      this.notificationsService.markAsRead(notification.id).subscribe({
        error: () => {

        },
      });
    }

    if (notification.backendType === 'LATE_CANCELLATION_CREATED') {
      return;
    }

    if (!notification.matchId) {
      return;
    }

    if (notification.backendType === 'JOIN_REQUEST_RECEIVED') {
      this.router.navigate(['/matches', notification.matchId, 'requests']);
      return;
    }

    this.router.navigate(['/matches', notification.matchId]);
  }

  isLateCancellationNotification(notification: AppNotification): boolean {
    return notification.backendType === 'LATE_CANCELLATION_CREATED';
  }

  getIconName(type: NotificationViewType): string {
    switch (type) {
      case 'booking-confirmed':
        return 'checkmark-circle-outline';

      case 'match-reminder':
        return 'football-outline';

      case 'deposit-refund':
        return 'cash-outline';

      case 'attendance-confirmed':
        return 'shield-checkmark-outline';

      case 'penalty':
        return 'alert-circle-outline';

      case 'join-request':
        return 'person-add-outline';

      case 'late-cancel':
        return 'warning-outline';

      case 'suspension':
        return 'warning-outline';

      case 'unsuspended':
        return 'close-circle-outline';

      default:
        return 'time-outline';
    }
  }

  getIconClass(type: NotificationViewType): string {
    return `notification-icon-${type}`;
  }

  private markOneAsReadLocally(notificationId: number): void {
    this.notifications = this.notifications.map((notification) => {
      if (notification.id !== notificationId) {
        return notification;
      }

      return {
        ...notification,
        isRead: true,
      };
    });
  }

  private mapBackendNotification(
    notification: AppBackendNotification
  ): AppNotification {
    return {
      id: notification.id,
      backendType: notification.type,
      groupLabel: this.getGroupLabel(notification.createdAt),
      type: this.mapNotificationType(notification.type),
      title: notification.title,
      message: this.buildMessage(notification),
      timeLabel: this.formatTimeLabel(notification.createdAt),
      isRead: notification.read,
      matchId: notification.matchId || notification.match?.id || null,
    };
  }

  private mapNotificationType(type: string): NotificationViewType {
    if (
      type === 'BOOKING_CONFIRMED' ||
      type === 'JOIN_REQUEST_APPROVED'
    ) {
      return 'booking-confirmed';
    }

    if (
      type === 'JOIN_REQUEST_RECEIVED' ||
      type === 'JOIN_REQUEST_REJECTED'
    ) {
      return 'join-request';
    }

    if (
      type === 'MATCH_NEW_BOOKING' ||
      type === 'MATCH_FULL' ||
      type === 'MATCH_CANCELLED'
    ) {
      return 'match-reminder';
    }

    if (
      type === 'WAITLIST_JOINED' ||
      type === 'MATCH_NEW_WAITLIST_ENTRY'
    ) {
      return 'attendance-confirmed';
    }

    if (
      type === 'PENALTY_RECEIVED' ||
      type === 'REPORT_ACCEPTED'
    ) {
      return 'penalty';
    }

    if (type === 'LATE_CANCELLATION_CREATED') {
      return 'late-cancel';
    }

    if (type === 'ACCOUNT_SUSPENDED') {
      return 'suspension';
    }

    if (type === 'ACCOUNT_UNSUSPENDED') {
      return 'unsuspended';
    }

    if (type === 'DEPOSIT_REFUNDED') {
      return 'deposit-refund';
    }

    return 'generic';
  }

  private buildMessage(notification: AppBackendNotification): string {
    if (notification.type === 'LATE_CANCELLATION_CREATED') {
      return notification.message;
    }

    if (notification.match?.title) {
      return `${notification.message} · ${notification.match.title}`;
    }

    return notification.message;
  }

  private getGroupLabel(createdAt: string): string {
    const date = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Oggi';
    }

    if (this.isSameDay(date, yesterday)) {
      return 'Ieri';
    }

    return 'Questa settimana';
  }

  private formatTimeLabel(createdAt: string): string {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (this.isSameDay(date, yesterday)) {
      return `ieri, ${date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  }

  private isSameDay(firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  }
}