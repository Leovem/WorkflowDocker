import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EventSourcePolyfill } from 'event-source-polyfill';

@Injectable({
    providedIn: 'root'
})
export class SseService {
    private eventSource: EventSourcePolyfill | null = null;
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
            heartbeatTimeout: 300000 // 5 minutos de tolerancia
        });

        // 1. Escuchando tareas nuevas
        this.eventSource.addEventListener('NEW_TASK', (event: any) => {
            this.zone.run(() => {
                const mensaje = event.data;
                console.log('🔔 [SSE] Evento NEW_TASK recibido:', mensaje);
                this.notificationSubject.next(mensaje);
            });
        });

        // 2. Escuchando la confirmación de conexión
        this.eventSource.addEventListener('INIT', (event: any) => {
            this.zone.run(() => {
                console.log('✅ [SSE] Conexión confirmada por el servidor:', event.data);
            });
        });

        // =========================================================
        // 🚀 3. NUEVO: ESCUCHAR EL LATIDO (HEARTBEAT)
        // =========================================================
        this.eventSource.addEventListener('ping', (event: any) => {
            // No hacemos nada, ni siquiera un console.log para no ensuciar la consola.
            // Con el simple hecho de recibirlo, el heartbeatTimeout de 5 minutos se reinicia a cero.
        });
      
        // =========================================================
        // 🚀 4. CORRECCIÓN: MANEJO DE ERRORES INTELIGENTE
        // =========================================================
        this.eventSource.onerror = (error: any) => {
            this.zone.run(() => {
                console.warn('⚠️ [SSE] Micro-corte o error detectado. Intentando reconectar automáticamente...', error);
                
                // SOLO desconectamos si el error es de autenticación (Token expirado - HTTP 401/403)
                // Si es un error de red (HTTP 0 o HTTP 504), dejamos que el Polyfill haga su magia y reconecte solo.
                if (error && error.status && (error.status === 401 || error.status === 403)) {
                    console.error('❌ [SSE] Token inválido o expirado. Cerrando conexión.');
                    this.disconnect();
                }
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
      console.log('🔌 [SSE] Conexión cerrada intencionalmente.');
    }
  }
}