import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService, Department } from './services/department.service';
import { ButtonComponent } from '../../../ui/components/button/button';
import { InputComponent } from '../../../ui/components/input/input';
import { LucideAngularModule, Plus, Pencil, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  templateUrl: './departments.html',
})
export class Departments implements OnInit {
  departments: Department[] = [];

  // Estado del modal o formulario
  showForm = false;
  editingId: string | null = null;
  formDept: Department = { name: '' };

  // Iconos
  readonly PlusIcon = Plus;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;

  constructor(
    private deptService: DepartmentService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadDepartments();
  }

  loadDepartments() {
    this.deptService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error cargando departamentos", err)
    });
  }

  openCreateForm() {
    this.showForm = true;
    this.editingId = null;
    this.formDept = { name: '' };
  }

  openEditForm(dept: Department) {
    this.showForm = true;
    this.editingId = dept.id!;
    this.formDept = { ...dept };
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
  }

  saveDepartment() {
    if (!this.formDept.name.trim()) return;

    if (this.editingId) {
      this.deptService.updateDepartment(this.editingId, this.formDept).subscribe({
        next: () => {
          this.loadDepartments();
          this.closeForm();
        },
        error: (err) => {
          console.error("Error actualizando", err);
          this.loadDepartments();
          this.closeForm();
        }
      });
    } else {
      this.deptService.createDepartment(this.formDept).subscribe({
        next: () => {
          this.loadDepartments();
          this.closeForm();
        },
        error: (err) => {
          console.error("Error validando JSON en creación:", err);
          this.loadDepartments();
          this.closeForm();
        }
      });
    }
  }

  deleteDepartment(id: string) {
    if (confirm("¿Estás seguro de eliminar este departamento permanentemente?")) {
      this.deptService.deleteDepartment(id).subscribe({
        next: () => this.loadDepartments(),
        error: (err) => console.error("Error eliminando", err)
      });
    }
  }
}
