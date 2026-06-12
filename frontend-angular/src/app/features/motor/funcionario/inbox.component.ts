import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { SseService } from './service/sse.service';
import { InstanceService } from '../perfilEfimero/service/instance.service';

import {
  DynamicField,
  DynamicModalTaskComponent,
  ModalConfig,
} from '../../../ui/components/modal/dynamic-modal-task.component';

import { DocumentRepositoryComponent } from '../../GestionDocumental/components/document-repository/document-repository.component';
import { WorkflowDocumentApiService } from '../../GestionDocumental/services/workflow-document-api.service';
import { WorkflowDocument } from '../../GestionDocumental/models/workflow-document.model';
interface Toast {
  id: number;
  title: string;
  message: string;
}

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, DynamicModalTaskComponent, DocumentRepositoryComponent],
  templateUrl: './inbox.component.html',
})
export class InboxComponent implements OnInit, OnDestroy {
  pendingTasks: any[] = [];

  isLoading = true;
  isSubmitting = false;

  department = localStorage.getItem('department') || 'Sin departamento';
  departamentId =
    localStorage.getItem('departamentId') ||
    localStorage.getItem('departmentId') ||
    '';

  currentUserId = localStorage.getItem('userId') || 'user_001';
  currentUserName =
    localStorage.getItem('name') ||
    localStorage.getItem('userName') ||
    'Funcionario';

  selectedTask: any = null;
  selectedFullInstance: any = null;

  isModalOpen = false;
  modalConfig!: ModalConfig;

  selectedPolicyId = '';
  selectedProcessInstanceId = '';
  selectedClientId = '';
  selectedNodeId = '';
  selectedDepartmentId = '';
  selectedRequiredDocuments: string[] = [];

  toasts: Toast[] = [];
  private toastCounter = 0;

  private sseSubscription?: Subscription;

  constructor(
    private readonly sseService: SseService,
    private readonly instanceService: InstanceService,
    private readonly documentApi: WorkflowDocumentApiService
  ) { }

  ngOnInit(): void {
    this.loadPendingTasks();
    this.listenNotifications();
  }

  ngOnDestroy(): void {
    this.sseSubscription?.unsubscribe();
    console.log('Suscripción SSE del Inbox cerrada.');
  }

  listenNotifications(): void {
    this.sseSubscription = this.sseService.notifications$.subscribe({
      next: (mensaje) => {
        this.showToast('Actualización en tiempo real', mensaje);
        console.log('Notificación recibida, recargando bandeja...');
        this.loadPendingTasks();
      },
      error: (err) => {
        console.error('Error en la suscripción SSE del Inbox:', err);
      },
    });
  }

  loadPendingTasks(): void {
    this.isLoading = true;

    const deptId = this.departamentId || '';

    if (!deptId) {
      this.pendingTasks = [];
      this.isLoading = false;
      this.showToast(
        'Departamento no encontrado',
        'No se pudo identificar el departamento del usuario actual.'
      );
      return;
    }

    this.instanceService.getPendingTasks(deptId).subscribe({
      next: (data) => {
        this.pendingTasks = Array.isArray(data) ? data : [];
        this.isLoading = false;
        console.log('Trámites pendientes cargados:', this.pendingTasks);
      },
      error: (err) => {
        console.error('Error cargando trámites pendientes:', err);
        this.pendingTasks = [];
        this.isLoading = false;
        this.showToast(
          'Error',
          'No se pudieron cargar los trámites pendientes.'
        );
      },
    });
  }

  openTask(taskSummary: any): void {
    if (!taskSummary?.id) {
      this.showToast('Error', 'La tarea seleccionada no tiene ID de instancia.');
      return;
    }

    this.selectedTask = taskSummary;
    this.selectedFullInstance = null;

    // Limpiamos contexto anterior mientras carga la instancia completa
    this.selectedPolicyId = '';
    this.selectedProcessInstanceId = '';
    this.selectedClientId = '';
    this.selectedNodeId = '';
    this.selectedDepartmentId = '';
    this.selectedRequiredDocuments = [];

    console.log(
      `Buscando expediente completo para la instancia ID: ${taskSummary.id}...`
    );

    this.instanceService.getInstanceById(taskSummary.id).subscribe({
      next: (fullInstance) => {
        console.log('Expediente completo recibido:', fullInstance);

        this.selectedFullInstance = fullInstance;

        const currentNode = this.resolveCurrentNode(taskSummary, fullInstance);
        const config = currentNode?.configuration || {};

        const mappedFields = this.mapDynamicFields(config.formFields || []);
        const expediente = this.buildExpediente(fullInstance);

        this.modalConfig = {
          title: currentNode?.name || 'Completar tarea',
          description:
            currentNode?.description ||
            'Complete los campos requeridos para avanzar el flujo.',
          showProfileFields: false,
          customFields: mappedFields,

          mediaRequirements: {
            photo: false,
            document: false,
            audio: false,
            video: false,
          },

          mediaLabels: config.mediaLabels || null,
          previousData: expediente,
        };

        // IMPORTANTE:
        // Recién aquí calculamos el contexto documental,
        // porque aquí ya tenemos selectedFullInstance.
        this.selectedPolicyId = this.getSelectedPolicyId();
        this.selectedProcessInstanceId = this.getSelectedProcessInstanceId();
        this.selectedClientId = this.getSelectedClientId();
        this.selectedNodeId = this.getSelectedNodeId();
        this.selectedDepartmentId = this.getSelectedDepartmentId();
        this.selectedRequiredDocuments = this.getSelectedRequiredDocuments();

        console.log('CONTEXTO DOCUMENTAL CALCULADO:', {
          selectedPolicyId: this.selectedPolicyId,
          selectedProcessInstanceId: this.selectedProcessInstanceId,
          selectedClientId: this.selectedClientId,
          selectedNodeId: this.selectedNodeId,
          selectedDepartmentId: this.selectedDepartmentId,
          selectedRequiredDocuments: this.selectedRequiredDocuments,
        });

        this.isModalOpen = true;
      },
      error: (err) => {
        console.error('Error al traer el expediente completo:', err);
        this.showToast('Error', 'No se pudo cargar el expediente del trámite.');
      },
    });
  }

  closeTask(): void {
    this.isModalOpen = false;
    this.selectedTask = null;
    this.selectedFullInstance = null;

    this.selectedPolicyId = '';
    this.selectedProcessInstanceId = '';
    this.selectedClientId = '';
    this.selectedNodeId = '';
    this.selectedDepartmentId = '';
    this.selectedRequiredDocuments = [];
  }

  submitTask(taskData: any): void {
    if (!this.selectedTask) {
      this.showToast('Error', 'No hay una tarea seleccionada.');
      return;
    }

    const instanceId = this.selectedProcessInstanceId || this.getSelectedProcessInstanceId();
    const nodeId = this.selectedNodeId || this.getSelectedNodeId();

    if (!instanceId) {
      this.showToast('Error', 'No se encontró el ID de la instancia.');
      return;
    }

    if (!nodeId) {
      this.showToast('Error', 'No se encontró el ID del nodo actual.');
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    this.validateRequiredDocumentsBeforeComplete(instanceId, nodeId).subscribe({
      next: (validation) => {
        if (!validation.canComplete) {
          this.isSubmitting = false;

          this.showToast(
            'Documentos pendientes',
            validation.message
          );

          return;
        }

        const cleanTaskData = this.buildCleanTaskData(taskData);

        console.log('Datos enviados para completar tarea:', cleanTaskData);

        this.instanceService.completeTask(instanceId, nodeId, cleanTaskData).subscribe({
          next: (response) => {
            console.log('Tarea completada correctamente:', response);

            this.isSubmitting = false;
            this.closeTask();
            this.loadPendingTasks();

            this.showToast(
              'Éxito',
              'La tarea fue procesada correctamente y el trámite avanzó.'
            );
          },
          error: (err) => {
            console.error('Error al avanzar el motor:', err);

            this.isSubmitting = false;

            this.showToast(
              'Error',
              'No se pudo completar la tarea en el servidor.'
            );
          },
        });
      },
      error: (error) => {
        console.error('Error validando documentos:', error);

        this.isSubmitting = false;

        this.showToast(
          'Error documental',
          'No se pudo validar el estado de los documentos requeridos.'
        );
      },
    });
  }

  private validateRequiredDocumentsBeforeComplete(
    processInstanceId: string,
    nodeId: string
  ): Observable<{
    canComplete: boolean;
    message: string;
    missingDocuments: string[];
    pendingDocuments: string[];
  }> {
    return new Observable((observer) => {
      const requiredDocuments = this.selectedRequiredDocuments || [];

      console.log('Validando documentos requeridos:', requiredDocuments);

      if (!requiredDocuments || requiredDocuments.length === 0) {
        observer.next({
          canComplete: true,
          message: 'El nodo no tiene documentos requeridos.',
          missingDocuments: [],
          pendingDocuments: [],
        });
        observer.complete();
        return;
      }

      this.documentApi
        .getDocumentsByProcessInstanceAndNode(processInstanceId, nodeId)
        .subscribe({
          next: (documents) => {
            console.log('Documentos cargados para validación:', documents);

            const validation = this.validateRequiredDocumentsStatus(
              requiredDocuments,
              documents || []
            );

            console.log('Resultado validación documental:', validation);

            observer.next(validation);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          },
        });
    });
  }

  private validateRequiredDocumentsStatus(
    requiredDocuments: string[],
    uploadedDocuments: WorkflowDocument[]
  ): {
    canComplete: boolean;
    message: string;
    missingDocuments: string[];
    pendingDocuments: string[];
  } {
    const missingDocuments: string[] = [];
    const pendingDocuments: string[] = [];

    for (const requiredDocument of requiredDocuments) {
      const requiredKey = this.normalizeDocumentKey(requiredDocument);

      const documentsForRequirement = uploadedDocuments.filter((document) => {
        const documentRequirementKey = this.normalizeDocumentKey(
          document.requiredDocumentName ||
          document.requiredDocumentId ||
          ''
        );

        return documentRequirementKey === requiredKey;
      });

      if (documentsForRequirement.length === 0) {
        missingDocuments.push(requiredDocument);
        continue;
      }

      const hasApprovedDocument = documentsForRequirement.some(
        (document) =>
          String(document.documentStatus || '').toUpperCase() === 'APPROVED'
      );

      if (!hasApprovedDocument) {
        pendingDocuments.push(requiredDocument);
      }
    }

    const canComplete =
      missingDocuments.length === 0 && pendingDocuments.length === 0;

    if (canComplete) {
      return {
        canComplete: true,
        message: 'Todos los documentos requeridos están aprobados.',
        missingDocuments: [],
        pendingDocuments: [],
      };
    }

    const messages: string[] = [];

    if (missingDocuments.length > 0) {
      messages.push(
        `Faltan documentos por subir: ${missingDocuments.join(', ')}.`
      );
    }

    if (pendingDocuments.length > 0) {
      messages.push(
        `Faltan documentos por aprobar: ${pendingDocuments.join(', ')}.`
      );
    }

    return {
      canComplete: false,
      message: messages.join(' '),
      missingDocuments,
      pendingDocuments,
    };
  }

  private normalizeDocumentKey(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private resolveCurrentNode(taskSummary: any, fullInstance: any): any {
    if (taskSummary?.nodeData) {
      return taskSummary.nodeData;
    }

    if (fullInstance?.nodeData) {
      return fullInstance.nodeData;
    }

    if (fullInstance?.currentNodeData) {
      return fullInstance.currentNodeData;
    }

    const currentNodeId =
      taskSummary?.currentNodeId ||
      taskSummary?.nodeId ||
      fullInstance?.currentNodeId ||
      '';

    const nodes =
      fullInstance?.workflow?.nodes ||
      fullInstance?.policy?.workflow?.nodes ||
      [];

    if (currentNodeId && Array.isArray(nodes)) {
      const foundNode = nodes.find((node: any) => node?.id === currentNodeId);

      if (foundNode) {
        return foundNode;
      }
    }

    return {
      id: currentNodeId,
      name: taskSummary?.nodeName || 'Tarea pendiente',
      description: '',
      configuration: {},
    };
  }

  private mapDynamicFields(formFields: any[]): DynamicField[] {
    if (!Array.isArray(formFields)) {
      return [];
    }

    return formFields.map((field: any) => {
      const rawName =
        field?.name ||
        field?.key ||
        field?.label ||
        field?.title ||
        'campo';

      const rawLabel =
        field?.label ||
        field?.title ||
        field?.name ||
        field?.key ||
        'Campo';

      return {
        name: String(rawName).replace(/\s+/g, '_').toLowerCase(),
        label: String(rawLabel).replace(/_/g, ' ').toUpperCase(),
        type: field?.type || 'text',
        required: field?.required ?? true,
        options: field?.options || [],
      };
    });
  }

  private buildExpediente(fullInstance: any): any[] {
    const expediente: any[] = [];

    if (fullInstance?.workflow?.globalRequirements) {
      const initialData = fullInstance.workflow.globalRequirements;

      expediente.push({
        titulo: 'Solicitud inicial del ciudadano',
        datos: initialData.customFields || {},
        media: initialData.media || null,
        fecha: fullInstance.createdAt,
      });
    }

    if (Array.isArray(fullInstance?.history)) {
      const userSubmits = fullInstance.history.filter(
        (historyItem: any) => historyItem?.action === 'USER_SUBMIT'
      );

      userSubmits.forEach((submitEvent: any) => {
        const nodeInfo = fullInstance.history.find(
          (historyItem: any) =>
            historyItem?.nodeId === submitEvent?.nodeId &&
            historyItem?.action === 'SYSTEM_VISITED_NODE'
        );

        const taskName = nodeInfo?.nodeName || 'Tarea anterior';

        const submittedNodeData = submitEvent?.submittedData?.nodo;

        if (submittedNodeData) {
          const taskValues = { ...submittedNodeData };
          const media = taskValues.media || null;

          delete taskValues.media;

          expediente.push({
            titulo: taskName,
            datos: taskValues,
            media,
            fecha: submitEvent.timestamp,
          });
        }
      });
    }

    return expediente;
  }

  private buildCleanTaskData(taskData: any): any {
    const clonedData = this.deepCloneWithoutFiles(taskData || {});

    return {
      ...clonedData,
      completedByUserId: this.currentUserId,
      completedByUserName: this.currentUserName,
      completedAt: new Date().toISOString(),
      documentManagement: {
        provider: 'S3',
        handledBy: 'GestionDocumental',
        processInstanceId: this.getSelectedProcessInstanceId(),
        policyId: this.getSelectedPolicyId(),
        nodeId: this.getSelectedNodeId(),
        departmentId: this.getSelectedDepartmentId(),
      },
    };
  }

  private deepCloneWithoutFiles(value: any): any {
    if (value instanceof File || value instanceof Blob) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.deepCloneWithoutFiles(item))
        .filter((item) => item !== undefined);
    }

    if (value && typeof value === 'object') {
      const result: any = {};

      Object.keys(value).forEach((key) => {
        const cleanedValue = this.deepCloneWithoutFiles(value[key]);

        if (cleanedValue !== undefined) {
          result[key] = cleanedValue;
        }
      });

      return result;
    }

    return value;
  }

  getSelectedPolicyId(): string {
    const source = this.selectedFullInstance || this.selectedTask;

    return (
      source?.policyId ||
      source?.workflowId ||
      source?.processId ||
      source?.policy?.id ||
      source?.workflow?.id ||
      source?.workflow?._id ||
      source?.nodeData?.policyId ||
      ''
    );
  }

  getSelectedProcessInstanceId(): string {
    const source = this.selectedFullInstance || this.selectedTask;

    return (
      source?.id ||
      source?._id ||
      source?.instanceId ||
      source?.processInstanceId ||
      ''
    );
  }

  getSelectedClientId(): string {
    const source = this.selectedFullInstance || this.selectedTask;

    return (
      source?.clientId ||
      source?.profileId ||
      source?.profile?.id ||
      source?.profile?._id ||
      source?.citizenId ||
      source?.startedByUserId ||
      source?.createdByUserId ||
      source?.createdBy ||
      ''
    );
  }

  getSelectedNodeId(): string {
    const source = this.selectedFullInstance || this.selectedTask;

    return (
      source?.currentNodeId ||
      source?.nodeId ||
      source?.nodeData?.id ||
      ''
    );
  }

  getSelectedDepartmentId(): string {
    const source = this.selectedFullInstance || this.selectedTask;

    return (
      source?.currentDepartmentId ||
      source?.departmentId ||
      source?.nodeData?.departmentId ||
      source?.activeDepartments?.[0] ||
      this.departamentId ||
      localStorage.getItem('departamentId') ||
      localStorage.getItem('departmentId') ||
      ''
    );
  }

  getSelectedRequiredDocuments(): string[] {
    const currentNode = this.resolveCurrentNode(
      this.selectedTask,
      this.selectedFullInstance
    );

    const documentsConfig =
      currentNode?.configuration?.documentManagement ||
      currentNode?.configuration?.documents ||
      currentNode?.documentsConfig ||
      currentNode?.documents ||
      currentNode?.requiredDocuments ||
      null;

    const requiredDocuments = this.extractRequiredDocuments(documentsConfig);

    const multimediaDocuments = this.extractMultimediaRequirements(
      currentNode?.configuration || {}
    );

    return this.uniqueStrings([...requiredDocuments, ...multimediaDocuments]);
  }

  private extractRequiredDocuments(documentsConfig: any): string[] {
    if (!documentsConfig) {
      return [];
    }

    if (Array.isArray(documentsConfig)) {
      return documentsConfig.map((item) =>
        this.normalizeRequiredDocumentName(item)
      );
    }

    if (Array.isArray(documentsConfig.requiredDocuments)) {
      return documentsConfig.requiredDocuments.map((item: any) =>
        this.normalizeRequiredDocumentName(item)
      );
    }

    if (Array.isArray(documentsConfig.documents)) {
      return documentsConfig.documents.map((item: any) =>
        this.normalizeRequiredDocumentName(item)
      );
    }

    if (Array.isArray(documentsConfig.items)) {
      return documentsConfig.items.map((item: any) =>
        this.normalizeRequiredDocumentName(item)
      );
    }

    if (Array.isArray(documentsConfig.required)) {
      return documentsConfig.required.map((item: any) =>
        this.normalizeRequiredDocumentName(item)
      );
    }

    return [];
  }

  private extractMultimediaRequirements(configuration: any): string[] {
    const multimedia = configuration?.multimedia || {};
    const mediaLabels = configuration?.mediaLabels || {};

    const result: string[] = [];

    if (multimedia.photo) {
      result.push(mediaLabels.photo || 'Fotografía');
    }

    if (multimedia.document) {
      result.push(mediaLabels.document || 'Documento adjunto');
    }

    if (multimedia.audio) {
      result.push(mediaLabels.audio || 'Audio');
    }

    if (multimedia.video) {
      result.push(mediaLabels.video || 'Video');
    }

    return result;
  }

  private normalizeRequiredDocumentName(document: any): string {
    if (typeof document === 'string') {
      return document;
    }

    return (
      document?.name ||
      document?.label ||
      document?.title ||
      document?.documentName ||
      document?.description ||
      document?.type ||
      'Documento requerido'
    );
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => String(value || '').trim())
          .filter((value) => value.length > 0)
          .filter(
            (value) =>
              value.toLowerCase() !== 'sube los documentos requeridos'
          )
      )
    );
  }

  showToast(title: string, message: string): void {
    const id = ++this.toastCounter;

    this.toasts.push({
      id,
      title,
      message,
    });

    setTimeout(() => this.removeToast(id), 5000);
  }

  removeToast(id: number): void {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }
}