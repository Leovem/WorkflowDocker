import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService, Role } from './services/role.service';
import { ButtonComponent } from '../../../ui/components/button/button';
import { InputComponent } from '../../../ui/components/input/input';
import { LucideAngularModule, Plus, Pencil, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  templateUrl: './roles.html',
})
export class Roles implements OnInit {
  roles: Role[] = [];

  showForm = false;
  editingId: string | null = null;
  formRole: Role = { name: '' };

  readonly PlusIcon = Plus;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;

  constructor(
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.roleService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error cargando roles", err)
    });
  }

  openCreateForm() {
    this.showForm = true;
    this.editingId = null;
    this.formRole = { name: '' };
  }

  openEditForm(role: Role) {
    this.showForm = true;
    this.editingId = role.id!;
    this.formRole = { ...role };
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
  }

  saveRole() {
    if (!this.formRole.name.trim()) return;

    if (this.editingId) {
      this.roleService.updateRole(this.editingId, this.formRole).subscribe({
        next: () => {
          this.loadRoles();
          this.closeForm();
        },
        error: (err) => {
          console.error("Error actualizando", err);
          this.loadRoles();
          this.closeForm();
        }
      });
    } else {
      this.roleService.createRole(this.formRole).subscribe({
        next: () => {
          this.loadRoles();
          this.closeForm();
        },
        error: (err) => {
          console.error("Error validando JSON en creación:", err);
          this.loadRoles();
          this.closeForm();
        }
      });
    }
  }

  deleteRole(id: string) {
    if (confirm("¿Estás seguro de eliminar este Rol permanentemente? Esta acción puede afectar a los usuarios con este rol.")) {
      this.roleService.deleteRole(id).subscribe({
        next: () => this.loadRoles(),
        error: (err) => console.error("Error eliminando", err)
      });
    }
  }
}
