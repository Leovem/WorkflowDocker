import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { NgxTiptapModule } from 'ngx-tiptap';

import { CollaborativeDocumentApiService } from '../../services/collaborative-document-api.service';

@Component({
  selector: 'app-collaborative-document-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxTiptapModule,
  ],
  templateUrl: './collaborative-document-editor.component.html',
  styles: [`
    :host ::ng-deep .collaboration-cursor__caret {
      border-left: 2px solid;
      border-right: none;
      margin-left: -1px;
      margin-right: -1px;
      pointer-events: none;
      position: relative;
      word-break: normal;
    }

    :host ::ng-deep .collaboration-cursor__label {
      border-radius: 999px;
      color: white;
      font-size: 10px;
      font-weight: 700;
      left: -1px;
      line-height: 1;
      opacity: 0.75;
      padding: 3px 6px;
      position: absolute;
      top: -1.6em;
      transform: translateY(-2px);
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
    }
  `],
})
export class CollaborativeDocumentEditorComponent implements OnInit, OnDestroy {
  @Input({ required: true }) documentId!: string;

  @Input() roomName?: string;

  @Input() userId = 'user_001';
  @Input() userName = 'Funcionario';
  @Input() userColor = '#22d3ee';

  @Input() initialHtmlContent = '';

  editor: Editor | null = null;

  private ydoc: Y.Doc | null = null;
  private provider: WebsocketProvider | null = null;

  isConnected = signal(false);
  activeUsers = signal<any[]>([]);

  isSaving = signal(false);
  saveMessage = signal('');
  lastSavedAt = signal<string | null>(null);

  constructor(
    private readonly collaborativeDocumentApiService: CollaborativeDocumentApiService
  ) {}

  ngOnInit(): void {
    this.initializeCollaborativeEditor();
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.provider?.destroy();
    this.ydoc?.destroy();

    this.editor = null;
    this.provider = null;
    this.ydoc = null;
  }

  private initializeCollaborativeEditor(): void {
    const finalRoomName = this.roomName || `workflow-doc-${this.documentId}`;

    this.ydoc = new Y.Doc();

    this.provider = new WebsocketProvider(
      'ws://localhost:1234',
      finalRoomName,
      this.ydoc
    );

    this.provider.on('status', (event: any) => {
      this.isConnected.set(event.status === 'connected');
    });

    this.provider.awareness.setLocalStateField('user', {
      id: this.userId,
      name: this.userName,
      color: this.userColor,
    });

    this.provider.awareness.on('change', () => {
      const users = Array.from(this.provider!.awareness.getStates().values())
        .map((state: any) => state.user)
        .filter(Boolean);

      this.activeUsers.set(users);
    });

    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: this.ydoc,
        }),
        CollaborationCursor.configure({
          provider: this.provider,
          user: {
            name: this.userName,
            color: this.userColor,
          },
        }),
      ],
      content: '',
      editorProps: {
        attributes: {
          class:
            'min-h-[650px] rounded-xl bg-white px-16 py-12 text-slate-900 outline-none shadow-xl prose prose-slate max-w-none',
        },
      },
    });

    this.loadInitialContentSafely();
  }

  private loadInitialContentSafely(): void {
    if (!this.provider || !this.editor) {
      return;
    }

    this.provider.on('sync', () => {
      if (!this.editor) {
        return;
      }

      const currentText = this.editor.getText().trim();
      const hasInitialContent = this.initialHtmlContent.trim().length > 0;

      if (!currentText && hasInitialContent) {
        this.editor.commands.setContent(this.initialHtmlContent);
      }
    });
  }

  saveSnapshot(): void {
    if (!this.editor || !this.documentId) {
      return;
    }

    const htmlContent = this.editor.getHTML();
    const plainText = this.editor.getText();

    this.isSaving.set(true);
    this.saveMessage.set('');

    this.collaborativeDocumentApiService
      .saveSnapshot(this.documentId, {
        htmlContent,
        plainText,
        savedByUserId: this.userId,
        savedByUserName: this.userName,
      })
      .subscribe({
        next: (snapshot) => {
          this.isSaving.set(false);
          this.lastSavedAt.set(snapshot.savedAt || new Date().toISOString());
          this.saveMessage.set(`Versión ${snapshot.versionNumber} guardada.`);
        },
        error: (error) => {
          console.error('Error guardando snapshot:', error);
          this.isSaving.set(false);
          this.saveMessage.set('No se pudo guardar el documento.');
        },
      });
  }

  setHeading(level: 1 | 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  getHtml(): string {
    return this.editor?.getHTML() || '';
  }
}