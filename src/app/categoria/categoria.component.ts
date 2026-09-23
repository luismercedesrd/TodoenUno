import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { devEnvironment } from '../../environments/dev';

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  categoryTypeId: string | null;
}

@Component({
  selector: 'app-categoria',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categoria.component.html',
  styleUrl: './categoria.component.css'
})
export class CategoriaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  categories: Category[] = [];
  isLoading = true;
  errorMessage = '';

  // Modal crear/editar
  showModal = false;
  isSaving = false;
  saveError = '';
  editingId: string | null = null;

  // Modal confirmar eliminación
  showDeleteModal = false;
  isDeleting = false;
  deleteError = '';
  categoryToDelete: Category | null = null;

  categoryForm: FormGroup = this.fb.group({
    name:           ['', Validators.required],
    code:           [''],
    description:    [''],
    categoryTypeId: ['']
  });

  get modalTitle(): string {
    return this.editingId ? 'Editar Categoría' : 'Nueva Categoría';
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<Category[]>(devEnvironment.categoryApiUrl).subscribe({
      next: (data) => { this.categories = data; this.isLoading = false; },
      error: () => { this.errorMessage = 'No fue posible cargar las categorías.'; this.isLoading = false; }
    });
  }

  // ── Crear ──────────────────────────────────────────
  openCreateModal(): void {
    this.editingId = null;
    this.categoryForm.reset();
    this.saveError = '';
    this.showModal = true;
  }

  // ── Editar ─────────────────────────────────────────
  openEditModal(cat: Category): void {
    this.editingId = cat.id;
    this.categoryForm.setValue({
      name:           cat.name,
      code:           cat.code ?? '',
      description:    cat.description ?? '',
      categoryTypeId: cat.categoryTypeId ?? ''
    });
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  saveCategory(): void {
    if (this.categoryForm.invalid) { this.categoryForm.markAllAsTouched(); return; }

    this.isSaving = true;
    this.saveError = '';

    const formValue = {
      ...this.categoryForm.value,
      categoryTypeId: this.categoryForm.value.categoryTypeId || null
    };

    const request$ = this.editingId
      ? this.http.put(devEnvironment.categoryApiUrl, { category: { id: this.editingId, ...formValue } })
      : this.http.post(devEnvironment.categoryApiUrl, formValue);

    request$.subscribe({
      next: () => { this.isSaving = false; this.showModal = false; this.loadCategories(); },
      error: () => { this.isSaving = false; this.saveError = 'No fue posible guardar la categoría. Inténtalo de nuevo.'; }
    });
  }

  // ── Eliminar ───────────────────────────────────────
  openDeleteModal(cat: Category): void {
    this.categoryToDelete = cat;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void { this.showDeleteModal = false; this.categoryToDelete = null; }

  confirmDelete(): void {
    if (!this.categoryToDelete) return;
    this.isDeleting = true;
    this.deleteError = '';

    this.http.delete(`${devEnvironment.categoryApiUrl}/${this.categoryToDelete.id}`).subscribe({
      next: () => { this.isDeleting = false; this.showDeleteModal = false; this.categoryToDelete = null; this.loadCategories(); },
      error: () => { this.isDeleting = false; this.deleteError = 'No fue posible eliminar la categoría.'; }
    });
  }

  isInvalid(field: string): boolean {
    const control = this.categoryForm.get(field);
    return !!(control && control.invalid && control.touched);
  }
}
