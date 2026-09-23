import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { devEnvironment } from '../../environments/dev';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  credenciales = {
    email: '',
    password: ''
  };

  cargando = false;
  error = '';

  onSubmit(): void {
    this.cargando = true;
    this.error = '';

    this.http.post<any>(devEnvironment.loginApiUrl, this.credenciales).subscribe({
      next: (res) => {
        this.cargando = false;
        const token = res?.token ?? '';
        const name = res?.name ?? res?.userName ?? res?.email ?? this.credenciales.email;
        this.auth.saveSession(token, name);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Email o contraseña incorrectos.';
        this.cargando = false;
      }
    });
  }
}

