import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline } from 'ionicons/icons';

import { MatchCardData } from '../../models/match-card.model';

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
})
export class MatchCardComponent {
  @Input({ required: true }) match!: MatchCardData;

  @Output() cardClick = new EventEmitter<number>();

  constructor() {
    addIcons({
      locationOutline,
    });
  }

  onCardClick(): void {
    this.cardClick.emit(this.match.id);
  }
}