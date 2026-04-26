import { Component, OnInit } from '@angular/core';
import { AnalyticsService, DashboardData } from '../Analytics/service/analytics.service';
import { NgApexchartsModule } from 'ng-apexcharts'; // 👈 1. Importar esto
import { CommonModule } from '@angular/common'; // Asegúrate de tener CommonModule para el *ngIf y *ngFor

@Component({
  selector: 'app-dashboard',
  standalone: true, // Si dice true, el import de abajo es OBLIGATORIO
  imports: [CommonModule, NgApexchartsModule], // 👈 2. Agregarlo aquí
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  
  // Opciones para el Gráfico de Funcionarios (Barras)
  public chartFuncionarios: any;
  
  // Opciones para el Gráfico de Políticas (Donut)
  public chartPoliticas: any;

  // Anomalías (Las llenaremos con Jarvis después)
  public anomaliesDetected: any[] = [];
  public isScanning = false;

  constructor(private analyticsService: AnalyticsService) {
    this.initEmptyCharts();
  }

  ngOnInit(): void {
    this.loadData();
  }

  initEmptyCharts() {
    // Configuración base con estética oscura y acentos neón
    this.chartFuncionarios = {
      series: [{ name: "Tareas Completadas", data: [] }],
      chart: { type: "bar", height: 350, foreColor: '#a1a1aa', toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories: [] },
      colors: ['#10b981'], // Verde esmeralda
      theme: { mode: 'dark' }
    };

    this.chartPoliticas = {
      series: [],
      chart: { type: "donut", height: 350, foreColor: '#a1a1aa' },
      labels: [],
      colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'], // Paleta moderna
      stroke: { width: 0 },
      theme: { mode: 'dark' }
    };
  }

  loadData() {
    this.analyticsService.getDashboardData().subscribe({
      next: (data: DashboardData) => {
        // 1. Llenar gráfico de Funcionarios
        const funcNames = data.topOfficials.map(item => item.name);
        const funcCounts = data.topOfficials.map(item => item.count);
        
        this.chartFuncionarios.xaxis.categories = funcNames;
        this.chartFuncionarios.series = [{ name: "Tareas Completadas", data: funcCounts }];

        // 2. Llenar gráfico de Políticas
        const polNames = data.volumeByPolicy.map(item => item.name);
        const polCounts = data.volumeByPolicy.map(item => item.count);

        this.chartPoliticas.labels = polNames;
        this.chartPoliticas.series = polCounts;
      },
      error: (err) => console.error("Error cargando analítica:", err)
    });
  }

  runJarvisAudit() {
    this.isScanning = true;
    // Aquí conectaremos con FastAPI en el siguiente paso.
    // Por ahora simulamos una carga.
    setTimeout(() => {
      this.isScanning = false;
      this.anomaliesDetected = [
        { tramiteId: '69ed7eb13', reason: 'El trámite tomó 400% más tiempo del promedio histórico para la política "Titulación".', severity: 'alta' }
      ];
    }, 2000);
  }
}