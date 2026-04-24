import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, UserRequest } from './services/user.service';
import { RoleService, Role } from '../roles/services/role.service';
import { DepartmentService, Department } from '../departments/services/department.service';
import { ButtonComponent } from '../../../ui/components/button/button';
import { InputComponent } from '../../../ui/components/input/input';
import { LucideAngularModule, Plus, Pencil, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  departments: Department[] = [];

  showForm = false;
  editingId: string | null = null;

  formUser: UserRequest = {
    name: '',
    email: '',
    password: '',
    roleId: '',
    departamentoId: ''
  };

  readonly PlusIcon = Plus;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private deptService: DepartmentService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadUsers();
    this.loadDependencies();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error cargando usuarios", err)
    });
  }

  loadDependencies() {
    this.roleService.getRoles().subscribe({ next: r => { this.roles = r; this.cdr.detectChanges(); } });
    this.deptService.getDepartments().subscribe({ next: d => { this.departments = d; this.cdr.detectChanges(); } });
  }

  openCreateForm() {
    this.showForm = true;
    this.editingId = null;
    this.formUser = { name: '', email: '', password: '', roleId: '', departamentoId: '' };
  }

  openEditForm(user: User) {
    this.showForm = true;
    this.editingId = user.id!;
    this.formUser = {
      name: user.name,
      email: user.email,
      password: '', // Password en blanco al editar, asumiendo que es opcional
      roleId: user.role?.id || '',
      departamentoId: user.departamento?.id || ''
    };
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
  }

  saveUser() {
    if (!this.formUser.name || !this.formUser.email) return;

    if (this.editingId) {
      // Remover password si no se quiere actualizar
      const dataToSave = { ...this.formUser };
      if (!dataToSave.password) delete dataToSave.password;

      this.userService.updateUser(this.editingId, dataToSave).subscribe({
        next: () => {
          this.loadUsers();
          this.closeForm();
        },
        error: (err) => {
          console.error("Error actualizando", err);
          this.loadUsers();
          this.closeForm();
        }
      });
    } else {
      this.userService.createUser(this.formUser).subscribe({
        next: () => {
          this.loadUsers();
          this.closeForm();
        },
        error: (err) => {
          console.error("Error validando JSON en creación pero pudo haberse creado exitosamente:", err);
          this.loadUsers();
          this.closeForm();
        }
      });
    }
  }

  deleteUser(id: string) {
    if (confirm("¿Inhabilitar este usuario?")) {
      this.userService.deleteUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error("Error inhabilitando", err)
      });
    }
  }
}
