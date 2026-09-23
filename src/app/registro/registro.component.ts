import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { devEnvironment } from '../../environments/dev';

interface Role {
  id: number;
  name: string;
  description: string;
}

@Component({
  selector: 'app-registro',
  imports: [FormsModule, CommonModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent implements OnInit {
  private readonly http = inject(HttpClient);

  usuario = {
    name: '',
    email: '',
    password: '',
    roleId: null as number | null
  };

  roles: Role[] = [];
  cargandoRoles = false;
  errorRoles = '';

  registrado = false;
  errorRegistro = '';
  cargando = false;

  ngOnInit(): void {
    this.loadRoles();
  }

  private loadRoles(): void {
    this.cargandoRoles = true;
    this.errorRoles = '';
    this.http.get<Role[]>(devEnvironment.rolesApiUrl).subscribe({
      next: (data) => {
        this.roles = data;
        this.cargandoRoles = false;
      },
      error: () => {
        this.errorRoles = 'No se pudieron cargar los roles.';
        this.cargandoRoles = false;
      }
    });
  }

  onSubmit(): void {
    this.cargando = true;
    this.errorRegistro = '';
    this.registrado = false;

    this.http.post(devEnvironment.authApiUrl, this.usuario).subscribe({
      next: () => {
        this.registrado = true;
        this.cargando = false;
        this.usuario = { name: '', email: '', password: '', roleId: null };
      },
      error: (err) => {
        this.errorRegistro = err?.error?.message ?? 'Error al registrar el usuario.';
        this.cargando = false;
      }
    });
  }
}
