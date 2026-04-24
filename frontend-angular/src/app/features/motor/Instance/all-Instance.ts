import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstanceService } from '../perfilEfimero/service/instance.service';

@Component({
    selector: 'app-all-instances',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './all-Instance.html'
})
export class AllInstances implements OnInit {

    instancesHistory: any[] = [];
    isLoadingHistory = true;

    constructor(
        private instanceService: InstanceService
    ) { }

    ngOnInit(): void {
        this.loadHistory();
    }

    loadHistory() {
        this.isLoadingHistory = true;
        this.instanceService.getAllInstances().subscribe({
            next: (data: any) => {
                this.instancesHistory = data;
                this.isLoadingHistory = false;
                console.log('📦 Historial cargado en nueva vista:', this.instancesHistory);
            },
            error: (err: any) => {
                console.error('❌ Error cargando historial', err);
                this.isLoadingHistory = false;
            }
        });
    }
}