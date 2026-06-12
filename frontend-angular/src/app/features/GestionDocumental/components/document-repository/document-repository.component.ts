import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { WorkflowDocumentApiService } from '../../services/workflow-document-api.service';
import { CollaborativeDocumentApiService } from '../../services/collaborative-document-api.service';

import {
  DocumentStatus,
  UpdateDocumentStatusPayload,
  WorkflowDocument,
} from '../../models/workflow-document.model';

import { DocumentVersionsComponent } from '../document-versions/document-versions.component';
import { DocumentAuditComponent } from '../document-audit/document-audit.component';
import { CollaborativeDocument } from '../../models/collaborative-document.model';


@Component({
  selector: 'app-document-repository',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentVersionsComponent,
    DocumentAuditComponent,
  ],
  templateUrl: './document-repository.component.html',
})
export class DocumentRepositoryComponent implements OnChanges {
  @Input({ required: true }) policyId!: string;
  @Input({ required: true }) processInstanceId!: string;
  @Input({ required: true }) clientId!: string;
  @Input() nodeId?: string;
  @Input() departmentId?: string;

  @Input() currentUserId = 'user_001';
  @Input() currentUserName = 'Funcionario';

  @Input() requiredDocuments: string[] = [];

  documents: WorkflowDocument[] = [];

  selectedFile: File | null = null;

  selectedDocumentForVersions: WorkflowDocument | null = null;
  selectedDocumentForAudit: WorkflowDocument | null = null;
  selectedRequiredDocumentName = '';

  newCollaborativeDocumentTitle = '';
  isCreatingCollaborativeDocument = false;
  collaborativeDocuments: any[] = [];

  isLoading = false;
  isUploading = false;
  isUpdatingStatus = false;
  isOpeningCollaborativeEditor = false;

  errorMessage = '';
  successMessage = '';

  reviewObservation: Record<string, string> = {};

  constructor(
    private readonly documentApi: WorkflowDocumentApiService,
    private readonly collaborativeDocumentApiService: CollaborativeDocumentApiService,
    private readonly router: Router
  ) { }

  private lastLoadKey = '';

ngOnChanges(): void {
  const currentLoadKey = [
    this.policyId || '',
    this.processInstanceId || '',
    this.clientId || '',
    this.nodeId || '',
    this.departmentId || '',
  ].join('|');

  if (!this.policyId || !this.processInstanceId || !this.clientId) {
    return;
  }

  if (currentLoadKey === this.lastLoadKey) {
    return;
  }

  this.lastLoadKey = currentLoadKey;

  this.loadDocuments();
  this.loadCollaborativeDocuments();
}


  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.nodeId
      ? this.documentApi.getDocumentsByProcessInstanceAndNode(
        this.processInstanceId,
        this.nodeId
      )
      : this.documentApi.getDocumentsByProcessInstance(this.processInstanceId);

    request$.subscribe({
      next: (documents) => {
        this.documents = documents;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando documentos:', error);
        this.errorMessage = 'No se pudieron cargar los documentos del trámite.';
        this.isLoading = false;
      },
    });
  }

  openVersions(document: WorkflowDocument): void {
    this.selectedDocumentForVersions = document;
    this.selectedDocumentForAudit = null;
  }

  openAudit(document: WorkflowDocument): void {
    this.selectedDocumentForAudit = document;
    this.selectedDocumentForVersions = null;
  }

  closeDocumentPanels(): void {
    this.selectedDocumentForVersions = null;
    this.selectedDocumentForAudit = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      return;
    }

    this.selectedFile = input.files[0];
    this.errorMessage = '';
    this.successMessage = '';
  }

  uploadSelectedFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Selecciona un archivo antes de subir.';
      return;
    }

    if (!this.policyId || !this.processInstanceId || !this.clientId) {
      this.errorMessage = 'Faltan datos del trámite para asociar el documento.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.documentApi.uploadDocument({
      file: this.selectedFile,
      policyId: this.policyId,
      processInstanceId: this.processInstanceId,
      clientId: this.clientId,
      nodeId: this.nodeId,
      departmentId: this.departmentId,
      requiredDocumentName: this.selectedRequiredDocumentName || undefined,
      uploadedByUserId: this.currentUserId,
      uploadedByUserName: this.currentUserName,
    })
      .subscribe({
        next: () => {
          this.successMessage = 'Documento subido correctamente.';
          this.selectedFile = null;
          this.selectedRequiredDocumentName = '';
          this.isUploading = false;
          this.loadDocuments();
        },
        error: (error) => {
          console.error('Error subiendo documento:', error);
          this.errorMessage = 'No se pudo subir el documento.';
          this.isUploading = false;
        },
      });
  }

 loadCollaborativeDocuments(): void {
  if (!this.processInstanceId) {
    return;
  }

  const request$ = this.nodeId
    ? this.collaborativeDocumentApiService.getDocumentsByProcessInstanceAndNode(
        this.processInstanceId,
        this.nodeId
      )
    : this.collaborativeDocumentApiService.getDocumentsByProcessInstance(
        this.processInstanceId
      );

  request$.subscribe({
    next: (documents) => {
      this.collaborativeDocuments = documents || [];
    },
    error: (error) => {
      console.error('Error cargando documentos colaborativos:', error);
    },
  });
}

  createCollaborativeDocument(): void {
  const title = this.newCollaborativeDocumentTitle.trim();

  if (!title) {
    this.errorMessage = 'Ingresa un nombre para el documento colaborativo.';
    return;
  }

  if (
    !this.policyId ||
    !this.processInstanceId ||
    !this.clientId ||
    !this.nodeId ||
    !this.departmentId
  ) {
    this.errorMessage =
      'Faltan datos del trámite para crear el documento colaborativo.';
    return;
  }

  if (!this.currentUserId || !this.currentUserName) {
    this.errorMessage =
      'No se pudo identificar al usuario actual para crear el documento.';
    return;
  }

  this.isCreatingCollaborativeDocument = true;
  this.errorMessage = '';
  this.successMessage = '';

  this.collaborativeDocumentApiService
    .createDocument({
      title,
      workflowDocumentId: null,
      processInstanceId: this.processInstanceId,
      policyId: this.policyId,
      nodeId: this.nodeId,
      departmentId: this.departmentId,
      createdByUserId: this.currentUserId,
      createdByUserName: this.currentUserName,
    })
    .subscribe({
      next: (document) => {
        this.successMessage = 'Documento colaborativo creado correctamente.';
        this.newCollaborativeDocumentTitle = '';
        this.isCreatingCollaborativeDocument = false;

        this.loadCollaborativeDocuments();
        this.openCollaborativeDocument(document);
      },
      error: (error) => {
        console.error('Error creando documento colaborativo:', error);
        this.errorMessage = 'No se pudo crear el documento colaborativo.';
        this.isCreatingCollaborativeDocument = false;
      },
    });
}

openCollaborativeDocument(document: CollaborativeDocument): void {
  if (!document?.id) {
    this.errorMessage = 'El documento colaborativo no tiene ID.';
    return;
  }

  this.router.navigate(['/documentos', document.id, 'editor']);
}

  approveDocument(document: WorkflowDocument): void {
    this.updateStatus(document, 'APPROVED', 'Documento aprobado.');
  }

  observeDocument(document: WorkflowDocument): void {
    const observation =
      this.reviewObservation[document.id]?.trim() || 'Documento observado. Debe corregirse.';

    this.updateStatus(document, 'OBSERVED', observation);
  }

  rejectDocument(document: WorkflowDocument): void {
    const observation =
      this.reviewObservation[document.id]?.trim() || 'Documento rechazado.';

    this.updateStatus(document, 'REJECTED', observation);
  }

  updateStatus(
    document: WorkflowDocument,
    status: Exclude<DocumentStatus, 'PENDING'>,
    observation: string
  ): void {
    this.isUpdatingStatus = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: UpdateDocumentStatusPayload = {
      status,
      observation,
      reviewedByUserId: this.currentUserId,
      reviewedByUserName: this.currentUserName,
    };

    this.documentApi.updateDocumentStatus(document.id, payload).subscribe({
      next: () => {
        this.successMessage = 'Estado del documento actualizado correctamente.';
        this.isUpdatingStatus = false;
        this.loadDocuments();
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
        this.errorMessage = 'No se pudo actualizar el estado del documento.';
        this.isUpdatingStatus = false;
      },
    });
  }

  viewDocument(document: WorkflowDocument): void {
    this.documentApi.registerView(document.id, this.currentUserId, this.currentUserName).subscribe({
      next: () => {
        const url = this.documentApi.getDownloadUrl(
          document.storedFileName,
          this.currentUserId,
          this.currentUserName
        );

        window.open(url, '_blank');
      },
      error: (error) => {
        console.error('Error registrando vista:', error);
        this.errorMessage = 'No se pudo registrar la visualización del documento.';
      },
    });
  }

  downloadDocument(document: WorkflowDocument): void {
    const url = this.documentApi.getDownloadUrl(
      document.storedFileName,
      this.currentUserId,
      this.currentUserName
    );

    window.open(url, '_blank');
  }

  openCollaborativeEditor(document: WorkflowDocument): void {
    if (!document?.id) {
      this.errorMessage = 'No se puede abrir el editor porque el documento no tiene ID.';
      return;
    }

    this.isOpeningCollaborativeEditor = true;
    this.errorMessage = '';
    this.successMessage = '';

    const documentAny = document as any;

    const title =
      documentAny.originalFileName ||
      documentAny.documentType ||
      documentAny.name ||
      'Documento colaborativo';

    this.collaborativeDocumentApiService
      .createDocument({
        title,
        workflowDocumentId: document.id,
        processInstanceId: this.processInstanceId,
        policyId: this.policyId,
        nodeId: this.nodeId,
        departmentId: this.departmentId,
        createdByUserId: this.currentUserId,
        createdByUserName: this.currentUserName,
      })
      .subscribe({
        next: (collaborativeDocument) => {
          this.isOpeningCollaborativeEditor = false;

          this.router.navigate([
            '/documentos',
            collaborativeDocument.id,
            'editor',
          ]);
        },
        error: (error) => {
          console.error('Error creando documento colaborativo:', error);
          this.errorMessage = 'No se pudo abrir el editor colaborativo.';
          this.isOpeningCollaborativeEditor = false;
        },
      });
  }

  formatSize(size: number): string {
    if (!size) return '0 KB';

    const kb = size / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      OBSERVED: 'Observado',
    };

    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
      OBSERVED: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return classes[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  }
}