import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VoiceService} from '../../../features/motor/funcionario/service/voice.service';
import { Subscription } from 'rxjs';

// Interfaz para definir cualquier campo dinámico
export interface DynamicField {
    name: string;
    label: string;
    type: string
    required: boolean;
    options?: string[];
}

export interface ModalConfig {
    title: string;
    description?: string;
    showProfileFields: boolean; // ¿Mostrar Nombre, Correo, Documento?
    customFields: DynamicField[]; // Requisitos específicos de la política
    mediaRequirements: {
        photo: boolean;
        document: boolean;
        audio: boolean;
        video: boolean;
    };
    mediaLabels?: {
        photo: string;
        document: string;
        audio: string;
        video: string;
    };
    previousData?: any[];
}

@Component({
    selector: 'app-dynamic-modal-task',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './dynamic-modal-task.component.html',
})
export class DynamicModalTaskComponent implements OnChanges, OnDestroy {
    @Input() isOpen: boolean = false;
    @Input() config!: ModalConfig;

    @Output() close = new EventEmitter<void>();
    @Output() submitForm = new EventEmitter<any>();

    form: FormGroup;

    actualFiles: { [key: string]: File } = {};

    public isProcessingAudio = false;
    private voiceSub!: Subscription;

    constructor(
        private fb: FormBuilder,
        public voiceService: VoiceService,
        private cdr: ChangeDetectorRef,
    ) {
        this.form = this.fb.group({});

        this.voiceSub = this.voiceService.transcript$.subscribe((text) => {
            this.handleSmartFill(text);
        });
    }


    private handleSmartFill(text: string) {
        if (!this.config?.customFields) return;

        const fieldNames = this.config.customFields.map(f => f.name);

        this.voiceService.smartFill(text, fieldNames).subscribe({
            next: (mappedData) => {
                this.form.patchValue(mappedData);
                this.voiceService.isProcessing$.next(false);
                this.cdr.detectChanges();
            },
            error: () => {
                this.voiceService.isProcessing$.next(false);
                this.cdr.detectChanges();
            }
        });
    }


    ngOnDestroy() {
        if (this.voiceSub) this.voiceSub.unsubscribe();
    }


    toggleVoice(){
        if (this.voiceService.isListening) {
            this.voiceService.stopListening();
        } else {
            this.voiceService.startListening();
        }
    }



    ngOnChanges(changes: SimpleChanges): void {
        // Si el modal se abre o cambia la configuración, reconstruimos el formulario
        if (changes['config'] || changes['isOpen']) {
            this.buildForm();
        }
    }

    private buildForm() {
        this.form = this.fb.group({});

        if (!this.config) return;

        // 1. Agregar campos del perfil efímero si se requieren
        if (this.config.showProfileFields) {
            this.form.addControl('fullName', this.fb.control('', Validators.required));
            this.form.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
            this.form.addControl('documentId', this.fb.control('', Validators.required));
        }

        // 2. Agregar los campos dinámicos de la política
        this.config.customFields.forEach(field => {
            const validators = field.required ? [Validators.required] : [];
            this.form.addControl(field.name, this.fb.control('', validators));
        });

        // 3. Archivos Multimedia (Si son true, agregamos el control al formulario)
        if (this.config.mediaRequirements) {
            if (this.config.mediaRequirements.photo) this.form.addControl('file_photo', this.fb.control('', Validators.required));
            if (this.config.mediaRequirements.document) this.form.addControl('file_document', this.fb.control('', Validators.required));
            if (this.config.mediaRequirements.audio) this.form.addControl('file_audio', this.fb.control('', Validators.required));
            if (this.config.mediaRequirements.video) this.form.addControl('file_video', this.fb.control('', Validators.required));
        }
    }

    onFileChange(event: any, fieldName: string) {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            this.actualFiles[fieldName] = file; // Atrapamos el archivo real
            console.log(`📎 Archivo físico capturado para ${fieldName}:`, file.name);
        }
    }

    onClose() {
        this.form.reset();
        this.close.emit();
    }

    onSubmit() {
        if (this.form.valid) {
            const rawValues = this.form.value;

            // 1. Solo separamos los datos de perfil efímero (si existieran en el config)
            // No usamos destructuración para quitar los "file_", los queremos mantener.
            const {
                fullName, email, documentId,
                file_photo, file_document, file_audio, file_video,
                ...formResponses
            } = rawValues;

            // 2. Construimos el objeto final uniendo los valores del formulario
            // con los archivos reales capturados en el diccionario 'actualFiles'
            const taskData = {
                ...formResponses,
                // Agregamos los archivos físicos. Si el config tiene photo:false, 
                // estos simplemente irán como null, lo cual es correcto.
                media: {
                    photo: this.actualFiles['file_photo'] || null,
                    document: this.actualFiles['file_document'] || null,
                    audio: this.actualFiles['file_audio'] || null,
                    video: this.actualFiles['file_video'] || null
                }
            };

            const wrappedPayload = {
                nodo: taskData
            };

            console.log("📝 Payload completo de la tarea capturado:", wrappedPayload);

            // 3. Emitimos todo el paquete al InboxComponent
            this.submitForm.emit(wrappedPayload);

        } else {
            this.form.markAllAsTouched();
        }
    }
}