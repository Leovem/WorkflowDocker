import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EventSourcePolyfill } from 'event-source-polyfill';

@Injectable({
    providedIn: 'root'
})
export class SseService {
    private eventSource: EventSource | null = null;
    private notificationSubject = new Subject<any>();

    // Exponemos el observable para que el componente se suscriba
    public notifications$: Observable<any> = this.notificationSubject.asObservable();

    constructor(private zone: NgZone) { }

    connect(departmentId: string, token: string) {
    // Si ya hay una conexión abierta, la cerramos antes de abrir otra
        this.disconnect();

        const url = `${environment.apiUrl}/notifications/stream/${departmentId}`;

        // Usamos el polyfill que SÍ nos deja enviar el token JWT
        this.eventSource = new EventSourcePolyfill(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        heartbeatTimeout: 120000 // Opcional: Tiempo de espera antes de reconectar si el server calla
        });

        // Escuchando mensajes entrantes
        this.eventSource.addEventListener('NEW_TASK', (event: any) => {
            this.zone.run(() => {
                const mensaje = event.data;
                console.log('🔔 [SSE] Evento NEW_TASK recibido:', mensaje);
                this.notificationSubject.next(mensaje);
            });
        });

        this.eventSource.addEventListener('INIT', (event: any) => {
            this.zone.run(() => {
                console.log('✅ [SSE] Conexión confirmada por el servidor:', event.data);
            });
        });
      
      
        this.eventSource.onerror = (error: any) => {
        this.zone.run(() => {
            console.error('❌ [SSE] Error en la conexión o token expirado:', error);
            this.disconnect(); // Cerramos para evitar bucles infinitos de reconexión fallida
        });
        };
    }

  /**
   * Cierra la conexión. Debe llamarse al hacer Logout.
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('🔌 [SSE] Conexión cerrada.');
    }
  }
}