export enum WorkflowNodeType {
  INICIO = 'start',
  FIN = 'end',
  IF = 'decision',
  LOOP = 'loop',
  FOR = 'for',
  JOIN = 'join',
  FORK = 'fork',
  MERGE = 'merge',
  ACTIVIDAD = 'action',
  LANE = 'lane'
}

export interface WorkflowSwimlane {
  id: string;
  departmentId: string;
  name: string;
  order: number;
}

export interface WorkflowDocumentConfiguration {
  requiredDocuments: string[];
  requiresDocumentUpload: boolean;
  requiresDocumentReview: boolean;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType | string;
  swimlaneId: string;
  name: string;
  description?: string;

  configuration?: {
    assignedRoleId?: string;
    requiredFields?: string[];
    isVoiceEnabled?: boolean;

    multimedia?: any;
    mediaLabels?: any;
    formFields?: any[];

    documents?: WorkflowDocumentConfiguration;

    logic?: {
      variable?: string | null;
      operator?: string | null;
      value?: string | null;
      mergeStrategy?: string | null;
    };

    [key: string]: any;
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
  conditionExpression?: string;
}

export interface PolicyWorkflow {
  globalRequirements?: any;
  swimlanes: WorkflowSwimlane[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Policy {
  id?: string;
  name: string;
  description?: string;
  status: boolean;
  version: number;

  workflow?: PolicyWorkflow;
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