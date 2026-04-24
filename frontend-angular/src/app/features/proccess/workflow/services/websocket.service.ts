import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    public messages$ = new Subject<any>();
    private socket: WebSocket | null = null;

    connect(policyId: string, user: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }

        const wsUrl = `http://localhost:8000/ws/design/${policyId}/${user}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log(`[WS] Conectado a Política ${policyId} como ${user}`);
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.messages$.next(data);
            } catch (e) {
                console.error('[WS Error parsing message]', e);
            }
        };

        this.socket.onclose = () => {
            console.log('[WS] Desconectado');
            this.socket = null;
        };

        this.socket.onerror = (error) => {
            console.error('[WS Error]', error);
        };
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }

    send(data: any): void {
        if (this.isConnected()) {
            this.socket!.send(JSON.stringify(data));
        } else {
            console.warn('[WS] Intento de envío pero no hay conexión abierta.', data);
        }
    }
}