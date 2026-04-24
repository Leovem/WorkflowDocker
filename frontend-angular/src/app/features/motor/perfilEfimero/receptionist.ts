import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicModalComponent, ModalConfig } from '../../../ui/components/modal/dynamic-modal.component';
import { ApiService } from '../../proccess/policy/services/api.service';
import { InstanceService } from './service/instance.service';

@Component({
    selector: 'app-receptionist',
    standalone: true,
    imports: [CommonModule, DynamicModalComponent],
    templateUrl: './receptionist.html',
})
export class ReceptionistComponent implements OnInit {

    policies: any[] = []; // Aquí guardaremos las políticas del backend
    selectedPolicyId: string | null = null;

    rawPolicyData: any = null;

    // Control del modal
    isModalOpen = false;
    currentModalConfig: ModalConfig = {
        title: '',
        showProfileFields: true,
        customFields: [],
        mediaRequirements: {
            photo: false,
            document: false,
            audio: false,
            video: false
        }
    };

    constructor(
        private ApiService: ApiService,
        private instanceService: InstanceService
    ) { } // Inyecta tu PolicyService e InstanceService aquí

    ngOnInit() {
        this.loadPolicies();
    }

    loadPolicies() {
        this.ApiService.getPoliticas().subscribe(policies => {
            this.policies = policies;
            console.log(this.policies);
        });

        console.log('Todas las politicas2: ' + this.policies);
    }


    getPolicyData(policyId: string) {
        return this.ApiService.getPolitica(policyId);
    }


    openPolicyModal(policy: any) {
        // 🚀 CORRECCIÓN 1: Extracción segura del ID (Mongo usa _id)
        let extractedId = policy._id || policy.id;
        if (typeof extractedId === 'object' && extractedId !== null) {
            extractedId = extractedId.$oid; // Por si viene como objeto OID
        }
        this.selectedPolicyId = extractedId;
        console.log('politica seleccionada', this.selectedPolicyId);

        this.getPolicyData(this.selectedPolicyId!).subscribe({
            next: (policyDataFromBackend) => {

                // ¡Los datos ya llegaron! Los guardamos
                this.rawPolicyData = policyDataFromBackend;

                // Usamos COMA (,) para que no salga [object Object]
                console.log('Información de la política:', this.rawPolicyData);

                const globalReqs = this.rawPolicyData.workflow?.globalRequirements;

                let dynamicFields: any[] = [];
                if (globalReqs && globalReqs.customFields) {
                    dynamicFields = globalReqs.customFields.map((field: any) => ({
                        name: field.id, // Usamos tu 'field_1776480389505' como formControlName
                        label: field.label,
                        type: field.type,
                        required: true, // Asumiremos que son obligatorios
                        options: field.options || []
                    }));
                }

                const mediaReqs = {
                    photo: globalReqs?.photo || false,
                    document: globalReqs?.document || false,
                    audio: globalReqs?.audio || false,
                    video: globalReqs?.video || false
                };


                const mediaLabels = globalReqs?.mediaLabels || {
                    photo: '', document: '', audio: '', video: ''
                }

                // Configuramos el modal dinámicamente con los datos FRESCOS
                this.currentModalConfig = {
                    title: 'Iniciar: ' + policy.name,
                    description: globalReqs?.description,
                    showProfileFields: true,
                    customFields: dynamicFields,
                    mediaLabels: mediaLabels,
                    mediaRequirements: mediaReqs

                };

                // Finalmente, abrimos el modal
                this.isModalOpen = true;
            },
            error: (err) => {
                console.error('Hubo un error trayendo la política:', err);
                alert('No se pudieron cargar los requisitos del trámite.');
            }
        });

    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedPolicyId = null;
    }

    async handleFormSubmit(formData: any) {

        console.log('Iniciando subida de archivos a la nube...');
        const media = formData.payload.globalRequirements.media;
        // Separar los datos para que coincidan con tu StartRequest de Spring Boot

        try {
            // 🚀 1. Preparamos un "paquete" con todas las tareas de subida
            const tareasDeSubida = [];

            // Si existe el archivo, lo empujamos al paquete de tareas y le decimos
            // que cuando termine, reemplace el archivo por la URL
            if (media.photo) tareasDeSubida.push(this.uploadToCloudinary(media.photo).then(url => media.photo = url));
            if (media.document) tareasDeSubida.push(this.uploadToCloudinary(media.document).then(url => media.document = url));
            if (media.audio) tareasDeSubida.push(this.uploadToCloudinary(media.audio).then(url => media.audio = url));
            if (media.video) tareasDeSubida.push(this.uploadToCloudinary(media.video).then(url => media.video = url));

            // 🚀 2. AQUÍ SE CONGELA EL CÓDIGO
            // Promise.all espera a que TODAS las tareas en el arreglo terminen juntas
            if (tareasDeSubida.length > 0) {
                console.log(`Esperando a que ${tareasDeSubida.length} archivo(s) terminen de subir...`);
                await Promise.all(tareasDeSubida);
            }

            // 🚀 3. LA SIGUIENTE LÍNEA
            // Si el código llegó aquí, es GARANTÍA del 100% de que no hay objetos 'File', todo son URLs
            console.log('¡Todos los archivos se subieron con éxito!');

            const requestPayload = {
                policyId: this.selectedPolicyId,
                name: formData.name,
                email: formData.email,
                documentId: formData.documentId,
                workflow: formData.payload // Enviamos todo en el payload (Spring Boot lo filtra)
            };

            console.log('🚀 PETICIÓN LISTA PARA EL BACKEND:');
            console.log(requestPayload);

            // 4. Enviar a Spring Boot con un JSON normal

            // Llamada al Backend
            this.instanceService.createInstance(requestPayload).subscribe({
                next: (response) => {
                    console.log('✅ Instancia guardada exitosamente:', response);
                    alert('El trámite ha sido iniciado y guardado en el sistema.');
                    this.closeModal();
                },
                error: (err) => {
                    console.error('❌ Error completo:', err);
                    const mensajeBackend = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
                    alert('El servidor rechazó el trámite:\n' + mensajeBackend);
                }
            });

            alert('Trámite enviado a la ventanilla con éxito.');
        } catch (error) {
            alert('Hubo un error al subir los archivos. Intenta de nuevo.');
            // Ocultar el loading...
        }
    }


    async uploadToCloudinary(file: File): Promise<string> {
        const cloudName = 'dsu8dll2n'; // Reemplaza con tu Cloud Name
        const uploadPreset = 'tramites_workflow'; // Reemplaza con tu preset Unsigned
        console.log(`☁️ Intentando subir a Cloudinary: ${file.name}...`); // 🚀 RASTREADOR
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        try {
            // Usamos la API 'auto' para soportar imágenes, videos y PDFs
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('📥 Respuesta completa de Cloudinary:', data); // 🚀 RASTREADOR

            if (data.secure_url) {
                return data.secure_url; // ¡Devuelve la URL permanente!
            } else {
                throw new Error('No se recibió la URL de Cloudinary');
            }
        } catch (error) {
            console.error('Error subiendo a Cloudinary:', error);
            throw error;
        }
    }

}