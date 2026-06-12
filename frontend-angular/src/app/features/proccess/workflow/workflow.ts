import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as joint from '@joint/core';
import { FlowSidebarComponent } from '../../../ui/components/flow-sidebar/flow-sidebar.component';
import { DepartmentService } from '../../Acceso_y_Seguridad/departments/services/department.service';
import { ApiService } from '../policy/services/api.service';
import { Policy } from '../policy/models/policy.model';
import { WebSocketService } from './services/websocket.service';
import { AiCopilotComponent, ChatMessage } from '../../../ui/components/modal-ia/ia-copilot.component';
import { CopilotService, ChatMessage1 } from './services/copilot.service';
import { driver } from "driver.js";


interface NodeRequirements {
  [key: string]: any;
  document: boolean;
  photo: boolean;
  video: boolean;
  audio: boolean;
}

export interface MediaLabels {
  [key: string]: any;
  document: string;
  photo: string;
  video: string;
  audio: string;
}


const WorkflowLane = joint.shapes.standard.Rectangle.define('workflow.Lane', {
  attrs: {
    body: { fill: '#141414', stroke: '#3f3f46', strokeWidth: 2, strokeDasharray: '4,4', rx: 4, ry: 4, refWidth: '100%', refHeight: '100%' },
    label: { fontSize: 16, fontWeight: 'bold', fill: '#a1a1aa', refX: '0%', refY: 20, textAnchor: 'middle', textVerticalAnchor: 'middle' }
  }
}, {
  markup: [{ tagName: 'rect', selector: 'body' }, { tagName: 'text', selector: 'label' }]
});

// IMPORTANTÍSIMO: Inyectar la clase custom en el namespace global de JointJS
// para que `graph.fromJSON()` sepa cómo reconstruir los departamentos (Lanes)
Object.assign(joint.shapes, {
  workflow: {
    Lane: WorkflowLane
  }
});

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [CommonModule, FlowSidebarComponent, FormsModule, AiCopilotComponent], // Importante incluirlo aquí
  templateUrl: './workflow.html',
  styles: [`:host { display: block; height: 100vh; width: 100%; }`]
})
export class Workflow implements OnInit {

  public isCopilotOpen: boolean = false;
  public chatMessages: ChatMessage1[] = [
    { role: 'assistant', content: '¡Hola! Soy Jarvis. Estoy listo para ayudarte con tu política.' }
  ];

  public isAiTyping: boolean = false;

  @ViewChild('paperContainer', { static: false }) set paperContainerSetter(element: ElementRef) {
    if (element && !this.paperInitialized) {
      this.paperContainer = element;
      this.paperInitialized = true;
      // Iniciar JointJS cuando el DOM del canvas ya exista (superamos el ngIf)
      setTimeout(() => this.initJointJS(), 0);
    }
  }


  private unlockTimeouts: Record<string, any> = {};

  public globalRequirements = {
    description: '',
    document: false,
    photo: false,
    video: false,
    audio: false,
    mediaLabels: { document: '', photo: '', video: '', audio: '' },
    customFields: [] as any[]
  };


  public paperContainer!: ElementRef;



  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;

  public departamentos: any[] = [];
  public isLoading: boolean = true;
  public draggedNodeInfo: any = null;

  // -- Políticas --
  public policies: Policy[] = [];
  public selectedPolicy: Policy | null = null;
  public isSelectionMode: boolean = true;
  private paperInitialized: boolean = false;

  // -- Sincronización WebSockets --
  public userName: string = 'User_' + Math.floor(Math.random() * 100);
  public activeUsers: string[] = [];
  public userColors: Record<string, string> = {};
  public otherCursors: Record<string, { x: number, y: number, color: string }> = {};
  public lockedNodes: Record<string, string> = {}; // { nodeId: user }

  public autoSaveInterval: any = null;
  public listRefreshInterval: any = null;

  // -- Panel de Propiedades --
  public selectedElement: joint.dia.Element | null = null;
  public propertiesForm: {
    title: string, id: string, type: string, description: string,
    requirements?: NodeRequirements;
    mediaLabels?: MediaLabels;
    customFields?: any[];
    variable?: string;
    operador?: string;
    value?: string;
    mergeStrategy?: string;
  } | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private deptService: DepartmentService,
    private apiService: ApiService,
    private wsService: WebSocketService,
    private copilotService: CopilotService
  ) { }





  ngOnInit(): void {
    // Almacenar el nombre simulado
    const lUser = localStorage.getItem('user');
    if (lUser) {
      try { this.userName = JSON.parse(lUser).nombre || this.userName; } catch { this.userName = lUser; }
    }
    this.loadDepartments();
    this.loadPolicies();
    this.setupWebSocketListeners();
    //this.checkOnboarding();
  }



  launchJarvisOnboarding() {
    console.log("🤖 Jarvis: Iniciando protocolo de bienvenida...");
    this.isCopilotOpen = true;
    this.isAiTyping = true;
    this.cdr.detectChanges();

    const systemPrompt = `[SYSTEM: INICIAR_ONBOARDING] El usuario ha entrado al editor. Preséntate como Jarvis, dale la bienvenida e invítalo a diseñar su flujo BPMN.`;

    // Tomamos la foto del diagrama (que ahora estamos 100% seguros de que existe)
    const diagramSnapshot = this.getCurrentDiagramSnapshot();

    // Llamamos directo a la API para que sea un mensaje "fantasma"
    this.copilotService.askJarvis(systemPrompt, diagramSnapshot).subscribe({
      next: (response) => {
        this.isAiTyping = false;
        this.chatMessages.push(response);
        this.cdr.detectChanges();

        if (response.content) {
          this.speakText(response.content);
        }

        // Si Jarvis mandó a ejecutar el tour visual (Driver.js)
        if (response.hasAction && response.actionPayload?.tour) {
          this.startVisualTour(response.actionPayload.tour);
        }
      },
      error: (err) => {
        this.isAiTyping = false;
        console.error("Error conectando con Jarvis en el inicio:", err);
      }
    });

    // Marcamos como completado
    localStorage.setItem('has_seen_tour', 'true');
  }


  startVisualTour(tourType: string) {
    this.isCopilotOpen = false;
    this.cdr.detectChanges();

    if (tourType === 'admin_basics') {
      const tourObj = driver({
        showProgress: true,
        animate: true,
        popoverClass: 'mi-tema-oscuro',
        steps: [
          // 1. HEADER: Nombre y Descripción
          {
            element: '#tour-policy-info',
            popover: {
              title: 'Identificación de la Política',
              description: 'Aquí puedes editar el nombre y la descripción de tu diagrama en cualquier momento haciendo clic en el texto.',
              side: "bottom", align: 'start'
            }
          },
          // 2. HEADER: Requisitos
          {
            element: '#tour-requirements',
            popover: {
              title: 'Requisitos Globales',
              description: 'Haz clic aquí para definir qué documentos o evidencias aplican de manera general para todo el trámite.',
              side: "bottom", align: 'center'
            }
          },
          // 3. SIDEBAR: Nodos
          {
            element: 'app-flow-sidebar',
            popover: {
              title: 'Librería de Nodos',
              description: 'Desde aquí puedes arrastrar tareas, bifurcaciones y uniones hacia el lienzo oscuro.',
              side: "right", align: 'start'
            }
          },
          // 4. CANVAS: Área de trabajo
          {
            element: '#canvas-container',
            popover: {
              title: 'Lienzo de Diseño',
              description: 'Tu área de trabajo. Arrastra los nodos aquí, conéctalos, y haz doble clic sobre cualquiera para configurar sus propiedades.',
              side: "top", align: 'center'
            }
          },
          // 5. HEADER: Botón Guardar
          {
            element: '#tour-publish',
            popover: {
              title: 'Guardado Seguro',
              description: 'El sistema guarda tu progreso automáticamente cada 5 segundos, aqui puedes publicar tu politica para que entre en marcha.',
              side: "bottom", align: 'end'
            }
          },
          // 6. HEADER: Botón Copilot
          {
            element: '#tour-copilot',
            popover: {
              title: 'Tu Copiloto IA',
              description: '¿Atascado? Abre a Jarvis para auditar tu diagrama, validar conexiones o pedirle que dibuje estructuras complejas por ti.',
              side: "bottom", align: 'end'
            }
          }
        ]
      });

      tourObj.drive();
    }
  }




  ngOnDestroy(): void {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
  }

  private loadPolicies() {
    this.apiService.getPoliticas().subscribe({
      next: (data) => {
        console.log('--- 📋 LISTA COMPLETA DE POLÍTICAS DESDE EL BACKEND ---');
        console.log(data);
        console.log('-----------------------------------------------------');

        this.policies = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando políticas', err)
    });
  }

  openGlobalRequirements() {
    this.propertiesForm = {
      id: 'GLOBAL_POLICY',
      type: 'actividad', // Reutilizamos el panel de actividad que ya tienes
      title: 'REQUISITOS DEL TRÁMITE',
      description: this.globalRequirements.description,
      requirements: this.globalRequirements,
      mediaLabels: this.globalRequirements.mediaLabels || { document: '', photo: '', video: '', audio: '' },
      customFields: this.globalRequirements.customFields
    };
    this.cdr.detectChanges();
  }


  // workflow.ts
  selectPolicy(policy: Policy) {
    let policyId: any = (policy as any)._id || policy.id;
    if (typeof policyId === 'object' && policyId !== null) {
      policyId = policyId.$oid || policyId.toString();
    }
    if (!policyId) return;

    const finalId = String(policyId);

    this.apiService.getPolitica(finalId).subscribe({
      next: (fullPolicy) => {
        // 1. Manejo de nombre y descripción vacíos para nuevos registros
        console.log('📦 DATOS RECIBIDOS DEL BACKEND:', fullPolicy);
        this.selectedPolicy = fullPolicy;
        this.isSelectionMode = false;

        // 2. Cargar Requisitos Globales desde el JSON guardado
        if (fullPolicy.workflow && (fullPolicy.workflow as any).globalRequirements) {
          this.globalRequirements = (fullPolicy.workflow as any).globalRequirements;
        } else {
          // Resetear si es una política limpia
          this.globalRequirements = {
            description: '',
            document: false,
            photo: false,
            video: false,
            audio: false,
            mediaLabels: { document: '', photo: '', video: '', audio: '' },
            customFields: []
          };
        }

        this.wsService.connect(finalId, this.userName);
        this.wsService.send({ type: 'presence', action: 'joined', user: this.userName });

        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = setInterval(() => {
          // Solo guardamos si hay cambios reales y estamos en el editor
          if (this.graph && this.selectedPolicy && !this.isSelectionMode) {
            this.savePolicy(true); // 'true' para que no muestre alerts molestos
          }
        }, 5000);

        this.cdr.detectChanges();

      }
    });
  }

  unselectPolicy() {
    if (this.selectedPolicy) {
      this.wsService.send({ type: 'presence', action: 'left', user: this.userName });
      this.wsService.disconnect();
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
    if (this.graph) this.graph.clear();
    this.loadPolicies(); // Refrescar por si creamos algo nuevo
  }

  deletePolicy(event: Event, id: string) {
    event.stopPropagation(); // Evitar que abra el panel
    if (confirm('¿Estás seguro de eliminar esta Política? Toda la configuración se perderá.')) {
      this.apiService.eliminarPolitica(id).subscribe({
        next: () => this.loadPolicies(),
        error: (err) => {
          console.error('Error eliminando', err);
          alert('Hubo un problema al eliminar la política.');
        }
      });
    }
  }

  createNewPolicy() {
    const draft: Policy = {
      name: 'Nueva Política Sin Título',
      description: 'Política creada de forma interactiva.',
      status: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('--- SOLICITANDO CREACIÓN AL BACKEND ---', draft);

    this.apiService.sincronizarPolitica(draft).subscribe({
      next: (insertedPolicy) => {
        console.log('Creada:', insertedPolicy);
        this.loadPolicies();
        // Ir de inmediato al lienzo seleccionando la recien creada
        this.selectPolicy(insertedPolicy);
      },
      error: (e) => {
        console.error('Error creando política:', e);
        alert('No se pudo crear la política en el servidor Dto');
      }
    });
  }


  togglePublish() {
    if (!this.selectedPolicy) return;

    const nuevoEstado = !this.selectedPolicy.status;

    // Si el usuario intenta despublicar, advertimos
    if (!nuevoEstado) {
      if (!confirm('¿Estás seguro de despublicar? Esto impedirá que se inicien nuevos trámites con esta política.')) {
        return;
      }
    }

    // Cambiamos el estado localmente para la petición
    this.selectedPolicy.status = nuevoEstado;

    // Enviamos al backend. Si hay instancias activas, el backend responderá con error
    this.apiService.sincronizarPolitica(this.selectedPolicy).subscribe({
      next: () => {
        const msg = this.selectedPolicy?.status ? '🚀 Política Publicada' : '📁 Política en modo Borrador';
        console.log(msg);
      },
      error: (err) => {
        // Revertimos el cambio visual si el backend rechazó la operación
        this.selectedPolicy!.status = !nuevoEstado;
        alert(err.error || 'No se pudo cambiar el estado. Es posible que la política ya esté en uso.');
      }
    });
  }


  savePolicy(silent: boolean = false) {
    if (!this.selectedPolicy) return;

    // Si la política está publicada (status === true), bloqueamos el envío de datos al servidor
    if (this.selectedPolicy.status) {
      if (!silent) console.log('🔏 Política bloqueada (Publicada). No se permiten cambios.');
      return; // 🛑 Cortamos la ejecución aquí
    }

    const elements = this.graph.getElements();
    const links = this.graph.getLinks();

    // 1. Estructura Limpia (DTO para MongoDB/Spring Boot)
    const cleanWorkflow = {
      // Requisitos globales del trámite (configurados en el header)
      globalRequirements: this.globalRequirements,

      // Departamentos (Swimlanes)
      swimlanes: elements.filter(el => el.get('isLane')).map((lane, index) => {
        // Intentamos obtener el ID de cualquier propiedad donde se haya podido guardar
        const deptoIdFinal = lane.get('departmentId') || lane.get('departament') || 'unknown';

        return {
          id: String(lane.id),
          name: lane.attr('label/text'),
          departmentId: deptoIdFinal, // 👈 Ahora sí llevará el ID de MongoDB
          order: index
        };
      }),

      // Nodos de ejecución y control
      nodes: elements.filter(el => !el.get('isLane')).map(node => {
        const config = node.get('userData') || {};
        const pos = node.position();

        return {
          id: String(node.id),
          type: node.get('nodeType'), // 'actividad', 'if', 'join', etc.
          name: node.attr('label/text'),
          description: node.get('nodeDescription') || null,
          swimlaneId: node.get('parent') || null, // A qué departamento pertenece
          // Configuración específica para el motor de Spring Boot
          configuration: {
            multimedia: config.requirements || null,
            mediaLabels: config.mediaLabels || null,
            formFields: config.customFields || [],
            logic: {
              variable: config.variable || null,
              operator: config.operador || null,
              value: config.value || null,
              mergeStrategy: config.mergeStrategy || null
            }
          },
          // Metadatos para recrear la posición si fuera necesario
          metadata: { x: pos.x, y: pos.y }
        };
      }),

      // 3. Convertir IDs de las Conexiones
      edges: links.map(link => ({
        id: String(link.id),
        sourceNodeId: String(link.source().id), // 👈 CAMBIADO de sourceId a sourceNodeId
        sourcePort: link.source().port,
        targetNodeId: String(link.target().id), // 👈 CAMBIADO de targetId a targetNodeId
        targetPort: link.target().port,
        label: link.labels()[0]?.attrs?.['text']?.['text'] || link.labels()[0]?.attrs?.['label']?.['text'] || ''
      }))
    };

    // 2. Adjuntar al objeto de la política
    this.selectedPolicy.workflow = cleanWorkflow;

    // Opcional: Guardamos el estado completo de JointJS solo para la UI
    (this.selectedPolicy as any).jointEngineState = this.graph.toJSON();

    // 3. LOG EN CONSOLA (Datos que recibe el Back)
    console.log('📡 [AUTO-SAVE] Enviando datos limpios a MongoDB:', cleanWorkflow);

    // 4. Envío al Servidor
    this.apiService.sincronizarPolitica(this.selectedPolicy).subscribe({
      next: () => {
        if (!silent) console.log('✅ Sincronización manual exitosa');
      },
      error: (err) => console.error('❌ Error en autoguardado:', err)
    });
  }

  private getUserColor(user: string): string {
    if (!this.userColors[user]) {
      const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
      this.userColors[user] = colors[Math.floor(Math.random() * colors.length)];
    }
    return this.userColors[user];
  }

  private setupWebSocketListeners(): void {
    this.wsService.messages$.subscribe((data) => {
      if (data.user === this.userName) return;

      switch (data.type) {
        case 'presence':
          if (data.action === 'joined' && !this.activeUsers.includes(data.user)) {
            this.activeUsers.push(data.user);
            this.getUserColor(data.user); // Asignar color al unirse

            // Si el lienzo actual tiene elementos, mandarlo al recien llegado para que no vea todo vacío
            if (this.graph && this.graph.getCells().length > 0) {
              this.wsService.send({ type: 'graph_update', user: this.userName, data: this.graph.toJSON() });
            }
          } else if (data.action === 'left') {
            this.activeUsers = this.activeUsers.filter(u => u !== data.user);
            const cursorsCopy = { ...this.otherCursors };
            delete cursorsCopy[data.user];
            this.otherCursors = cursorsCopy;
          }
          break;
        case 'cursor':
          this.otherCursors = {
            ...this.otherCursors,
            [data.user]: { x: data.x, y: data.y, color: this.getUserColor(data.user) }
          };
          if (!this.activeUsers.includes(data.user)) this.activeUsers.push(data.user);
          break;
        case 'node_lock':
          this.lockedNodes[data.nodeId] = data.user;
          this.applyNodeColor(data.nodeId, true);
          break;
        case 'node_unlock':
          delete this.lockedNodes[data.nodeId];
          this.applyNodeColor(data.nodeId, false);
          break;
        case 'cell_change':
          const tCell = this.graph.getCell(data.cellId);
          if (tCell && data.changes && data.changes.position) {
            tCell.set('position', data.changes.position, { remote: true });
          }
          break;
        case 'graph_update':
          if (this.graph && data.data) {
            this.graph.fromJSON(data.data, { remote: true });
          }
          break;
      }
      this.cdr.detectChanges();
    });
  }

  private setupGraphSync(): void {
    // Parámetros correctos de Backbone: add/remove manda model, collection, options
    this.graph.on('add remove', (cell, collection, opt) => {
      if (opt && opt.remote) return;
      this.wsService.send({ type: 'graph_update', user: this.userName, data: this.graph.toJSON() });
    });

    // change de atributos manda model, valor, options
    this.graph.on('change:source change:target change:vertices', (cell, value, opt) => {
      if (opt && opt.remote) return;
      this.wsService.send({ type: 'graph_update', user: this.userName, data: this.graph.toJSON() });
    });

    // Movimiento individual enviado como paquete lígero
    this.graph.on('change:position', (cell, newPos, opt) => {
      if (opt && opt.remote) return;
      this.wsService.send({ type: 'cell_change', user: this.userName, cellId: cell.id, changes: { position: newPos } });
    });
  }

  private applyNodeColor(id: string, isLocked: boolean) {
    const cell = this.graph.getCell(id) as joint.dia.Element;
    if (!cell || cell.get('isLane')) return; // No pintamos de rojo la calle entera

    if (isLocked) {
      if (!cell.get('originalStroke')) cell.set('originalStroke', cell.attr('body/stroke'));
      cell.attr('body/stroke', '#ef4444'); // Borde Rojo
      cell.attr('body/strokeWidth', 4);
    } else {
      const origStroke = cell.get('originalStroke');
      if (origStroke) cell.attr('body/stroke', origStroke);
      cell.attr('body/strokeWidth', 2);
      cell.unset('originalStroke');
    }
  }

  private loadDepartments() {
    this.deptService.getDepartments().subscribe({
      next: (data) => {
        this.departamentos = data.map(d => ({
          id: d.id,
          name: d.name
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando departamentos:', err);
        this.isLoading = false;
      }
    });
  }

  initJointJS(): void {
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    this.paper = new joint.dia.Paper({
      el: this.paperContainer.nativeElement,
      model: this.graph,
      width: '100%',
      height: '100%',
      gridSize: 20,
      drawGrid: { name: 'dot', args: { color: '#164e63', thickness: 1 } },
      background: { color: '#06101d' },
      interactive: true,
      linkPinning: false,

      embeddingMode: true,
      fromtParentOnly: false,
      validateEmbedding: (childView, parentView) => {
        return parentView.model.get('isLane') === true;
      },

      // -- Lógica de Conexiones --
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
          line: {
            stroke: '#22d3ee',
            strokeWidth: 2,
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 0 0 10 5 Z',
              fill: '#22d3ee',
              stroke: 'none'
            }
          }
        },
        router: {
          name: 'manhattan'
        },
        connector: {
          name: 'rounded'
        }
      }),
      validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
        if (sourceView === targetView) return false;
        const targetGroup = targetMagnet?.getAttribute('port-group') || '';
        return targetGroup.startsWith('in');
      },
      validateMagnet: (cellView, magnet) => {
        const magnetGroup = magnet?.getAttribute('port-group') || '';
        return !magnetGroup.startsWith('in');
      },
      snapLinks: { radius: 20 },

    });

    // --- SETUP ZOOM AND PAN ---

    // Zoom in/out con la rueda del ratón
    this.paper.on('blank:mousewheel', (evt: any, x: number, y: number, delta: number) => {
      evt.preventDefault();
      const currentScale = this.paper.scale().sx;
      // Incremento suave: delta puede ser muy grande en algunos mouses, controlamos la velocidad
      const scaleDelta = delta > 0 ? 0.1 : -0.1;
      const newScale = Math.max(0.2, Math.min(3, currentScale + scaleDelta));

      // Realizamos zoom hacia el centro aproximado
      this.paper.scale(newScale, newScale);
    });

    // Paneo (arrastrar lienzo en blanco)
    let panning = false;
    let origin: any;

    this.paper.on('blank:pointerdown', (evt: any, x: number, y: number) => {
      panning = true;
      origin = { x: evt.clientX, y: evt.clientY };
    });

    // JointJS también propaga eventos al document, pero es seguro capturar on mousemove en el espacio local
    this.paper.on('blank:pointermove', (evt: any, x: number, y: number) => {
      if (!panning) return;
      const currentTranslate = this.paper.translate();
      const dx = evt.clientX - origin.x;
      const dy = evt.clientY - origin.y;

      this.paper.translate(currentTranslate.tx + dx, currentTranslate.ty + dy);
      origin = { x: evt.clientX, y: evt.clientY };
    });

    this.paper.on('blank:pointerup', () => {
      panning = false;
    });

    // Eliminar nodo con DOBLE CLIC
    // --- HERRAMIENTAS DE NODO (BOTÓN ELIMINAR) ---
    this.paper.on('element:mouseenter', (elementView) => {
      const model = elementView.model;
      if (model.get('isLane')) return; // No permitimos borrar el departamento así de fácil

      const removeButton = new joint.elementTools.Remove({
        x: '100%', // Posición X (esquina derecha)
        y: 0,      // Posición Y (esquina superior)
        offset: { x: -12, y: 12 }, // Ajuste fino para que sobresalga un poco
        markup: [{
          tagName: 'circle',
          selector: 'button',
          attributes: {
            'r': 10,
            'fill': '#ef4444',
            'cursor': 'pointer',
            'stroke': '#06101d',
            'stroke-width': 2
          }
        }, {
          tagName: 'path',
          selector: 'icon',
          attributes: {
            'd': 'M -4 -4 L 4 4 M -4 4 L 4 -4',
            'stroke': '#ffffff',
            'stroke-width': 2,
            'pointer-events': 'none'
          }
        }]
      });

      const toolsView = new joint.dia.ToolsView({
        tools: [removeButton]
      });

      elementView.addTools(toolsView);
    });

    this.paper.on('element:mouseleave', (elementView) => {
      elementView.removeTools();
    });


    // --- ELIMINAR FLECHAS AL PASAR EL MOUSE ---
    this.paper.on('link:mouseenter', (linkView) => {
      const removeButton = new joint.linkTools.Remove({
        distance: '50%', // Aparece exactamente en el medio de la línea
        markup: [
          {
            tagName: 'circle',
            selector: 'button',
            attributes: { r: 10, fill: '#ef4444', cursor: 'pointer', stroke: '#1a1a1a', 'stroke-width': 2 }
          },
          {
            tagName: 'path',
            selector: 'icon',
            attributes: {
              d: 'M -4 -4 L 4 4 M -4 4 L 4 -4', // Dibuja una 'X'
              fill: 'none', stroke: '#ffffff', 'stroke-width': 2, cursor: 'pointer'
            }
          }
        ]
      });

      const toolsView = new joint.dia.ToolsView({ tools: [removeButton] });
      linkView.addTools(toolsView);
    });

    this.paper.on('link:mouseleave', (linkView) => {
      linkView.removeTools(); // Oculta el botón cuando quitas el mouse
    });
    // --- Colaboración Triggers ---

    // 1. Mandar Posición del Cursor
    this.paper.el.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.wsService.isConnected()) {
        // Ajuste de traslación del paper a cord local de visualización
        const bounds = this.paperContainer.nativeElement.getBoundingClientRect();
        const rawX = e.clientX - bounds.left;
        const rawY = e.clientY - bounds.top;
        this.wsService.send({ type: 'cursor', user: this.userName, x: rawX, y: rawY });
      }
    });

    // 2. Lock al atrapar un nodo
    this.paper.on('element:pointerdown', (elementView, evt) => {
      const id = elementView.model.id as string;
      if (this.lockedNodes[id] && this.lockedNodes[id] !== this.userName) {
        evt.preventDefault(); // Rechazar manipulación si es de otro
        evt.stopPropagation();
        return;
      }
      if (this.unlockTimeouts[id]) { clearTimeout(this.unlockTimeouts[id]); delete this.unlockTimeouts[id]; }

      this.wsService.send({ type: 'node_lock', nodeId: id, user: this.userName });
    });

    // 3. Liberar (Unlock)
    this.paper.on('element:pointerup', (elementView) => {
      const id = elementView.model.id as string;

      // Esperamos 150ms para ver si este "soltar" se convierte en un "click" (abre panel)
      this.unlockTimeouts[id] = setTimeout(() => {
        // Si el panel de configuración está abierto PARA ESTE NODO, abortamos el desbloqueo
        if (this.selectedElement && this.selectedElement.id === id) {
          return;
        }
        // Si no se abrió el panel (ej. solo lo arrastró), lo desbloqueamos
        this.wsService.send({ type: 'node_unlock', nodeId: id, user: this.userName });
      }, 150);
    });

    // 4. Panel de Propiedades (Un clic para abrir)
    this.paper.on('element:pointerclick', (elementView) => {
      const model = elementView.model as joint.dia.Element;
      const id = model.id as string;

      if (model.get('isLane')) return;

      // 🔒 VALIDACIÓN: No puedes abrir el panel si otro lo tiene ocupado
      if (this.lockedNodes[id] && this.lockedNodes[id] !== this.userName) {
        console.warn(`⚠️ El nodo está siendo editado por ${this.lockedNodes[id]}`);
        return;
      }
      this.selectedElement = model;
      const savedData = model.get('userData') || {};

      // LEEMOS LA CONSTANTE QUE ASIGNAMOS ARRIBA
      const tipoNodo = model.get('nodeType');

      this.propertiesForm = {
        id: model.id as string,
        type: tipoNodo, // Aquí se guarda: 'actividad', 'if', etc.
        title: (model.attr('label/text') || '').toString().trim(),
        description: model.get('nodeDescription') || '',
        requirements: savedData.requirements || { document: false, photo: false, video: false, audio: false },
        mediaLabels: savedData.mediaLabels || { document: '', photo: '', video: '', audio: '' },
        customFields: savedData.customFields || [],
        variable: savedData.variable || '',
        operador: savedData.operador || '==',
        value: savedData.value || '',
        mergeStrategy: savedData.mergeStrategy || 'first_come'
      };
      this.cdr.detectChanges();
    });




    // Cerrar panel al tocar el lienzo
    this.paper.on('blank:pointerdown', () => {
      this.closePropertiesPanel();
    });

    // Arrancar sinc de Grafo
    this.setupGraphSync();

    // Restaurar el dibujo en el Lienzo si la base de datos lo tiene almacenado
    if (this.selectedPolicy && (this.selectedPolicy as any).jointEngineState) {
      console.log('Restaurando lienzo de JointJS desde jointEngineState...');

      // Le damos 100ms para asegurar que Angular ya le dio tamaño al div del canvas
      setTimeout(() => {
        try {
          let state = (this.selectedPolicy as any).jointEngineState;

          // 1. Por si Spring Boot lo devuelve como texto (String), lo convertimos a Objeto
          if (typeof state === 'string') {
            state = JSON.parse(state);
          }

          // 2. Inyectamos los datos al gráfico
          this.graph.fromJSON(state, { remote: true });

          // 3. 🚀 ESTO ES CLAVE: Centra la cámara automáticamente en el dibujo recuperado
          // Evita que el diagrama cargue fuera del campo visual de la pantalla
          this.paper.scaleContentToFit({ padding: 50, maxScale: 1 });

          console.log('¡Restauración de figuras exitosa!');
        } catch (error) {
          console.error('Error inyectando el Layout a JointJS:', error);
        }
      }, 100);
    }
    setTimeout(() => {
      const hasSeenTour = localStorage.getItem('has_seen_tour');
      if (!hasSeenTour) {
        this.launchJarvisOnboarding();
      }
    }, 500);
  }

  closePropertiesPanel() {
    // 🚀 NUEVO: Desbloqueamos el nodo al cerrar el panel
    if (this.selectedElement) {
      this.wsService.send({ type: 'node_unlock', nodeId: this.selectedElement.id as string, user: this.userName });
    }
    this.selectedElement = null;
    this.propertiesForm = null;
    this.cdr.detectChanges();
  }

  // workflow.ts

  applyProperties() {
    if (!this.propertiesForm) return;

    if (this.propertiesForm.id === 'GLOBAL_POLICY') {
      // Guardamos en la variable global de la clase
      this.globalRequirements = {
        description: this.propertiesForm.description,
        document: this.propertiesForm.requirements?.['document'] || false,
        photo: this.propertiesForm.requirements?.['photo'] || false,
        video: this.propertiesForm.requirements?.['video'] || false,
        audio: this.propertiesForm.requirements?.['audio'] || false,
        mediaLabels: this.propertiesForm.mediaLabels || { document: '', photo: '', video: '', audio: '' },
        customFields: this.propertiesForm.customFields || []
      };
      this.closePropertiesPanel();
      return;
    }

    if (!this.selectedElement) return;

    const model = this.selectedElement;
    model.attr('label/text', this.propertiesForm.title.toUpperCase());
    model.set('nodeDescription', this.propertiesForm.description);

    // 🚀 ACTUALIZACIÓN: Guardamos absolutamente todo el modelo de datos
    model.set('userData', {
      requirements: this.propertiesForm.requirements,
      mediaLabels: this.propertiesForm.mediaLabels,
      customFields: this.propertiesForm.customFields,
      variable: this.propertiesForm.variable,
      operador: this.propertiesForm.operador,
      value: this.propertiesForm.value,
      mergeStrategy: this.propertiesForm.mergeStrategy // 👈 No estaba en tu archivo
    });

    this.wsService.send({ type: 'graph_update', user: this.userName, data: this.graph.toJSON() });
    this.closePropertiesPanel();
  }

  // --- MÉTODOS DE COMUNICACIÓN CON EL SIDEBAR ---

  handleDragStartNode(data: any) {
    this.draggedNodeInfo = data;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!this.draggedNodeInfo) return;

    // Convertir a coordenadas locales de JointJS (considerando zoom y paneo)
    const localPoint = this.paper.clientToLocalPoint({ x: event.clientX, y: event.clientY });

    this.createJointNode(localPoint.x, localPoint.y, this.draggedNodeInfo);

    this.draggedNodeInfo = null; // Limpiamos
  }

  private createJointNode(x: number, y: number, info: any): void {
    const { nodeType, label, isLane, dimension } = info;
    let node: joint.dia.Element;

    const theme = {
      canvasDark: '#06101d',
      surface: '#08111f',
      surfaceSoft: '#0b1628',
      surfaceMuted: '#102033',

      text: '#f8fafc',
      textMuted: '#94a3b8',
      textSoft: '#cbd5e1',

      cyan: '#22d3ee',
      cyanSoft: '#67e8f9',
      cyanDark: '#0891b2',

      blue: '#3b82f6',
      blueSoft: '#93c5fd',

      success: '#14b8a6',
      danger: '#ef4444',
      warning: '#f59e0b',
      violet: '#8b5cf6',

      border: '#164e63',
      borderSoft: '#0e7490',
      portStroke: '#06101d',
      white: '#ffffff'
    };

    const createPort = (
      position: 'top' | 'bottom' | 'left' | 'right',
      options: {
        id?: string;
        groupName?: string;
        magnet: boolean | 'passive';
        fill: string;
        stroke?: string;
        radius?: number;
        strokeWidth?: number;
      }
    ) => ({
      position,
      attrs: {
        circle: {
          r: options.radius ?? 5,
          magnet: options.magnet,
          fill: options.fill,
          stroke: options.stroke ?? theme.portStroke,
          strokeWidth: options.strokeWidth ?? 2
        }
      }
    });

    const inOutPorts = {
      groups: {
        in: createPort('top', {
          magnet: 'passive',
          fill: theme.surfaceSoft,
          stroke: theme.cyanDark
        }),
        out: createPort('bottom', {
          magnet: true,
          fill: theme.cyan,
          stroke: theme.portStroke
        })
      },
      items: [
        { group: 'in', id: 'in' },
        { group: 'out', id: 'out' }
      ]
    };

    if (isLane || nodeType === 'lane') {
      node = new WorkflowLane();

      node.position(x, y);
      node.resize(300, 600);
      node.set('isLane', true);
      node.set('z', -1);

      const departmentId = info.deptoId || info.departmentId || info.departament;
      node.set('departmentId', departmentId);

      node.attr('label/text', label.toUpperCase());
    }

    else if (nodeType === 'start') {
      node = new joint.shapes.standard.Circle();

      node.position(x - 20, y - 20);
      node.resize(40, 40);
      node.set('nodeType', 'start');

      node.attr({
        body: {
          fill: theme.cyan,
          stroke: theme.cyanDark,
          strokeWidth: 4,
          magnet: true
        },
        label: {
          text: 'INICIO',
          fill: theme.cyanSoft,
          fontSize: 9,
          fontWeight: 'bold',
          textVerticalAnchor: 'bottom',
          refY: '-15'
        }
      });
    }

    else if (nodeType === 'end') {
      node = new joint.shapes.standard.Circle();

      node.position(x - 20, y - 20);
      node.resize(40, 40);
      node.set('nodeType', 'end');

      node.attr({
        body: {
          fill: theme.surface,
          stroke: theme.danger,
          strokeWidth: 5
        },
        label: {
          text: 'FIN',
          fill: theme.danger,
          fontSize: 9,
          fontWeight: 'bold',
          textVerticalAnchor: 'top',
          refY: 55
        }
      });

      node.set('ports', {
        groups: {
          in: inOutPorts.groups.in
        },
        items: [
          { group: 'in', id: 'in' }
        ]
      });
    }

    else if (nodeType === 'decision' || nodeType === 'if') {
      node = new joint.shapes.standard.Polygon();

      node.position(x - 30, y - 30);
      node.resize(60, 60);
      node.set('nodeType', 'decision');

      node.attr({
        body: {
          refPoints: '10,0 20,10 10,20 0,10',
          fill: theme.surface,
          stroke: theme.warning,
          strokeWidth: 2
        },
        label: {
          text: label || 'IF',
          fill: '#fde68a',
          fontSize: 10,
          fontWeight: 'bold',
          refY: '100%',
          refY2: 5
        }
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: theme.surfaceSoft,
            stroke: theme.warning
          }),

          outTrue: {
            position: 'right',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                fill: theme.success,
                stroke: theme.portStroke,
                strokeWidth: 2
              }
            },
            label: {
              position: { name: 'right' },
              markup: [
                {
                  tagName: 'text',
                  textContent: 'V',
                  style: {
                    fill: theme.success,
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }
                }
              ]
            }
          },

          outFalse: {
            position: 'bottom',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                fill: theme.danger,
                stroke: theme.portStroke,
                strokeWidth: 2
              }
            },
            label: {
              position: { name: 'bottom' },
              markup: [
                {
                  tagName: 'text',
                  textContent: 'F',
                  style: {
                    fill: theme.danger,
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }
                }
              ]
            }
          }
        },
        items: [
          { group: 'in', id: 'in' },
          { group: 'outTrue', id: 'out-true' },
          { group: 'outFalse', id: 'out-false' }
        ]
      });
    }

    else if (nodeType === 'fork') {
      node = new joint.shapes.standard.Rectangle();

      node.position(x - 50, y - 5);
      node.resize(100, 8);
      node.set('nodeType', 'fork');

      node.attr({
        body: {
          fill: theme.blue,
          stroke: theme.blueSoft,
          strokeWidth: 1,
          rx: 2,
          ry: 2,
          magnet: true
        },
        label: {
          text: label || 'FORK',
          fill: theme.textMuted,
          fontSize: 9,
          fontWeight: 'bold',
          refY: -18
        }
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: theme.surfaceSoft,
            stroke: theme.blueSoft,
            radius: 3,
            strokeWidth: 1
          }),
          out: createPort('bottom', {
            magnet: true,
            fill: theme.blue,
            stroke: theme.portStroke,
            radius: 3,
            strokeWidth: 1
          })
        },
        items: [
          { group: 'in', id: 'f-in' },
          { group: 'out', id: 'f-out1' },
          { group: 'out', id: 'f-out2' },
          { group: 'out', id: 'f-out3' }
        ]
      });
    }

    else if (nodeType === 'join') {
      node = new joint.shapes.standard.Rectangle();

      node.position(x - 50, y - 5);
      node.resize(100, 8);
      node.set('nodeType', 'join');

      node.attr({
        body: {
          fill: theme.cyanDark,
          stroke: theme.cyanSoft,
          strokeWidth: 1,
          rx: 2,
          ry: 2,
          magnet: true
        },
        label: {
          text: label || 'JOIN',
          fill: theme.textMuted,
          fontSize: 9,
          fontWeight: 'bold',
          refY: -18
        }
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: theme.surfaceSoft,
            stroke: theme.cyanSoft,
            radius: 3,
            strokeWidth: 1
          }),
          out: createPort('bottom', {
            magnet: true,
            fill: theme.cyanDark,
            stroke: theme.portStroke,
            radius: 3,
            strokeWidth: 1
          })
        },
        items: [
          { group: 'in', id: 'j-in1' },
          { group: 'in', id: 'j-in2' },
          { group: 'in', id: 'j-in3' },
          { group: 'out', id: 'j-out' }
        ]
      });
    }

    else if (nodeType === 'merge') {
      node = new joint.shapes.standard.Polygon();

      node.position(x - 30, y - 30);
      node.resize(60, 60);
      node.set('nodeType', 'merge');

      node.attr({
        body: {
          refPoints: '10,0 20,10 10,20 0,10',
          fill: theme.surface,
          stroke: theme.violet,
          strokeWidth: 2
        },
        label: {
          text: label || 'MERGE',
          fill: '#c4b5fd',
          fontSize: 10,
          fontWeight: 'bold',
          refY: '100%',
          refY2: 5
        }
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: theme.surfaceSoft,
            stroke: theme.violet
          }),
          inSide: createPort('left', {
            magnet: 'passive',
            fill: theme.surfaceSoft,
            stroke: theme.violet
          }),
          out: createPort('bottom', {
            magnet: true,
            fill: theme.violet,
            stroke: theme.portStroke
          })
        },
        items: [
          { group: 'in', id: 'in-top' },
          { group: 'inSide', id: 'in-left' },
          { group: 'out', id: 'out-next' }
        ]
      });
    }

    else {
      node = new joint.shapes.standard.Rectangle();

      node.position(x - dimension.width / 2, y - dimension.height / 2);
      node.resize(140, 70);
      node.set('nodeType', 'action');

      node.attr({
        body: {
          fill: {
            type: 'linearGradient',
            stops: [
              { offset: '0%', color: theme.surfaceSoft },
              { offset: '100%', color: theme.surface }
            ]
          },
          stroke: theme.cyanDark,
          strokeWidth: 2,
          rx: 10,
          ry: 10,
          filter: {
            name: 'dropShadow',
            args: {
              dx: 0,
              dy: 3,
              blur: 6,
              color: 'rgba(0, 0, 0, 0.35)'
            }
          }
        },
        label: {
          text: label.toUpperCase(),
          fill: theme.text,
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: 'Inter, sans-serif',
          textWrap: {
            width: 120,
            height: 50,
            ellipsis: true
          }
        }
      });

      node.set('ports', inOutPorts);
    }

    this.graph.addCell(node);
  }



  // 3. Añade estos métodos al final de la clase Workflow:
  addCustomField() {
    if (!this.propertiesForm) return;
    if (!this.propertiesForm.customFields) {
      this.propertiesForm.customFields = [];
    }

    this.propertiesForm.customFields.push({
      id: 'field_' + Date.now(),
      label: '',
      type: 'text',
      options: [],
      rawOptions: ''
    });
    this.cdr.detectChanges();
  }

  removeCustomField(index: number) {
    if (this.propertiesForm?.customFields) {
      this.propertiesForm.customFields.splice(index, 1);
      this.cdr.detectChanges();
    }
  }


  // workflow.ts -> Añadir al final de la clase
  getLockedNodesArray() {
    if (!this.paper) return [];
    const scale = this.paper.scale().sx;
    const translate = this.paper.translate();

    return Object.keys(this.lockedNodes).map(id => {
      const cell = this.graph.getCell(id) as joint.dia.Element;
      // Ignoramos los departamentos (Lanes) o celdas borradas
      if (!cell || !cell.position || cell.get('isLane')) return null;

      const pos = cell.position();
      const size = cell.size();

      // Calculamos el centro superior del nodo para poner la etiqueta
      const x = (pos.x * scale) + translate.tx + ((size.width * scale) / 2);
      const y = (pos.y * scale) + translate.ty;

      return {
        id,
        user: this.lockedNodes[id],
        transform: `translate(${x}px, ${y}px) translateX(-50%)`
      };
    }).filter(n => n !== null);
  }
  // Convierte el string "A, B, C" en un array ["A", "B", "C"]
  syncOptions(field: any) {
    if (field.rawOptions) {
      field.options = field.rawOptions
        .split(',')
        .map((opt: string) => opt.trim())
        .filter((opt: string) => opt.length > 0);

      console.log('Opciones sincronizadas para el motor:', field.options);
    }
  }



  // =====================================================================
  //MANEJO Y METODOS DE IA
  toggleCopilot() {
    this.isCopilotOpen = !this.isCopilotOpen;
  }

  // 🚀 ESTE MÉTODO RECIBE EL STRING DESDE EL HIJO
  askCopilot(userMessage: string) {
    // 1. Agregamos el mensaje del usuario al chat local
    this.chatMessages.push({ role: 'user', content: userMessage });
    this.isAiTyping = true;
    this.cdr.detectChanges();

    // 2. Obtenemos la "foto" actual de JointJS
    const diagramSnapshot = this.getCurrentDiagramSnapshot();

    // 3. Llamada real al backend de FastAPI
    this.copilotService.askJarvis(userMessage, diagramSnapshot).subscribe({
      next: (response) => {
        this.isAiTyping = false;
        // La IA nos devuelve el JSON estructurado (role, content, hasAction)
        this.chatMessages.push(response);
        this.cdr.detectChanges();

        if (response.content) {
          this.speakText(response.content);
        }

        if (response.hasAction && response.actionPayload?.tour) {
          this.startVisualTour(response.actionPayload.tour);
        }
      },
      error: (err) => {
        this.isAiTyping = false;
        console.error("Error de conexión con Jarvis:", err);
        this.chatMessages.push({
          role: 'assistant',
          content: 'Lo siento, Elías. Perdí la conexión con el núcleo de procesamiento.'
        });
        this.cdr.detectChanges();
      }
    });
  }



  applyAiSuggestion(payload: any): void {
    console.log('⚙️ Ejecutando orden de la IA:', payload);

    if (!payload || !Array.isArray(payload.nodes)) {
      console.warn('La IA no envió un payload válido con nodos.');
      return;
    }

    const theme = {
      link: '#22d3ee',
      linkHover: '#67e8f9',
      marker: '#22d3ee'
    };

    // 1. Calculamos el centro actual de la pantalla
    const scale = this.paper.scale().sx;
    const translate = this.paper.translate();

    const centerX =
      (this.paperContainer.nativeElement.clientWidth / 2 - translate.tx) / scale;

    const startY =
      (this.paperContainer.nativeElement.clientHeight / 2 - translate.ty) / scale;

    // Diccionario para enlazar los IDs temporales de la IA con los IDs reales de JointJS
    const createdNodes: Record<string, joint.dia.Element> = {};

    // 2. Dibujamos los nodos
    payload.nodes.forEach((aiNode: any, index: number) => {
      const info = {
        nodeType: aiNode.type || 'action',
        label: aiNode.name || 'NUEVO NODO IA',
        dimension: {
          width: 140,
          height: 70
        }
      };

      const yPos = startY + index * 100;
      const cellsBefore = this.graph.getCells().length;

      // Usamos la fábrica principal para mantener el estilo visual del diagramador
      this.createJointNode(centerX, yPos, info);

      const cellsAfter = this.graph.getCells();

      if (cellsAfter.length <= cellsBefore) {
        return;
      }

      const newNode = cellsAfter[cellsAfter.length - 1] as joint.dia.Element;

      // Si la IA envió configuración adicional, la inyectamos al nodo
      if (aiNode.description) {
        newNode.set('nodeDescription', aiNode.description);
      }

      if (aiNode.config) {
        newNode.set('userData', aiNode.config);
      }

      // Guardamos referencia para conectar flechas después
      if (aiNode.id) {
        createdNodes[aiNode.id] = newNode;
      }
    });

    // 3. Dibujamos las conexiones
    if (Array.isArray(payload.edges)) {
      payload.edges.forEach((edge: any) => {
        const sourceNode =
          createdNodes[edge.source] || this.graph.getCell(edge.source);

        const targetNode =
          createdNodes[edge.target] || this.graph.getCell(edge.target);

        if (!sourceNode || !targetNode) {
          console.warn('No se pudo crear conexión IA. Nodo origen o destino no encontrado:', edge);
          return;
        }

        const sourcePort = edge.sourcePort || 'out';
        const targetPort = edge.targetPort || 'in';

        const link = new joint.shapes.standard.Link({
          source: {
            id: sourceNode.id,
            port: sourcePort
          },
          target: {
            id: targetNode.id,
            port: targetPort
          },
          attrs: {
            line: {
              stroke: theme.link,
              strokeWidth: 2,
              targetMarker: {
                type: 'path',
                d: 'M 10 -5 0 0 10 5 Z',
                fill: theme.marker,
                stroke: 'none'
              }
            }
          },
          router: {
            name: 'manhattan'
          },
          connector: {
            name: 'rounded'
          }
        });

        this.graph.addCell(link);
      });
    }

    // 4. Sincronizamos con los demás colaboradores
    this.wsService.send({
      type: 'graph_update',
      user: this.userName,
      data: this.graph.toJSON()
    });
  }


  // Radiografía COMPLETA del diagrama actual
  private getCurrentDiagramSnapshot() {
    if (!this.graph) {
      return { lanes: [], nodes: [], edges: [] };
    }

    const elements = this.graph.getElements();
    const links = this.graph.getLinks();

    return {
      // 1. Enviamos los departamentos (Calles/Swimlanes)
      lanes: elements.filter(el => el.get('isLane')).map(lane => ({
        id: String(lane.id),
        name: lane.attr('label/text'),
        departmentId: lane.get('departmentId')
      })),

      // 2. Enviamos los Nodos con TODA su configuración
      nodes: elements.filter(el => !el.get('isLane')).map(node => ({
        id: String(node.id),
        type: node.get('nodeType'),
        name: node.attr('label/text'),
        description: node.get('nodeDescription') || '',
        parentLaneId: node.get('parent') || null, // Para saber en qué depto está
        config: node.get('userData') || {} // Aquí va la multimedia, variables, etc.
      })),

      // 3. Enviamos las conexiones exactas
      edges: links.map(link => ({
        id: String(link.id),
        source: String(link.source().id),
        target: String(link.target().id),
        label: link.labels()[0]?.attrs?.['text']?.['text'] || ''
      }))
    };
  }




  // --- MÉTODOS DE VOZ ---
  private speakText(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Detenemos si estaba hablando algo antes

      // Limpiamos el texto de asteriscos (markdown) para que la voz suene natural
      const cleanText = text.replace(/[*#_]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Buscar una voz en español
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.includes('es'));
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.rate = 1.05; // Un poco más rápido
      utterance.pitch = 0.9; // Tono ligeramente más robótico/grave

      window.speechSynthesis.speak(utterance);
    }
  }
}