import { Component, OnInit } from '@angular/core';
import {
  AnalyticsService,
  BottleneckAnalysis,
  DashboardData,
  JarvisResponse,
} from '../Analytics/service/analytics.service';

import { NgApexchartsModule } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  public chartFuncionarios: any;
  public chartPoliticas: any;

  public jarvisData: JarvisResponse | null = null;
  public jarvisMessage = '';
  public anomaliesDetected: any[] = [];
  public isScanning = false;

  public bottleneckAnalysis: BottleneckAnalysis | null = null;
  public isLoadingBottlenecks = false;

  constructor(private readonly analyticsService: AnalyticsService) {
    this.initEmptyCharts();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadBottlenecks();
  }

  initEmptyCharts(): void {
    this.chartFuncionarios = {
      series: [{ name: 'Tareas Completadas', data: [] }],
      chart: {
        type: 'bar',
        height: 350,
        foreColor: '#a1a1aa',
        toolbar: { show: false },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories: [] },
      colors: ['#10b981'],
      theme: { mode: 'dark' },
    };

    this.chartPoliticas = {
      series: [],
      chart: { type: 'donut', height: 350, foreColor: '#a1a1aa' },
      labels: [],
      colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      stroke: { width: 0 },
      theme: { mode: 'dark' },
    };
  }

  loadData(): void {
    this.analyticsService.getDashboardData().subscribe({
      next: (data: DashboardData) => {
        const funcNames = data.topOfficials.map((item) => item.name);
        const funcCounts = data.topOfficials.map((item) => item.count);

        this.chartFuncionarios = {
          ...this.chartFuncionarios,
          xaxis: {
            ...this.chartFuncionarios.xaxis,
            categories: funcNames,
          },
          series: [{ name: 'Tareas Completadas', data: funcCounts }],
        };

        const polNames = data.volumeByPolicy.map((item) => item.name);
        const polCounts = data.volumeByPolicy.map((item) => item.count);

        this.chartPoliticas = {
          ...this.chartPoliticas,
          labels: polNames,
          series: polCounts,
        };
      },
      error: (err) => {
        console.error('Error cargando analítica:', err);
      },
    });
  }

  loadBottlenecks(): void {
    this.isLoadingBottlenecks = true;

    this.analyticsService.getSimpleBottlenecks().subscribe({
      next: (analysis) => {
        this.bottleneckAnalysis = analysis;
        this.isLoadingBottlenecks = false;
      },
      error: (err) => {
        console.error('Error cargando cuellos de botella:', err);
        this.isLoadingBottlenecks = false;
      },
    });
  }

  private normalizeJarvisData(raw: any): JarvisResponse {
    const data = raw.analisis_rendimiento || raw.informe_rendimiento || {};

    return {
      analisis_rendimiento: {
        asistente: data.asistente || 'Jarvis',
        cuello_de_botella:
          data.cuello_de_botella ||
          data.cuellos_de_botella ||
          'Sin anomalías detectadas.',
        reconocimiento:
          data.reconocimiento ||
          data.reconocimientos ||
          'Buen trabajo del equipo.',
        sugerencias_mejora: data.sugerencias_mejora || [],
        estado_sistema:
          data.estado_sistema ||
          data.nota_final ||
          'Sistema estable.',
        estabilidad_confirmada: data.estabilidad_confirmada,
      },
    };
  }

  runJarvisAudit(): void {
    this.isScanning = true;
    this.anomaliesDetected = [];
    this.jarvisMessage = '';

    this.analyticsService.getRecentTasks().subscribe({
      next: (tasks) => {
        this.analyticsService.getJarvisAnalysis(tasks).subscribe({
          next: (res) => {
            this.isScanning = false;

            try {
              const cleaned = res.jarvis_speech
                .replace(/```json|```/g, '')
                .trim();

              const parsed = JSON.parse(cleaned);
              this.jarvisData = this.normalizeJarvisData(parsed);
            } catch (e) {
              console.error('Error de parseo:', e);
              this.jarvisMessage = 'Jarvis respondió, pero no se pudo interpretar el JSON.';
            }
          },
          error: (err) => {
            this.isScanning = false;
            console.error('Error consultando Jarvis:', err);
          },
        });
      },
      error: (err) => {
        this.isScanning = false;
        console.error('Error obteniendo tareas para Jarvis:', err);
      },
    });
  }

  getBottleneckStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      NORMAL: 'Normal',
      WARNING: 'Advertencia',
      RISK: 'Riesgo',
    };

    return labels[status] || status;
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    };

    return labels[severity] || severity;
  }
}