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

export interface BottleneckItem {
  type: string;
  severity: string;

  policyName: string;
  nodeName: string;

  taskCount: number;
  averageDurationMinutes: number;
  maxDurationMinutes: number;

  message: string;
  recommendation: string;
}

export interface BottleneckAnalysis {
  generatedAt: string;

  totalTasksAnalyzed: number;
  averageDurationMinutes: number;

  totalBottlenecks: number;
  generalStatus: string;

  bottlenecks: BottleneckItem[];
}

export interface JarvisPerformanceAnalysis {
  asistente: string;
  cuello_de_botella: string;
  reconocimiento: string;
  sugerencias_mejora: string[];
  estado_sistema: string;
  estabilidad_confirmada?: string;
}

export interface JarvisResponse {
  analisis_rendimiento?: JarvisPerformanceAnalysis;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private apiUrl = `${environment.apiUrl}/analytics`;
  private iaApiUrl = `${environment.iaApiUrl}`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`);
  }

  getRecentTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent-tasks`);
  }

  getJarvisAnalysis(bitacora: any[]): Observable<any> {
    return this.http.post(`${this.iaApiUrl}/jarvis/analisis`, bitacora);
  }

  getSimpleBottlenecks(): Observable<BottleneckAnalysis> {
    return this.http.get<BottleneckAnalysis>(`${this.apiUrl}/bottlenecks/simple`);
  }
}