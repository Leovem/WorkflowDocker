import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root',
})
export class WorkflowCollaborationService {
  constructor(private readonly wsService: WebSocketService) {}

  connect(policyId: string, userName: string): void {
    if (!policyId) return;
    this.wsService.connect(policyId, userName);
  }

  disconnect(): void {
    this.wsService.disconnect();
  }

  isConnected(): boolean {
    return this.wsService.isConnected();
  }

  listenMessages(): Observable<any> {
    return this.wsService.messages$.asObservable();
  }

  sendCursorMove(payload: any): void {
    this.wsService.send({
      type: 'CURSOR_MOVE',
      payload,
    });
  }

  sendNodeLock(nodeId: string, userName: string): void {
    this.wsService.send({
      type: 'NODE_LOCK',
      payload: {
        nodeId,
        userName,
      },
    });
  }

  sendNodeUnlock(nodeId: string, userName: string): void {
    this.wsService.send({
      type: 'NODE_UNLOCK',
      payload: {
        nodeId,
        userName,
      },
    });
  }

  sendDiagramUpdate(payload: any): void {
    this.wsService.send({
      type: 'DIAGRAM_UPDATE',
      payload,
    });
  }

  sendCustomMessage(message: any): void {
    this.wsService.send(message);
  }
}