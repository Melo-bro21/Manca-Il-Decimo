import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  callOutline,
  footballOutline,
  homeOutline,
  locationOutline,
  mailOutline,
  peopleOutline,
  searchOutline,
  sunnyOutline,
} from 'ionicons/icons';

import {
  SportsCenter,
  SportsCentersService,
} from '../../core/services/sports-centers.service';

interface SportCenterView extends SportsCenter {
  zone: string;
  email: string;
  imageUrl: string;
  tags: string[];
}

@Component({
  selector: 'app-find-field',
  templateUrl: './find-field.page.html',
  styleUrls: ['./find-field.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
  ],
})
export class FindFieldPage {
  searchTerm = '';
  selectedFilter = 'Più vicini';

  filters = ['Più vicini', 'Indoor', 'Outdoor', '5vs5', '6vs6', '7vs7'];

  sportCenters: SportCenterView[] = [];

 expandedCenterIds: number[] = [];

  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly router: Router,
    private readonly sportsCentersService: SportsCentersService
  ) {
    addIcons({
      callOutline,
      footballOutline,
      homeOutline,
      locationOutline,
      mailOutline,
      peopleOutline,
      searchOutline,
      sunnyOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadSportsCenters();
  }

  get filteredSportCenters(): SportCenterView[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    return this.sportCenters
      .filter((center) => {
        const matchesSearch =
          !normalizedSearch ||
          center.name.toLowerCase().includes(normalizedSearch) ||
          center.address.toLowerCase().includes(normalizedSearch) ||
          center.city.toLowerCase().includes(normalizedSearch) ||
          center.zone.toLowerCase().includes(normalizedSearch);

        const matchesFilter =
          this.selectedFilter === 'Più vicini' ||
          center.tags.includes(this.selectedFilter);

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  loadSportsCenters(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.sportsCentersService.getSportsCenters().subscribe({
      next: (response) => {
        this.sportCenters = response.data.map((center) =>
          this.mapSportsCenterToView(center)
        );

        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare i centri sportivi.';
      },
    });
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
  }

viewFields(center: SportCenterView): void {
  if (this.expandedCenterIds.includes(center.id)) {
    this.expandedCenterIds = this.expandedCenterIds.filter(
      (id) => id !== center.id
    );
    return;
  }

  this.expandedCenterIds = [...this.expandedCenterIds, center.id];
}

isCenterExpanded(center: SportCenterView): boolean {
  return this.expandedCenterIds.includes(center.id);
}

  useForCreateMatch(center: SportCenterView): void {
    console.log('Usa centro per creare partita:', center);

    this.router.navigate(['/tabs/create-match']);
  }

  contactCenter(center: SportCenterView): void {
    console.log('Contatta centro:', center);
  }

  getFilterIcon(filter: string): string {
    if (filter === 'Più vicini') {
      return 'location-outline';
    }

    if (filter === 'Indoor') {
      return 'home-outline';
    }

    if (filter === 'Outdoor') {
      return 'sunny-outline';
    }

    return 'people-outline';
  }

  getTagIcon(tag: string): string {
    if (tag === 'Indoor') {
      return 'home-outline';
    }

    if (tag === 'Outdoor') {
      return 'sunny-outline';
    }

    if (tag === '5vs5' || tag === '6vs6' || tag === '7vs7') {
      return 'people-outline';
    }

    return 'football-outline';
  }

  getFieldIndoorLabel(indoor: boolean): string {
    return indoor ? 'Indoor' : 'Outdoor';
  }

  getNormalizedFieldSize(size: string): string {
    const normalizedSize = size.trim().toLowerCase();

    if (normalizedSize === '5v5' || normalizedSize === '5vs5') {
      return '5vs5';
    }

    if (normalizedSize === '6v6' || normalizedSize === '6vs6') {
      return '6vs6';
    }

    if (normalizedSize === '7v7' || normalizedSize === '7vs7') {
      return '7vs7';
    }

    return size;
  }

  private mapSportsCenterToView(center: SportsCenter): SportCenterView {
    return {
      ...center,
      zone: center.city,
      email: this.buildFakeEmail(center.name),
      imageUrl: 'assets/welcome-football-bg.png',
      tags: this.buildTags(center),
    };
  }

  private buildTags(center: SportsCenter): string[] {
    const tags = new Set<string>();

    for (const field of center.fields) {
      tags.add(field.indoor ? 'Indoor' : 'Outdoor');
      tags.add(this.getNormalizedFieldSize(field.size));
    }

    return Array.from(tags);
  }

  private buildFakeEmail(name: string): string {
    const normalizedName = name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/à/g, 'a')
      .replace(/è/g, 'e')
      .replace(/é/g, 'e')
      .replace(/ì/g, 'i')
      .replace(/ò/g, 'o')
      .replace(/ù/g, 'u');

    return `info@${normalizedName}.it`;
  }
}