import { Injectable } from '@angular/core';
import {
  WorkflowDocumentConfiguration,
  WorkflowEditorPropertiesForm,
} from '../models/workflow-editor.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowDocumentConfigService {
  getDefaultDocumentConfiguration(): WorkflowDocumentConfiguration {
    return {
      requiredDocuments: [],
      requiresDocumentUpload: false,
      requiresDocumentReview: false,
    };
  }

  patchPropertiesFormWithDocumentConfig(
    form: WorkflowEditorPropertiesForm,
    savedData: any
  ): WorkflowEditorPropertiesForm {
    return {
      ...form,

      requiredDocuments: this.extractRequiredDocuments(savedData),

      requiresDocumentUpload:
        savedData?.requiresDocumentUpload ??
        savedData?.documents?.requiresDocumentUpload ??
        savedData?.configuration?.documents?.requiresDocumentUpload ??
        false,

      requiresDocumentReview:
        savedData?.requiresDocumentReview ??
        savedData?.documents?.requiresDocumentReview ??
        savedData?.configuration?.documents?.requiresDocumentReview ??
        false,
    };
  }

  buildDocumentConfigurationFromForm(
    form: WorkflowEditorPropertiesForm
  ): WorkflowDocumentConfiguration {
    return {
      requiredDocuments: this.cleanRequiredDocuments(form.requiredDocuments || []),
      requiresDocumentUpload: !!form.requiresDocumentUpload,
      requiresDocumentReview: !!form.requiresDocumentReview,
    };
  }

  buildUserDataDocumentFields(form: WorkflowEditorPropertiesForm): {
    requiredDocuments: string[];
    requiresDocumentUpload: boolean;
    requiresDocumentReview: boolean;
  } {
    const documents = this.buildDocumentConfigurationFromForm(form);

    return {
      requiredDocuments: documents.requiredDocuments,
      requiresDocumentUpload: documents.requiresDocumentUpload,
      requiresDocumentReview: documents.requiresDocumentReview,
    };
  }

  addRequiredDocument(
    form: WorkflowEditorPropertiesForm
  ): WorkflowEditorPropertiesForm {
    return {
      ...form,
      requiredDocuments: [...(form.requiredDocuments || []), ''],
    };
  }

  removeRequiredDocument(
    form: WorkflowEditorPropertiesForm,
    index: number
  ): WorkflowEditorPropertiesForm {
    const currentDocuments = [...(form.requiredDocuments || [])];

    if (index < 0 || index >= currentDocuments.length) {
      return form;
    }

    currentDocuments.splice(index, 1);

    return {
      ...form,
      requiredDocuments: currentDocuments,
    };
  }

  cleanRequiredDocuments(documents: string[]): string[] {
    return documents
      .map((documentName) => String(documentName || '').trim())
      .filter((documentName) => documentName.length > 0);
  }

  private extractRequiredDocuments(savedData: any): string[] {
    const documents =
      savedData?.requiredDocuments ||
      savedData?.documents?.requiredDocuments ||
      savedData?.configuration?.documents?.requiredDocuments ||
      [];

    if (!Array.isArray(documents)) {
      return [];
    }

    return documents;
  }
}