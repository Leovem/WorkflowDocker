import { Component, OnInit } from '@angular/core';
import { AnalyticsService, DashboardData } from '../Analytics/service/analytics.service';
import { NgApexchartsModule } from 'ng-apexcharts'; // 👈 1. Importar esto
import { CommonModule } from '@angular/common'; // Asegúrate de tener CommonModule para el *ngIf y *ngFor



interface JarvisResponse {
  analisis_rendimiento?: {
    asistente: string;
    cuello_de_botella: string;
    reconocimiento: string;
    sugerencias_mejora: string[];
    estado_sistema: string;
    estabilidad_confirmada?: string;
  };
}




@Component({
  selector: 'app-dashboard',
  standalone: true, // Si dice true, el import de abajo es OBLIGATORIO
  imports: [CommonModule, NgApexchartsModule], // 👈 2. Agregarlo aquí
  templateUrl: './dashboard.html',
})

export class DashboardComponent implements OnInit {
  
  
  public chartFuncionarios: any;
  
  
  public chartPoliticas: any;

  public jarvisData: JarvisResponse | null = null;
  public jarvisMessage: string = '';
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



  private normalizeJarvisData(raw: any): JarvisResponse {
  // Buscamos el objeto de análisis sin importar si se llama 'informe_rendimiento' o 'analisis_rendimiento'
  const data = raw.analisis_rendimiento || raw.informe_rendimiento || {};
  
  return {
    analisis_rendimiento: {
      asistente: data.asistente || 'Jarvis',
      // Normalizamos campos que Gemini suele cambiar (plural/singular)
      cuello_de_botella: data.cuello_de_botella || data.cuellos_de_botella || 'Sin anomalías detectadas.',
      reconocimiento: data.reconocimiento || data.reconocimientos || 'Buen trabajo del equipo.',
      sugerencias_mejora: data.sugerencias_mejora || [],
      estado_sistema: data.estado_sistema || data.nota_final || 'Sistema estable.'
    }
  };
}

  runJarvisAudit() {
    this.isScanning = true;

    this.anomaliesDetected = [];
    this.jarvisMessage = '';

    this.analyticsService.getRecentTasks().subscribe({
      next: async (tasks) => {
        await this.analyticsService.getJarvisAnalysis(tasks).subscribe({
          next: (res) => {
            this.isScanning = false;
            try {
              const parsed = JSON.parse(res.jarvis_speech.replace(/```json|```/g, '').trim());
              // Aplicamos la normalización antes de asignar a la vista
              this.jarvisData = this.normalizeJarvisData(parsed);
            } catch (e) {
              console.error("Error de parseo:", e);
            }
          }
        });
      },
      error: (err) => {
        this.isScanning = false;
        console.error("Error obteniendo tareas para Jarvis: ", err);
      }
    })

  }
}