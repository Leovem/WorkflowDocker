import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SseService } from './service/sse.service';
import { InstanceService } from '../perfilEfimero/service/instance.service';
import { DynamicField, DynamicModalTaskComponent, ModalConfig } from '../../../ui/components/modal/dynamic-modal-task.component';
import { Subscription } from 'rxjs';

interface Toast {
    id: number;
    title: string;
    message: string;
}

@Component({
    selector: 'app-inbox',
    standalone: true,
    imports: [CommonModule, DynamicModalTaskComponent], // 🚀 IMPORTA EL COMPONENTE AQUÍ
    templateUrl: './inbox.component.html'
})
export class InboxComponent implements OnInit, OnDestroy {

    pendingTasks: any[] = [];
    isLoading = true;
    department = localStorage.getItem("department");
    departamentId = localStorage.getItem("departamentId");
    toasts: Toast[] = [];
    private toastCounter = 0;

    // --- VARIABLES DEL MODAL DINÁMICO ---
    selectedTask: any = null;
    isModalOpen = false; // Controla si el modal se ve o no
    modalConfig!: ModalConfig; // La configuración que le pasaremos
    isSubmitting = false;

    private sseSubscription!: Subscription;

    constructor(
        private sseService: SseService,
        private instanceService: InstanceService
    ) { }

    ngOnInit(): void {
        this.loadPendingTasks();
        this.escucharNotificaciones();
    }


    escucharNotificaciones(): void {
        this.sseSubscription = this.sseService.notifications$.subscribe({
            next: (mensaje) => {
                // 1. Mostrar el mensaje visualmente usando tu sistema de toasts
                this.showToast('Actualización en tiempo real', mensaje);

                // 2. 🚀 LA MAGIA: Recargar la lista de tareas automáticamente
                console.log("🔔 Notificación recibida, recargando bandeja...");
                this.loadPendingTasks();
            },
            error: (err) => {
                console.error("❌ Error en la suscripción SSE del Inbox:", err);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.sseSubscription) {
            this.sseSubscription.unsubscribe();
            console.log("🔌 Suscripción SSE del Inbox cerrada para evitar fugas de memoria.");
        }
    }

    loadPendingTasks(): void {
        this.isLoading = true;
        const deptId = this.departamentId || "";

        this.instanceService.getPendingTasks(deptId).subscribe({
            next: (data) => {
                this.pendingTasks = data;
                this.isLoading = false;
                console.log("Trámites pendientes cargados:", this.pendingTasks);
            },
            error: (err) => {
                this.isLoading = false;
                this.showToast('Error', 'No se pudieron cargar los trámites pendientes.');
            }
        });
    }

    // 🚀 NUEVO ENFOQUE: Fetch en tiempo real del Expediente
    openTask(taskSummary: any) {
        this.selectedTask = taskSummary;

        // 1. Extraemos los datos básicos del nodo que vienen en el resumen
        const node = taskSummary.nodeData;
        const config = node.configuration;

        const mappedFields: DynamicField[] = (config.formFields || []).map((f: any) => ({
            name: f.label,
            label: f.label.replace(/_/g, ' ').toUpperCase(),
            type: f.type,
            required: true,
            options: f.options || []
        }));

        // Ponemos el botón en "cargando" visualmente si lo deseas
        console.log(`Buscando expediente completo para la Instancia ID: ${taskSummary.id}...`);

        // 2. 🚀 LLAMADA AL BACKEND PARA TRAER LA INSTANCIA COMPLETA
        this.instanceService.getInstanceById(taskSummary.id).subscribe({
            next: (fullInstance) => {
                console.log("📥 Expediente completo recibido:", fullInstance);

                let expediente: any[] = [];

                // A) Datos iniciales del ciudadano (Vienen del workflow recién consultado)
                if (fullInstance.workflow && fullInstance.workflow.globalRequirements) {
                    const initialData = fullInstance.workflow.globalRequirements;
                    expediente.push({
                        titulo: "Solicitud Inicial del Ciudadano",
                        datos: initialData.customFields || {},
                        media: initialData.media || null,
                        fecha: fullInstance.createdAt
                    });
                }

                // B) Tareas previas completadas (Vienen del history recién consultado)
                if (fullInstance.history && Array.isArray(fullInstance.history)) {
                    // Filtramos solo los eventos donde un humano envió datos
                    const enviosAnteriores = fullInstance.history.filter((h: any) => h.action === 'USER_SUBMIT');

                    enviosAnteriores.forEach((envio: any) => {
                        // Buscamos el nombre del nodo buscando el evento SYSTEM_VISITED_NODE
                        const nodoInfo = fullInstance.history.find((h: any) => h.nodeId === envio.nodeId && h.action === 'SYSTEM_VISITED_NODE');
                        const nombreTarea = nodoInfo ? nodoInfo.nodeName : 'Tarea Anterior';

                        if (envio.submittedData && envio.submittedData.nodo) {
                            const datosTarea = { ...envio.submittedData.nodo };
                            const media = datosTarea.media || null;
                            delete datosTarea.media; // Quitamos media para que no se imprima como texto

                            expediente.push({
                                titulo: nombreTarea,
                                datos: datosTarea,
                                media: media,
                                fecha: envio.timestamp
                            });
                        }
                    });
                }

                // 3. ARMAMOS LA CONFIGURACIÓN DEL MODAL
                this.modalConfig = {
                    title: node.name || 'Completar Tarea',
                    description: node.description || 'Por favor complete los campos requeridos para avanzar el flujo.',
                    showProfileFields: false,
                    customFields: mappedFields,
                    mediaRequirements: config.multimedia || { photo: false, document: false, audio: false, video: false },
                    mediaLabels: config.mediaLabels,

                    // 🚀 LE PASAMOS EL EXPEDIENTE RECIÉN CALCULADO
                    previousData: expediente
                };

                // 4. AHORA SÍ, ABRIMOS EL MODAL
                this.isModalOpen = true;
            },
            error: (err) => {
                console.error("❌ Error al traer el expediente completo:", err);
                this.showToast('Error', 'No se pudo cargar el expediente del trámite.');
            }
        });
    }





    closeTask() {
        this.isModalOpen = false;
        this.selectedTask = null;
    }

    // 🚀 RECIBE TODO: Campos dinámicos + Objetos File de multimedia
    // 🚀 RECIBE TODO: Campos dinámicos + Objetos File de multimedia
    async submitTask(taskData: any) {
        if (!this.selectedTask) return;
        this.isSubmitting = true;

        // 🚀 CORRECCIÓN 2: La ruta correcta hacia los archivos físicos
        const media = taskData.nodo.media;

        console.log("📤 Datos recibidos del modal (Antes de Cloudinary):", taskData);

        try {
            const tareasDeSubida = [];

            // Si existe el archivo, lo empujamos al paquete de tareas y le decimos
            // que cuando termine, reemplace el archivo por la URL permanente.
            if (media.photo) tareasDeSubida.push(this.uploadToCloudinary(media.photo).then(url => media.photo = url));
            if (media.document) tareasDeSubida.push(this.uploadToCloudinary(media.document).then(url => media.document = url));
            if (media.audio) tareasDeSubida.push(this.uploadToCloudinary(media.audio).then(url => media.audio = url));
            if (media.video) tareasDeSubida.push(this.uploadToCloudinary(media.video).then(url => media.video = url));

            // Esperamos a que TODAS las subidas terminen en paralelo
            if (tareasDeSubida.length > 0) {
                console.log(`Esperando a que ${tareasDeSubida.length} archivo(s) terminen de subir...`);
                await Promise.all(tareasDeSubida);
            }

            console.log("✅ URLs de Cloudinary inyectadas correctamente:", taskData);

            // Enviamos el ID de la instancia y el objeto con TODAS las respuestas (Ahora con URLs)
            this.instanceService.completeTask(this.selectedTask.id, this.selectedTask.nodeData.id, taskData).subscribe({
                next: (response) => {
                    this.isSubmitting = false;
                    this.closeTask();
                    this.loadPendingTasks();
                    this.showToast('Éxito', 'La tarea ha sido procesada correctamente.');
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error("❌ Error al avanzar el motor:", err);
                    this.showToast('Error', 'No se pudo completar la tarea en el servidor.');
                }
            });
        } catch (error) {
            this.isSubmitting = false;
            console.error("❌ Fallo en la subida a Cloudinary:", error);
            alert('Hubo un error al subir los archivos. Intenta de nuevo.');
        }
    }

    showToast(title: string, message: string): void {
        const id = ++this.toastCounter;
        this.toasts.push({ id, title, message });
        setTimeout(() => this.removeToast(id), 5000);
    }
    removeToast(id: number): void {
        this.toasts = this.toasts.filter(t => t.id !== id);
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