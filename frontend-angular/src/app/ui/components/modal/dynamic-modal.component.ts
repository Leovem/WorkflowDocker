import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
}

@Component({
    selector: 'app-dynamic-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './dynamic-modal.component.html',
})
export class DynamicModalComponent implements OnChanges {
    @Input() isOpen: boolean = false;
    @Input() config!: ModalConfig;

    @Output() close = new EventEmitter<void>();
    @Output() submitForm = new EventEmitter<any>();

    form: FormGroup;

    actualFiles: { [key: string]: File } = {};

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({});
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

            // 1. Datos básicos del Perfil Efímero
            const name = rawValues.fullName;
            const email = rawValues.email;
            const documentId = rawValues.documentId;

            // 2. Destructuración para separar todo
            const {
                fullName, email: _, documentId: __,
                file_photo, file_document, file_audio, file_video,
                ...customFieldsData
            } = rawValues;

            // 3. 🚀 ARMAMOS EL PAYLOAD ESTRUCTURADO
            // Lo anidamos dentro de globalRequirements para igualar la estructura de la Política
            const structuredPayload = {
                globalRequirements: {
                    customFields: customFieldsData, // Contiene { "field_123": "Valor" }
                    media: {
                        // Tomamos los archivos reales (File) del diccionario, no el fakepath del input
                        photo: this.actualFiles['file_photo'] || null,
                        document: this.actualFiles['file_document'] || null,
                        audio: this.actualFiles['file_audio'] || null,
                        video: this.actualFiles['file_video'] || null
                    }
                }
            };

            // 4. Emitimos al Recepcionista
            this.submitForm.emit({
                name: name,
                email: email,
                documentId: documentId,
                payload: structuredPayload // ¡Ahora sí existe y está estructurado!
            });

        } else {
            this.form.markAllAsTouched(); // Muestra los errores si el usuario intentó enviar vacío
        }
    }
}