import { Injectable } from '@angular/core';
import * as joint from '@joint/core';

const WorkflowLane = joint.shapes.standard.Rectangle.define(
  'workflow.Lane',
  {
    attrs: {
      body: {
        fill: '#141414',
        stroke: '#3f3f46',
        strokeWidth: 2,
        strokeDasharray: '4,4',
        rx: 4,
        ry: 4,
        refWidth: '100%',
        refHeight: '100%',
      },
      label: {
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#a1a1aa',
        refX: '0%',
        refY: 20,
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      },
    },
  },
  {
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
  }
);

Object.assign(joint.shapes, {
  workflow: {
    Lane: WorkflowLane,
  },
});

@Injectable({
  providedIn: 'root',
})
export class EditorCanvasService {
  private readonly theme = {
    surface: '#06101d',
    surfaceSoft: '#0f172a',
    cyan: '#22d3ee',
    cyanDark: '#164e63',
    cyanSoft: '#a5f3fc',
    text: '#e5e7eb',
    textMuted: '#94a3b8',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    blue: '#38bdf8',
    blueSoft: '#7dd3fc',
    violet: '#8b5cf6',
    border: '#164e63',
    borderSoft: '#0e7490',
    portStroke: '#06101d',
    white: '#ffffff',
  };

  createGraph(): joint.dia.Graph {
    return new joint.dia.Graph({}, { cellNamespace: joint.shapes });
  }

  createPaper(
    graph: joint.dia.Graph,
    container: HTMLElement
  ): joint.dia.Paper {
    return new joint.dia.Paper({
      el: container,
      model: graph,
      width: '100%',
      height: '100%',
      gridSize: 20,
      drawGrid: {
        name: 'dot',
        args: {
          color: '#164e63',
          thickness: 1,
        },
      },
      background: {
        color: '#06101d',
      },
      interactive: true,
      linkPinning: false,

      embeddingMode: true,
      fromtParentOnly: false as any,

      validateEmbedding: (_childView, parentView) => {
        return parentView.model.get('isLane') === true;
      },

      defaultLink: () => this.createDefaultLink(),

      validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
        if (sourceView === targetView) return false;

        const targetGroup = targetMagnet?.getAttribute('port-group') || '';

        return targetGroup.startsWith('in');
      },

      validateMagnet: (_cellView, magnet) => {
        const magnetGroup = magnet?.getAttribute('port-group') || '';

        return !magnetGroup.startsWith('in');
      },

      snapLinks: {
        radius: 20,
      },
    });
  }

  createDefaultLink(): joint.dia.Link {
    return new joint.shapes.standard.Link({
      attrs: {
        line: {
          stroke: '#22d3ee',
          strokeWidth: 2,
          targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 Z',
            fill: '#22d3ee',
            stroke: 'none',
          },
        },
      },
      router: {
        name: 'manhattan',
      },
      connector: {
        name: 'rounded',
      },
    });
  }

  restoreGraphFromJson(graph: joint.dia.Graph, json: any): void {
    if (!json) return;

    try {
      graph.fromJSON(json, { remote: true });
    } catch (error) {
      console.error('Error restaurando graph desde JSON:', error);
    }
  }

  fitToContent(paper: joint.dia.Paper): void {
    try {
      paper.scaleContentToFit({
        padding: 50,
        maxScale: 1,
      });
    } catch (error) {
      console.warn('No se pudo ajustar el contenido del lienzo:', error);
    }
  }

  registerZoomAndPan(paper: joint.dia.Paper): void {
    paper.on('blank:mousewheel', (evt: any, _x: number, _y: number, delta: number) => {
      evt.preventDefault();

      const currentScale = paper.scale().sx;
      const scaleDelta = delta > 0 ? 0.1 : -0.1;
      const newScale = Math.max(0.2, Math.min(3, currentScale + scaleDelta));

      paper.scale(newScale, newScale);
    });

    let panning = false;
    let origin: { x: number; y: number } | null = null;

    paper.on('blank:pointerdown', (evt: any) => {
      panning = true;
      origin = {
        x: evt.clientX,
        y: evt.clientY,
      };
    });

    paper.on('blank:pointermove', (evt: any) => {
      if (!panning || !origin) return;

      const currentTranslate = paper.translate();
      const dx = evt.clientX - origin.x;
      const dy = evt.clientY - origin.y;

      paper.translate(currentTranslate.tx + dx, currentTranslate.ty + dy);

      origin = {
        x: evt.clientX,
        y: evt.clientY,
      };
    });

    paper.on('blank:pointerup', () => {
      panning = false;
      origin = null;
    });
  }

  registerElementTools(paper: joint.dia.Paper): void {
  paper.on('element:mouseenter', (elementView) => {
    const model = elementView.model;

    if (model.get('isLane')) return;

    const nodeType = model.get('nodeType');

    const removePosition =
      nodeType === 'decision' || nodeType === 'if' || nodeType === 'merge'
        ? {
            x: '60%',
            y: '10%',
            offset: {
              x: 0,
              y: 0,
            },
          }
        : {
            x: '100%',
            y: 0,
            offset: {
              x: -12,
              y: 12,
            },
          };

    const removeButton = new joint.elementTools.Remove({
      ...removePosition,
      markup: [
        {
          tagName: 'circle',
          selector: 'button',
          attributes: {
            r: 10,
            fill: '#ef4444',
            cursor: 'pointer',
            stroke: '#06101d',
            'stroke-width': 2,
          },
        },
        {
          tagName: 'path',
          selector: 'icon',
          attributes: {
            d: 'M -4 -4 L 4 4 M -4 4 L 4 -4',
            stroke: '#ffffff',
            'stroke-width': 2,
            'pointer-events': 'none',
          },
        },
      ],
    });

    const toolsView = new joint.dia.ToolsView({
      tools: [removeButton],
    });

    elementView.addTools(toolsView);
  });

  paper.on('element:mouseleave', (elementView) => {
    elementView.removeTools();
  });
}

  registerLinkTools(paper: joint.dia.Paper): void {
    paper.on('link:mouseenter', (linkView) => {
      const removeButton = new joint.linkTools.Remove({
        distance: '50%',
        markup: [
          {
            tagName: 'circle',
            selector: 'button',
            attributes: {
              r: 10,
              fill: '#ef4444',
              cursor: 'pointer',
              stroke: '#1a1a1a',
              'stroke-width': 2,
            },
          },
          {
            tagName: 'path',
            selector: 'icon',
            attributes: {
              d: 'M -4 -4 L 4 4 M -4 4 L 4 -4',
              fill: 'none',
              stroke: '#ffffff',
              'stroke-width': 2,
              cursor: 'pointer',
            },
          },
        ],
      });

      const toolsView = new joint.dia.ToolsView({
        tools: [removeButton],
      });

      linkView.addTools(toolsView);
    });

    paper.on('link:mouseleave', (linkView) => {
      linkView.removeTools();
    });
  }

  createJointNode(
    graph: joint.dia.Graph,
    x: number,
    y: number,
    info: any
  ): joint.dia.Element {
    const nodeType = info?.nodeType || info?.type || 'action';
    const label = info?.label || info?.name || this.getDefaultLabel(nodeType);
    const dimension = info?.dimension || { width: 140, height: 70 };
    const isLane = info?.isLane === true || nodeType === 'lane';

    let node: joint.dia.Element;

    const createPort = (
      position: 'top' | 'bottom' | 'left' | 'right',
      options: {
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
          stroke: options.stroke ?? this.theme.portStroke,
          strokeWidth: options.strokeWidth ?? 2,
        },
      },
    });

    const inOutPorts = {
      groups: {
        in: createPort('top', {
          magnet: 'passive',
          fill: this.theme.surfaceSoft,
          stroke: this.theme.cyanDark,
        }),
        out: createPort('bottom', {
          magnet: true,
          fill: this.theme.cyan,
          stroke: this.theme.portStroke,
        }),
      },
      items: [
        { group: 'in', id: 'in' },
        { group: 'out', id: 'out' },
      ],
    };

    if (isLane || nodeType === 'lane') {
      node = new WorkflowLane();

      node.position(x, y);
      node.resize(300, 600);
      node.set('isLane', true);
      node.set('z', -1);

      const departmentId =
        info.deptoId ||
        info.departmentId ||
        info.departament ||
        info.id ||
        null;

      node.set('departmentId', departmentId);
      node.attr('label/text', label.toUpperCase());

      graph.addCell(node);
      return node;
    }

    if (nodeType === 'start') {
      node = new joint.shapes.standard.Circle();

      node.position(x - 20, y - 20);
      node.resize(40, 40);
      node.set('nodeType', 'start');

      node.attr({
        body: {
          fill: this.theme.cyan,
          stroke: this.theme.cyanDark,
          strokeWidth: 4,
          magnet: true,
        },
        label: {
          text: 'INICIO',
          fill: this.theme.cyanSoft,
          fontSize: 9,
          fontWeight: 'bold',
          textVerticalAnchor: 'bottom',
          refY: '-15',
        },
      });
    } else if (nodeType === 'end') {
      node = new joint.shapes.standard.Circle();

      node.position(x - 20, y - 20);
      node.resize(40, 40);
      node.set('nodeType', 'end');

      node.attr({
        body: {
          fill: this.theme.surface,
          stroke: this.theme.danger,
          strokeWidth: 5,
        },
        label: {
          text: 'FIN',
          fill: this.theme.danger,
          fontSize: 9,
          fontWeight: 'bold',
          textVerticalAnchor: 'top',
          refY: 55,
        },
      });

      node.set('ports', {
        groups: {
          in: inOutPorts.groups.in,
        },
        items: [{ group: 'in', id: 'in' }],
      });
    } else if (nodeType === 'decision' || nodeType === 'if') {
      node = new joint.shapes.standard.Polygon();

      node.position(x - 30, y - 30);
      node.resize(60, 60);
      node.set('nodeType', 'decision');

      node.attr({
        body: {
          refPoints: '10,0 20,10 10,20 0,10',
          fill: this.theme.surface,
          stroke: this.theme.warning,
          strokeWidth: 2,
        },
        label: {
          text: label || 'IF',
          fill: '#fde68a',
          fontSize: 10,
          fontWeight: 'bold',
          refY: '100%',
          refY2: 5,
        },
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: this.theme.surfaceSoft,
            stroke: this.theme.warning,
          }),

          outTrue: {
            position: 'right',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                fill: this.theme.success,
                stroke: this.theme.portStroke,
                strokeWidth: 2,
              },
            },
            label: {
              position: { name: 'right' },
              markup: [
                {
                  tagName: 'text',
                  textContent: 'V',
                  style: {
                    fill: this.theme.success,
                    fontSize: '12px',
                    fontWeight: 'bold',
                  },
                },
              ],
            },
          },

          outFalse: {
            position: 'bottom',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                fill: this.theme.danger,
                stroke: this.theme.portStroke,
                strokeWidth: 2,
              },
            },
            label: {
              position: { name: 'bottom' },
              markup: [
                {
                  tagName: 'text',
                  textContent: 'F',
                  style: {
                    fill: this.theme.danger,
                    fontSize: '12px',
                    fontWeight: 'bold',
                  },
                },
              ],
            },
          },
        },
        items: [
          { group: 'in', id: 'in' },
          { group: 'outTrue', id: 'out-true' },
          { group: 'outFalse', id: 'out-false' },
        ],
      });
    } else if (nodeType === 'fork') {
      node = new joint.shapes.standard.Rectangle();

      node.position(x - 50, y - 5);
      node.resize(100, 8);
      node.set('nodeType', 'fork');

      node.attr({
        body: {
          fill: this.theme.blue,
          stroke: this.theme.blueSoft,
          strokeWidth: 1,
          rx: 2,
          ry: 2,
          magnet: true,
        },
        label: {
          text: label || 'FORK',
          fill: this.theme.textMuted,
          fontSize: 9,
          fontWeight: 'bold',
          refY: -18,
        },
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: this.theme.surfaceSoft,
            stroke: this.theme.blueSoft,
            radius: 3,
          }),
          out: createPort('bottom', {
            magnet: true,
            fill: this.theme.blue,
            stroke: this.theme.portStroke,
            radius: 3,
          }),
        },
        items: [
          { group: 'in', id: 'in' },
          { group: 'out', id: 'out' },
        ],
      });
    } else if (nodeType === 'join') {
      node = new joint.shapes.standard.Rectangle();

      node.position(x - 50, y - 5);
      node.resize(100, 8);
      node.set('nodeType', 'join');

      node.attr({
        body: {
          fill: this.theme.warning,
          stroke: '#fcd34d',
          strokeWidth: 1,
          rx: 2,
          ry: 2,
          magnet: true,
        },
        label: {
          text: label || 'JOIN',
          fill: this.theme.textMuted,
          fontSize: 9,
          fontWeight: 'bold',
          refY: -18,
        },
      });

      node.set('ports', {
        groups: {
          in: createPort('top', {
            magnet: 'passive',
            fill: this.theme.surfaceSoft,
            stroke: this.theme.warning,
            radius: 3,
          }),
          out: createPort('bottom', {
            magnet: true,
            fill: this.theme.warning,
            stroke: this.theme.portStroke,
            radius: 3,
          }),
        },
        items: [
          { group: 'in', id: 'in' },
          { group: 'out', id: 'out' },
        ],
      });
    } else if (nodeType === 'merge') {
      node = new joint.shapes.standard.Polygon();

      node.position(x - 30, y - 30);
      node.resize(60, 60);
      node.set('nodeType', 'merge');

      node.attr({
        body: {
          refPoints: '10,0 20,10 10,20 0,10',
          fill: this.theme.surface,
          stroke: this.theme.violet,
          strokeWidth: 2,
        },
        label: {
          text: label || 'MERGE',
          fill: '#ddd6fe',
          fontSize: 9,
          fontWeight: 'bold',
          refY: '100%',
          refY2: 5,
        },
      });

      node.set('ports', {
        groups: {
          inTop: createPort('top', {
            magnet: 'passive',
            fill: this.theme.surfaceSoft,
            stroke: this.theme.violet,
          }),
          inLeft: createPort('left', {
            magnet: 'passive',
            fill: this.theme.surfaceSoft,
            stroke: this.theme.violet,
          }),
          out: createPort('bottom', {
            magnet: true,
            fill: this.theme.violet,
            stroke: this.theme.portStroke,
          }),
        },
        items: [
          { group: 'inTop', id: 'in-top' },
          { group: 'inLeft', id: 'in-left' },
          { group: 'out', id: 'out-next' },
        ],
      });
    } else {
      node = new joint.shapes.standard.Rectangle();

      node.position(x - dimension.width / 2, y - dimension.height / 2);
      node.resize(140, 70);
      node.set('nodeType', 'action');

      node.attr({
        body: {
          fill: {
            type: 'linearGradient',
            stops: [
              { offset: '0%', color: this.theme.surfaceSoft },
              { offset: '100%', color: this.theme.surface },
            ],
          },
          stroke: this.theme.cyanDark,
          strokeWidth: 2,
          rx: 10,
          ry: 10,
          filter: {
            name: 'dropShadow',
            args: {
              dx: 0,
              dy: 3,
              blur: 6,
              color: 'rgba(0, 0, 0, 0.35)',
            },
          },
        },
        label: {
          text: label.toUpperCase(),
          fill: this.theme.text,
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: 'Inter, sans-serif',
          textWrap: {
            width: 120,
            height: 50,
            ellipsis: true,
          },
        },
      });

      node.set('ports', inOutPorts);
    }

    node.set('departmentId', info.departmentId || info.deptoId || null);
    node.set('laneId', info.laneId || info.departmentId || info.deptoId || null);

    node.set('userData', {
      requirements: {
        document: false,
        photo: false,
        video: false,
        audio: false,
      },
      mediaLabels: {
        document: '',
        photo: '',
        video: '',
        audio: '',
      },
      customFields: [],
      requiredDocuments: [],
      requiresDocumentUpload: false,
      requiresDocumentReview: false,
    });

    graph.addCell(node);

    return node;
  }

  applyAiSuggestion(
    graph: joint.dia.Graph,
    paper: joint.dia.Paper,
    container: HTMLElement,
    payload: any
  ): void {
    if (!payload || !payload.nodes) return;

    const scale = paper.scale().sx;
    const translate = paper.translate();

    const centerX = (container.clientWidth / 2 - translate.tx) / scale;
    let startY = (container.clientHeight / 2 - translate.ty) / scale;

    const createdNodes: Record<string, joint.dia.Element> = {};

    if (Array.isArray(payload.nodes)) {
      payload.nodes.forEach((aiNode: any, index: number) => {
        const node = this.createJointNode(graph, centerX, startY + index * 120, {
          nodeType: aiNode.type || aiNode.nodeType || 'action',
          label: aiNode.label || aiNode.name || 'Tarea IA',
          departmentId: aiNode.departmentId,
        });

        if (aiNode.id) {
          createdNodes[aiNode.id] = node;
        }

        if (aiNode.description) {
          node.set('nodeDescription', aiNode.description);
        }

        if (aiNode.userData || aiNode.configuration) {
          node.set('userData', {
            ...(node.get('userData') || {}),
            ...(aiNode.userData || {}),
            ...(aiNode.configuration || {}),
          });
        }
      });
    }

    if (Array.isArray(payload.edges)) {
      payload.edges.forEach((edge: any) => {
        const source = createdNodes[edge.source] || createdNodes[edge.sourceNodeId];
        const target = createdNodes[edge.target] || createdNodes[edge.targetNodeId];

        if (!source || !target) return;

        const link = this.createDefaultLink();

        link.source({
          id: source.id,
          port: edge.sourcePort || 'out',
        });

        link.target({
          id: target.id,
          port: edge.targetPort || 'in',
        });

        if (edge.label) {
          link.labels([
            {
              attrs: {
                text: {
                  text: edge.label,
                  fill: '#e5e7eb',
                  fontSize: 11,
                },
              },
            },
          ]);
        }

        graph.addCell(link);
      });
    }

    this.fitToContent(paper);
  }

  private getDefaultLabel(nodeType: string): string {
    const labels: Record<string, string> = {
      lane: 'Departamento',
      start: 'Inicio',
      end: 'Fin',
      decision: 'Condición',
      if: 'Condición',
      fork: 'Fork',
      join: 'Join',
      merge: 'Merge',
      action: 'Tarea Nueva',
    };

    return labels[nodeType] || 'Tarea Nueva';
  }
}