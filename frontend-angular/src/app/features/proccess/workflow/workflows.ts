import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as joint from '@joint/core';
import { driver } from 'driver.js';

import { FlowSidebarComponent } from '../../../ui/components/flow-sidebar/flow-sidebar.component';
import { AiCopilotComponent } from '../../../ui/components/modal-ia/ia-copilot.component';

import { DepartmentService } from '../../Acceso_y_Seguridad/departments/services/department.service';
import { ApiService } from '../policy/services/api.service';
import { Policy } from '../policy/models/policy.model';

import { ChatMessage1 } from './services/copilot.service';

import {
  MediaLabels,
  NodeRequirements,
  WorkflowEditorPropertiesForm,
  WorkflowGlobalRequirements,
} from './models/workflow-editor.model';

import { EditorCanvasService } from './services/editor-canvas.service';
import { WorkflowAiService } from './services/workflow-ai.service';
import { WorkflowCollaborationService } from './services/workflow-collaboration.service';
import { WorkflowDocumentConfigService } from './services/workflow-document-config.service';
import { WorkflowSerializerService } from './services/workflow-serializer.service';
import { WorkflowValidationService } from './services/workflow-validation.service';

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FlowSidebarComponent,
    AiCopilotComponent,
  ],
  templateUrl: './workflows.html',
  styles: [':host { display: block; height: 100vh; width: 100%; }'],
})
export class Workflow implements OnInit, OnDestroy {
  @ViewChild('paperContainer', { static: false })
  set paperContainerSetter(element: ElementRef<HTMLElement>) {
    if (element && !this.paperInitialized) {
      this.paperContainer = element;
      this.paperInitialized = true;

      setTimeout(() => this.initJointJS(), 0);
    }
  }

  public paperContainer!: ElementRef<HTMLElement>;

  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;

  public isLoading = true;
  public departamentos: any[] = [];

  public policies: Policy[] = [];
  public selectedPolicy: Policy | null = null;
  public isSelectionMode = true;

  private paperInitialized = false;
  public draggedNodeInfo: any = null;

  public autoSaveInterval: any = null;

  public userName = 'User_' + Math.floor(Math.random() * 100);
  public activeUsers: string[] = [];
  public userColors: Record<string, string> = {};
  public otherCursors: Record<string, { x: number; y: number; color: string }> =
    {};
  public lockedNodes: Record<string, string> = {};
  private unlockTimeouts: Record<string, any> = {};

  public selectedElement: joint.dia.Element | null = null;
  public propertiesForm: WorkflowEditorPropertiesForm | null = null;

  public globalRequirements: WorkflowGlobalRequirements = {
    description: '',
    document: false,
    photo: false,
    video: false,
    audio: false,
    mediaLabels: {
      document: '',
      photo: '',
      video: '',
      audio: '',
    },
    customFields: [],
  };

  public isCopilotOpen = false;
  public isAiTyping = false;
  public chatMessages: ChatMessage1[] = [
    {
      role: 'assistant',
      content: '¡Hola! Soy Jarvis. Estoy listo para ayudarte con tu política.',
    },
  ];

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly deptService: DepartmentService,
    private readonly apiService: ApiService,

    private readonly editorCanvasService: EditorCanvasService,
    private readonly workflowAiService: WorkflowAiService,
    private readonly workflowCollaborationService: WorkflowCollaborationService,
    private readonly workflowDocumentConfigService: WorkflowDocumentConfigService,
    private readonly workflowSerializerService: WorkflowSerializerService,
    private readonly workflowValidationService: WorkflowValidationService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserName();
    this.loadDepartments();
    this.loadPolicies();
    this.setupWebSocketListeners();
  }

  ngOnDestroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    this.workflowCollaborationService.disconnect();
  }

  private loadCurrentUserName(): void {
    const localUser = localStorage.getItem('user');

    if (!localUser) return;

    try {
      this.userName = JSON.parse(localUser).nombre || this.userName;
    } catch {
      this.userName = localUser;
    }
  }

  private loadDepartments(): void {
    this.deptService.getDepartments().subscribe({
      next: (data) => {
        this.departamentos = data.map((department: any) => ({
          id: department.id,
          name: department.name,
        }));

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando departamentos:', error);
        this.isLoading = false;
      },
    });
  }

  private loadPolicies(): void {
    this.apiService.getPoliticas().subscribe({
      next: (data) => {
        this.policies = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando políticas:', error);
      },
    });
  }

  createNewPolicy(): void {
    const draft: Policy = {
      name: 'Nueva Política Sin Título',
      description: 'Política creada de forma interactiva.',
      status: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.apiService.sincronizarPolitica(draft).subscribe({
      next: (insertedPolicy) => {
        this.loadPolicies();
        this.selectPolicy(insertedPolicy);
      },
      error: (error) => {
        console.error('Error creando política:', error);
        alert('No se pudo crear la política en el servidor.');
      },
    });
  }

  selectPolicy(policy: Policy): void {
    const policyId = this.extractPolicyId(policy);

    if (!policyId) return;

    this.apiService.getPolitica(policyId).subscribe({
      next: (fullPolicy) => {
        this.selectedPolicy = fullPolicy;
        this.isSelectionMode = false;

        this.loadGlobalRequirementsFromPolicy(fullPolicy);
        this.connectCollaboration(policyId);
        this.startAutoSave();

        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.paperInitialized && this.graph && this.paper) {
            this.restorePolicyCanvas();
          }
        }, 150);
      },
      error: (error) => {
        console.error('Error cargando política:', error);
      },
    });
  }

  unselectPolicy(): void {
    if (this.selectedPolicy) {
      this.workflowCollaborationService.sendCustomMessage({
        type: 'presence',
        action: 'left',
        user: this.userName,
      });

      this.workflowCollaborationService.disconnect();
    }

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    this.selectedPolicy = null;
    this.isSelectionMode = true;
    this.paperInitialized = false;

    this.activeUsers = [];
    this.otherCursors = {};
    this.lockedNodes = {};
    this.selectedElement = null;
    this.propertiesForm = null;

    if (this.graph) {
      this.graph.clear();
    }

    this.loadPolicies();
  }

  deletePolicy(event: Event, id: string): void {
    event.stopPropagation();

    const confirmed = confirm(
      '¿Estás seguro de eliminar esta política? Toda la configuración se perderá.'
    );

    if (!confirmed) return;

    this.apiService.eliminarPolitica(id).subscribe({
      next: () => this.loadPolicies(),
      error: (error) => {
        console.error('Error eliminando política:', error);
        alert('Hubo un problema al eliminar la política.');
      },
    });
  }

  togglePublish(): void {
    if (!this.selectedPolicy) return;

    const newStatus = !this.selectedPolicy.status;

    if (!newStatus) {
      const confirmed = confirm(
        '¿Estás seguro de despublicar? Esto impedirá que se inicien nuevos trámites con esta política.'
      );

      if (!confirmed) return;
    }

    this.selectedPolicy.status = newStatus;

    this.apiService.sincronizarPolitica(this.selectedPolicy).subscribe({
      next: () => {
        const message = this.selectedPolicy?.status
          ? '🚀 Política publicada'
          : '📁 Política en modo borrador';

        console.log(message);
      },
      error: (error) => {
        this.selectedPolicy!.status = !newStatus;
        alert(
          error.error ||
            'No se pudo cambiar el estado. Es posible que la política ya esté en uso.'
        );
      },
    });
  }

  savePolicy(silent = false): void {
    if (!this.selectedPolicy || !this.graph) return;

    if (this.selectedPolicy.status) {
      if (!silent) {
        console.log(
          '🔏 Política bloqueada porque está publicada. No se permiten cambios.'
        );
      }

      return;
    }

    const validation = this.workflowValidationService.validateGraph(this.graph);

    if (!validation.valid) {
      console.warn('El workflow tiene errores:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('Advertencias del workflow:', validation.warnings);
    }

    const cleanWorkflow = this.workflowSerializerService.serializeWorkflow(
      this.graph,
      this.globalRequirements
    );

    const jointEngineState =
      this.workflowSerializerService.getJointEngineState(this.graph);

    this.selectedPolicy.workflow = cleanWorkflow;
    (this.selectedPolicy as any).jointEngineState = jointEngineState;
    this.selectedPolicy.updatedAt = new Date().toISOString();

    console.log('📡 [AUTO-SAVE] Enviando workflow limpio:', cleanWorkflow);

    this.apiService.sincronizarPolitica(this.selectedPolicy).subscribe({
      next: () => {
        if (!silent) {
          console.log('✅ Sincronización manual exitosa');
        }
      },
      error: (error) => {
        console.error('❌ Error en autoguardado:', error);
      },
    });
  }

  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.graph && this.selectedPolicy && !this.isSelectionMode) {
        this.savePolicy(true);
      }
    }, 5000);
  }

  private extractPolicyId(policy: Policy): string {
  const rawId: any =
    (policy as any).id ||
    (policy as any)._id ||
    (policy as any).policyId;

  if (!rawId) return '';

  if (typeof rawId === 'string') {
    return rawId;
  }

  if (rawId.$oid) {
    return rawId.$oid;
  }

  if (rawId.timestamp && rawId.date) {
    return String(rawId);
  }

  if (typeof rawId.toString === 'function') {
    const value = rawId.toString();

    if (value !== '[object Object]') {
      return value;
    }
  }

  return JSON.stringify(rawId);
}

  private loadGlobalRequirementsFromPolicy(policy: Policy): void {
    const workflow = policy.workflow as any;

    if (workflow?.globalRequirements) {
      this.globalRequirements = workflow.globalRequirements;
      return;
    }

    this.globalRequirements = {
      description: '',
      document: false,
      photo: false,
      video: false,
      audio: false,
      mediaLabels: {
        document: '',
        photo: '',
        video: '', 
        audio: '',
      },
      customFields: [],
    };
  }

  private connectCollaboration(policyId: string): void {
    this.workflowCollaborationService.connect(policyId, this.userName);

    //this.workflowCollaborationService.sendCustomMessage({
    //  type: 'presence',
    //  action: 'joined',
    //  user: this.userName,
    //});
  }

  private restorePolicyCanvas(): void {
    if (!this.selectedPolicy || !(this.selectedPolicy as any).jointEngineState) {
      return;
    }

    try {
      let state = (this.selectedPolicy as any).jointEngineState;

      if (typeof state === 'string') {
        state = JSON.parse(state);
      }

      this.editorCanvasService.restoreGraphFromJson(this.graph, state);
      this.editorCanvasService.fitToContent(this.paper);

      console.log('✅ Restauración del diagrama exitosa.');
    } catch (error) {
      console.error('Error restaurando JointJS:', error);
    }
  }

  initJointJS(): void {
    if (!this.paperContainer?.nativeElement) return;

    this.graph = this.editorCanvasService.createGraph();

    this.paper = this.editorCanvasService.createPaper(
      this.graph,
      this.paperContainer.nativeElement
    );

    this.registerCanvasEvents();
    this.setupGraphSync();
    this.restorePolicyCanvas();

    setTimeout(() => {
      const hasSeenTour = localStorage.getItem('has_seen_tour');

      if (!hasSeenTour) {
        this.launchJarvisOnboarding();
      }
    }, 500);
  }

  private registerCanvasEvents(): void {
    this.editorCanvasService.registerZoomAndPan(this.paper);
    this.editorCanvasService.registerElementTools(this.paper);
    this.editorCanvasService.registerLinkTools(this.paper);

    this.paper.el.addEventListener('mousemove', (event: MouseEvent) => {
      if (!this.workflowCollaborationService.isConnected()) return;

      const bounds = this.paperContainer.nativeElement.getBoundingClientRect();

      this.workflowCollaborationService.sendCustomMessage({
        type: 'cursor',
        user: this.userName,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    });

    this.paper.on('element:pointerdown', (elementView, event) => {
      const id = String(elementView.model.id);

      if (this.lockedNodes[id] && this.lockedNodes[id] !== this.userName) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (this.unlockTimeouts[id]) {
        clearTimeout(this.unlockTimeouts[id]);
        delete this.unlockTimeouts[id];
      }

      this.workflowCollaborationService.sendNodeLock(id, this.userName);
    });

    this.paper.on('element:pointerup', (elementView) => {
      const id = String(elementView.model.id);

      this.unlockTimeouts[id] = setTimeout(() => {
        if (this.selectedElement && this.selectedElement.id === id) return;

        this.workflowCollaborationService.sendNodeUnlock(id, this.userName);
      }, 150);
    });

    this.paper.on('element:pointerclick', (elementView) => {
      const model = elementView.model as joint.dia.Element;

      if (model.get('isLane')) return;

      const id = String(model.id);

      if (this.lockedNodes[id] && this.lockedNodes[id] !== this.userName) {
        console.warn(`⚠️ El nodo está siendo editado por ${this.lockedNodes[id]}`);
        return;
      }

      this.openNodeProperties(model);
    });

    this.paper.on('blank:pointerdown', () => {
      this.closePropertiesPanel();
    });
  }

  private setupGraphSync(): void {
    this.graph.on('add remove', (_cell, _collection, options) => {
      if (options?.remote) return;

      this.workflowCollaborationService.sendDiagramUpdate(this.graph.toJSON());
    });

    this.graph.on(
      'change:source change:target change:vertices',
      (_cell, _value, options) => {
        if (options?.remote) return;

        this.workflowCollaborationService.sendDiagramUpdate(this.graph.toJSON());
      }
    );

    this.graph.on('change:position', (cell, newPosition, options) => {
      if (options?.remote) return;

      this.workflowCollaborationService.sendCustomMessage({
        type: 'cell_change',
        user: this.userName,
        cellId: cell.id,
        changes: {
          position: newPosition,
        },
      });
    });
  }

  private setupWebSocketListeners(): void {
    this.workflowCollaborationService.listenMessages().subscribe((data) => {
      if (data.user === this.userName) return;

      switch (data.type) {
        case 'presence':
          this.handlePresenceMessage(data);
          break;

        case 'cursor':
          this.handleCursorMessage(data);
          break;

        case 'NODE_LOCK':
        case 'node_lock':
          this.lockedNodes[data.nodeId] = data.user;
          this.applyNodeColor(data.nodeId, true);
          break;

        case 'NODE_UNLOCK':
        case 'node_unlock':
          delete this.lockedNodes[data.nodeId];
          this.applyNodeColor(data.nodeId, false);
          break;

        case 'cell_change':
          this.handleCellChangeMessage(data);
          break;

        case 'DIAGRAM_UPDATE':
        case 'graph_update':
          this.handleDiagramUpdateMessage(data);
          break;
      }

      this.cdr.detectChanges();
    });
  }

  private handlePresenceMessage(data: any): void {
    if (data.action === 'joined' && !this.activeUsers.includes(data.user)) {
      this.activeUsers.push(data.user);
      this.getUserColor(data.user);

      if (this.graph && this.graph.getCells().length > 0) {
        this.workflowCollaborationService.sendDiagramUpdate(this.graph.toJSON());
      }

      return;
    }

    if (data.action === 'left') {
      this.activeUsers = this.activeUsers.filter((user) => user !== data.user);

      const cursorsCopy = { ...this.otherCursors };
      delete cursorsCopy[data.user];

      this.otherCursors = cursorsCopy;
    }
  }

  private handleCursorMessage(data: any): void {
    this.otherCursors = {
      ...this.otherCursors,
      [data.user]: {
        x: data.x,
        y: data.y,
        color: this.getUserColor(data.user),
      },
    };

    if (!this.activeUsers.includes(data.user)) {
      this.activeUsers.push(data.user);
    }
  }

  private handleCellChangeMessage(data: any): void {
    const targetCell = this.graph.getCell(data.cellId);

    if (targetCell && data.changes?.position) {
      targetCell.set('position', data.changes.position, {
        remote: true,
      });
    }
  }

  private handleDiagramUpdateMessage(data: any): void {
    if (!this.graph || !data.data) return;

    this.graph.fromJSON(data.data, {
      remote: true,
    });
  }

  private getUserColor(user: string): string {
    if (!this.userColors[user]) {
      const colors = [
        '#f43f5e',
        '#a855f7',
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ec4899',
        '#06b6d4',
      ];

      this.userColors[user] = colors[Math.floor(Math.random() * colors.length)];
    }

    return this.userColors[user];
  }

  private applyNodeColor(id: string, isLocked: boolean): void {
    const cell = this.graph.getCell(id) as joint.dia.Element;

    if (!cell || cell.get('isLane')) return;

    if (isLocked) {
      if (!cell.get('originalStroke')) {
        cell.set('originalStroke', cell.attr('body/stroke'));
      }

      cell.attr('body/stroke', '#ef4444');
      cell.attr('body/strokeWidth', 4);
      return;
    }

    const originalStroke = cell.get('originalStroke');

    if (originalStroke) {
      cell.attr('body/stroke', originalStroke);
    }

    cell.attr('body/strokeWidth', 2);
    cell.unset('originalStroke');
  }

  openGlobalRequirements(): void {
    this.propertiesForm = {
      id: 'GLOBAL_POLICY',
      type: 'actividad',
      title: 'REQUISITOS DEL TRÁMITE',
      description: this.globalRequirements.description,
      requirements: this.globalRequirements as NodeRequirements,
      mediaLabels: this.globalRequirements.mediaLabels,
      customFields: this.globalRequirements.customFields,
    };

    this.cdr.detectChanges();
  }

  private openNodeProperties(model: joint.dia.Element): void {
    this.selectedElement = model;

    const savedData = model.get('userData') || {};
    const nodeType = model.get('nodeType');

    const baseForm: WorkflowEditorPropertiesForm = {
      id: String(model.id),
      type: nodeType,
      title: String(model.attr('label/text') || '').trim(),
      description: model.get('nodeDescription') || '',

      requirements: savedData.requirements || {
        document: false,
        photo: false,
        video: false,
        audio: false,
      },

      mediaLabels: savedData.mediaLabels || {
        document: '',
        photo: '',
        video: '',
        audio: '',
      },

      customFields: savedData.customFields || [],

      variable: savedData.variable || '',
      operador: savedData.operador || '==',
      value: savedData.value || '',
      mergeStrategy: savedData.mergeStrategy || 'first_come',
    };

    this.propertiesForm =
      this.workflowDocumentConfigService.patchPropertiesFormWithDocumentConfig(
        baseForm,
        savedData
      );

    this.cdr.detectChanges();
  }

  closePropertiesPanel(): void {
    if (this.selectedElement) {
      this.workflowCollaborationService.sendNodeUnlock(
        String(this.selectedElement.id),
        this.userName
      );
    }

    this.selectedElement = null;
    this.propertiesForm = null;
    this.cdr.detectChanges();
  }

  applyProperties(): void {
    if (!this.propertiesForm) return;

    if (this.propertiesForm.id === 'GLOBAL_POLICY') {
      this.applyGlobalRequirements();
      return;
    }

    if (!this.selectedElement) return;

    const documentUserData =
      this.workflowDocumentConfigService.buildUserDataDocumentFields(
        this.propertiesForm
      );

    this.selectedElement.attr(
      'label/text',
      this.propertiesForm.title.toUpperCase()
    );

    this.selectedElement.set(
      'nodeDescription',
      this.propertiesForm.description
    );

    this.selectedElement.set('userData', {
      requirements: this.propertiesForm.requirements,
      mediaLabels: this.propertiesForm.mediaLabels,
      customFields: this.propertiesForm.customFields,

      variable: this.propertiesForm.variable,
      operador: this.propertiesForm.operador,
      value: this.propertiesForm.value,
      mergeStrategy: this.propertiesForm.mergeStrategy,

      ...documentUserData,
    });

    this.workflowCollaborationService.sendDiagramUpdate(this.graph.toJSON());
    this.closePropertiesPanel();
  }

  private applyGlobalRequirements(): void {
    if (!this.propertiesForm) return;

    this.globalRequirements = {
      description: this.propertiesForm.description,
      document: this.propertiesForm.requirements?.document || false,
      photo: this.propertiesForm.requirements?.photo || false,
      video: this.propertiesForm.requirements?.video || false,
      audio: this.propertiesForm.requirements?.audio || false,
      mediaLabels: this.propertiesForm.mediaLabels || {
        document: '',
        photo: '',
        video: '',
        audio: '',
      },
      customFields: this.propertiesForm.customFields || [],
    };

    this.closePropertiesPanel();
  }

  handleDragStartNode(data: any): void {
    this.draggedNodeInfo = data;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    if (!this.draggedNodeInfo || !this.paper) return;

    const localPoint = this.paper.clientToLocalPoint({
      x: event.clientX,
      y: event.clientY,
    });

    this.editorCanvasService.createJointNode(
      this.graph,
      localPoint.x,
      localPoint.y,
      this.draggedNodeInfo
    );

    this.draggedNodeInfo = null;
  }

  addCustomField(): void {
    if (!this.propertiesForm) return;

    if (!this.propertiesForm.customFields) {
      this.propertiesForm.customFields = [];
    }

    this.propertiesForm.customFields.push({
      id: 'field_' + Date.now(),
      label: '',
      type: 'text',
      options: [],
      rawOptions: '',
    });

    this.cdr.detectChanges();
  }

  removeCustomField(index: number): void {
    if (!this.propertiesForm?.customFields) return;

    this.propertiesForm.customFields.splice(index, 1);
    this.cdr.detectChanges();
  }

  syncOptions(field: any): void {
    if (!field.rawOptions) return;

    field.options = field.rawOptions
      .split(',')
      .map((option: string) => option.trim())
      .filter((option: string) => option.length > 0);
  }

  addRequiredDocument(): void {
    if (!this.propertiesForm) return;

    this.propertiesForm =
      this.workflowDocumentConfigService.addRequiredDocument(
        this.propertiesForm
      );

    this.cdr.detectChanges();
  }

  removeRequiredDocument(index: number): void {
    if (!this.propertiesForm) return;

    this.propertiesForm =
      this.workflowDocumentConfigService.removeRequiredDocument(
        this.propertiesForm,
        index
      );

    this.cdr.detectChanges();
  }

  trackByIndex(index: number): number {
    return index;
  }

  getLockedNodesArray(): any[] {
    if (!this.paper || !this.graph) return [];

    const scale = this.paper.scale().sx;
    const translate = this.paper.translate();

    return Object.keys(this.lockedNodes)
      .map((id) => {
        const cell = this.graph.getCell(id) as joint.dia.Element;

        if (!cell || !cell.position || cell.get('isLane')) return null;

        const position = cell.position();
        const size = cell.size();

        const x = position.x * scale + translate.tx + (size.width * scale) / 2;
        const y = position.y * scale + translate.ty;

        return {
          id,
          user: this.lockedNodes[id],
          transform: `translate(${x}px, ${y}px) translateX(-50%)`,
        };
      })
      .filter((item) => item !== null);
  }

  toggleCopilot(): void {
    this.isCopilotOpen = !this.isCopilotOpen;
  }

  askCopilot(userMessage: string): void {
    this.chatMessages.push({
      role: 'user',
      content: userMessage,
    });

    this.isAiTyping = true;
    this.cdr.detectChanges();

    const diagramSnapshot = this.getCurrentDiagramSnapshot();

    this.workflowAiService.askJarvis(userMessage, diagramSnapshot).subscribe({
      next: (response) => {
        this.isAiTyping = false;
        this.chatMessages.push(response);

        if (response.hasAction && response.actionPayload) {
          this.applyAiSuggestion(response.actionPayload);
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isAiTyping = false;
        console.error('Error consultando a Jarvis:', error);

        this.chatMessages.push({
          role: 'assistant',
          content:
            'Tuve un problema al conectarme con Jarvis. Revisa que FastAPI esté ejecutándose.',
        });

        this.cdr.detectChanges();
      },
    });
  }

  launchJarvisOnboarding(): void {
    this.isCopilotOpen = true;
    this.isAiTyping = true;
    this.cdr.detectChanges();

    const systemPrompt = this.workflowAiService.buildOnboardingPrompt();
    const diagramSnapshot = this.getCurrentDiagramSnapshot();

    this.workflowAiService.askJarvis(systemPrompt, diagramSnapshot).subscribe({
      next: (response) => {
        this.isAiTyping = false;
        this.chatMessages.push(response);
        this.cdr.detectChanges();

        if (response.content) {
          this.speakText(response.content);
        }

        if (response.hasAction && response.actionPayload?.tour) {
          this.startVisualTour(response.actionPayload.tour);
        }
      },
      error: (error) => {
        this.isAiTyping = false;
        console.error('Error conectando con Jarvis:', error);
      },
    });

    localStorage.setItem('has_seen_tour', 'true');
  }

  private getCurrentDiagramSnapshot(): any {
  if (!this.graph) {
    return {
      nodes: [],
      edges: [],
      swimlanes: [],
      policy: null,
      workflow: null,
      jointEngineState: null,
    };
  }

  const serializedWorkflow = this.workflowSerializerService.serializeWorkflow(
    this.graph,
    this.globalRequirements
  );

  return {
    policy: this.selectedPolicy
      ? {
          id: this.extractPolicyId(this.selectedPolicy),
          name: this.selectedPolicy.name,
          description: this.selectedPolicy.description,
          status: this.selectedPolicy.status,
          version: this.selectedPolicy.version,
        }
      : null,

    nodes: serializedWorkflow.nodes || [],
    edges: serializedWorkflow.edges || [],
    swimlanes: serializedWorkflow.swimlanes || [],
    globalRequirements: serializedWorkflow.globalRequirements,

    workflow: serializedWorkflow,

    jointEngineState: this.graph.toJSON(),
  };
}

  applyAiSuggestion(payload: any): void {
    if (!payload) return;

    if (payload.tour) {
      this.startVisualTour(payload.tour);
      return;
    }

    this.editorCanvasService.applyAiSuggestion?.(
      this.graph,
      this.paper,
      this.paperContainer.nativeElement,
      payload
    );

    this.workflowCollaborationService.sendDiagramUpdate(this.graph.toJSON());
  }

  private speakText(text: string): void {
  // Se desactivó el audio automático para siempre 🤫
  return; 

  /* if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  */
}

  startVisualTour(tourType: string): void {
    this.isCopilotOpen = false;
    this.cdr.detectChanges();

    if (tourType !== 'admin_basics') return;

    const tourObject = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'mi-tema-oscuro',
      steps: [
        {
          element: '#tour-policy-info',
          popover: {
            title: 'Identificación de la Política',
            description:
              'Aquí puedes editar el nombre y la descripción de tu diagrama en cualquier momento.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-requirements',
          popover: {
            title: 'Requisitos Globales',
            description:
              'Aquí defines documentos o evidencias generales para todo el trámite.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: 'app-flow-sidebar',
          popover: {
            title: 'Librería de Nodos',
            description:
              'Desde aquí puedes arrastrar tareas, bifurcaciones y uniones al lienzo.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#canvas-container',
          popover: {
            title: 'Lienzo de Diseño',
            description:
              'Arrastra nodos, conéctalos y configura sus propiedades.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-publish',
          popover: {
            title: 'Publicación',
            description:
              'Aquí puedes publicar la política para que pueda ejecutarse en el motor.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-copilot',
          popover: {
            title: 'Tu ChatBot IA',
            description:
              'Abre ChatBot IA para auditar, validar o modificar el diagrama con asistencia IA.',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    });

    tourObject.drive();
  }
}