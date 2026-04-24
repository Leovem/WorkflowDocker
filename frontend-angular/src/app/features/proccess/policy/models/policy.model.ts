export enum WorkflowNodeType {
  INICIO = 'INICIO',
  FIN = 'FIN',
  IF = 'IF',
  LOOP = 'LOOP',
  FOR = 'FOR',
  JOIN = 'JOIN',
  FORK = 'FORK',
  MERGE = 'MERGE',
  ACTIVIDAD = 'ACTIVIDAD',
  LANE = 'LANE'
}

export interface WorkflowSwimlane {
  id: string;
  departmentId: string;
  name: string;
  order: number;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  swimlaneId: string;
  name: string;
  description?: string;

  // Aquí encapsulamos todo lo que el Motor y la IA necesitan saber
  configuration?: {
    assignedRoleId?: string; // ¿Qué rol específico dentro del departamento hace esto?
    requiredFields?: string[]; // Ej: ['monto_solicitado', 'ci_cliente'] para que la IA sepa qué extraer
    isVoiceEnabled?: boolean; // ¿Se puede completar este paso hablando?
    [key: string]: any; // Flexibilidad para otros datos
  };

  positionX?: number;
  positionY?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;

}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;

  // Condición lógica que el backend evaluará (Ej: "monto > 5000")
  conditionExpression?: string;
}

export interface PolicyWorkflow {
  swimlanes: WorkflowSwimlane[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Policy {
  id?: string;
  name: string;
  description?: string;
  status: boolean;
  version: number; // Vital para no romper trámites antiguos al editar la política

  workflow?: any;
  jointEngineState?: any;
  createdAt?: string;
  updatedAt?: string;
}


export interface CursorPosition {
  x: number;
  y: number;
}

export interface LockedNode {
  userId: string;
  userName: string;
}