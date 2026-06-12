import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { CollaborativeDocumentEditorComponent } from '../../components/collaborative-document-editor/collaborative-document-editor.component';
import { CollaborativeDocumentApiService } from '../../services/collaborative-document-api.service';

@Component({
  selector: 'app-collaborative-document-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    CollaborativeDocumentEditorComponent,
  ],
  template: `
    <ng-container *ngIf="isReady; else loading">
      <app-collaborative-document-editor
        [documentId]="documentId"
        [roomName]="roomName"
        [userId]="userId"
        [userName]="userName"
        [userColor]="userColor"
        [initialHtmlContent]="initialHtmlContent"
      ></app-collaborative-document-editor>
    </ng-container>

    <ng-template #loading>
      <div class="flex h-screen items-center justify-center bg-[#020617] text-cyan-300">
        Cargando editor colaborativo...
      </div>
    </ng-template>
  `,
})
export class CollaborativeDocumentEditorPageComponent implements OnInit {
  documentId = '';

  userId = localStorage.getItem('userId') || 'user_001';

  userName =
    localStorage.getItem('name') ||
    localStorage.getItem('userName') ||
    localStorage.getItem('username') ||
    'Funcionario';

  userColor = '#22d3ee';
  roomName = '';
  initialHtmlContent = '';

  isReady = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly collaborativeDocumentApiService: CollaborativeDocumentApiService
  ) {}

  ngOnInit(): void {
    this.documentId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.paramMap.get('documentId') ||
      '';

    if (!this.documentId) {
      console.error('No se recibió documentId en la ruta.');
      this.isReady = true;
      return;
    }

    this.loadEditorData();
  }

  private loadEditorData(): void {
    this.collaborativeDocumentApiService
      .createSession(this.documentId, this.userId, this.userName)
      .subscribe({
        next: (session) => {
          this.roomName = session.roomName;
          this.userColor = session.userColor || '#22d3ee';

          this.loadLatestSnapshot();
        },
        error: (error) => {
          console.error('Error creando sesión colaborativa:', error);

          this.roomName = `workflow-doc-${this.documentId}`;
          this.loadLatestSnapshot();
        },
      });
  }

  private loadLatestSnapshot(): void {
    this.collaborativeDocumentApiService
      .getSnapshot(this.documentId)
      .subscribe({
        next: (snapshot) => {
          this.initialHtmlContent = snapshot?.htmlContent || '';
          this.isReady = true;
        },
        error: (error) => {
          console.error('Error cargando último snapshot:', error);

          this.initialHtmlContent = '';
          this.isReady = true;
        },
      });
  }
}