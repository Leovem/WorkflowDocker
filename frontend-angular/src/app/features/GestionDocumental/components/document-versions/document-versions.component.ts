import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DocumentVersionApiService } from '../../services/document-version-api.service';
import {
  DocumentVersion,
  DocumentVersionUploadPayload,
} from '../../models/document-version.model';

@Component({
  selector: 'app-document-versions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-versions.component.html',
})
export class DocumentVersionsComponent implements OnChanges {
  @Input({ required: true }) documentId!: string;

  @Input() currentUserId = 'user_001';
  @Input() currentUserName = 'Funcionario';

  versions: DocumentVersion[] = [];

  selectedFile: File | null = null;
  changeReason = '';

  isLoading = false;
  isUploading = false;

  errorMessage = '';
  successMessage = '';

  constructor(private readonly versionApi: DocumentVersionApiService) {}

  ngOnChanges(): void {
    if (this.documentId) {
      this.loadVersions();
    }
  }

  loadVersions(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.versionApi.getVersions(this.documentId).subscribe({
      next: (versions) => {
        this.versions = versions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando versiones:', error);
        this.errorMessage = 'No se pudieron cargar las versiones del documento.';
        this.isLoading = false;
      },
    });
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

  uploadNewVersion(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Selecciona un archivo para crear una nueva versión.';
      return;
    }

    if (!this.documentId) {
      this.errorMessage = 'No se encontró el documento principal.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: DocumentVersionUploadPayload = {
      file: this.selectedFile,
      uploadedByUserId: this.currentUserId,
      uploadedByUserName: this.currentUserName,
      changeReason: this.changeReason,
    };

    this.versionApi.uploadNewVersion(this.documentId, payload).subscribe({
      next: () => {
        this.successMessage = 'Nueva versión subida correctamente.';
        this.selectedFile = null;
        this.changeReason = '';
        this.isUploading = false;
        this.loadVersions();
      },
      error: (error) => {
        console.error('Error subiendo versión:', error);
        this.errorMessage = 'No se pudo subir la nueva versión.';
        this.isUploading = false;
      },
    });
  }

  downloadVersion(version: DocumentVersion): void {
    const url = this.versionApi.getVersionDownloadUrl(
      version.documentId,
      version.versionNumber
    );

    window.open(url, '_blank');
  }

  formatSize(size: number): string {
    if (!size) return '0 KB';

    const kb = size / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
  }
}