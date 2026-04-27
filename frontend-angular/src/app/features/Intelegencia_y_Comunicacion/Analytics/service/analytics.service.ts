import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface ChartItem {
  name: string;
  count: number;
}

export interface DashboardData {
  topOfficials: ChartItem[];
  volumeByPolicy: ChartItem[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  // Ajusta esta URL a la de tu backend de Spring Boot
  private apiUrl = `${environment.apiUrl}/analytics`; 
  private iaApiUrl = `${environment.iaApiUrl}`

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`);
  }

  // Este lo usaremos pronto para enviarle los datos a Jarvis
  getRecentTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent-tasks`);
  }


  getJarvisAnalysis(bitacora: any[]): Observable<any> {
    return this.http.post(`${this.iaApiUrl}/jarvis/analisis`, bitacora);
  }
}