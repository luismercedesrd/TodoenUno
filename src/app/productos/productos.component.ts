import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { devEnvironment } from '../../environments/dev';

interface Product {
  name: string;
  description: string;
  priceAmount: number;
  supplierId: string;
  stock: number;
  imagen: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

@Component({
  selector: 'app-productos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  readonly productsImagesBaseUrl = devEnvironment.productsImagesBaseUrl.replace(/\/+$/, '');

  products: Product[] = [];
  suppliers: Supplier[] = [];
  categories: Category[] = [];
  isLoading = true;
  errorMessage = '';

  showModal = false;
  isSaving = false;
  saveError = '';

  selectedFile: File | null = null;
  imagePreviewUrl = '';

  productForm: FormGroup = this.fb.group({
    name:        ['', Validators.required],
    description: ['', Validators.required],
    price:       ['', Validators.required],
    sku:         [''],
    stock:       [0, [Validators.required, Validators.min(0)]],
    supplierId:  ['', Validators.required],
    categoryId:  ['', Validators.required],
    imagen:      ['']
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadSuppliers();
    this.loadCategories();
  }

  private loadSuppliers(): void {
    this.http.get<Supplier[]>(devEnvironment.supplierApiUrl).subscribe({
      next: (data) => { this.suppliers = data; },
      error: () => { this.suppliers = []; }
    });
  }

  private loadCategories(): void {
    this.http.get<Category[]>(devEnvironment.categoryApiUrl).subscribe({
      next: (data) => { this.categories = data; },
      error: () => { this.categories = []; }
    });
  }

  openModal(): void {
    this.productForm.reset({ stock: 0, sku: '', imagen: '' });
    this.saveError = '';
    this.selectedFile = null;
    this.imagePreviewUrl = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedFile = null;
    this.imagePreviewUrl = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.selectedFile = file;
    this.productForm.patchValue({ imagen: file.name });

    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreviewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const payload = {
      ...this.productForm.value,
      stock: Number(this.productForm.value.stock)
    };

    this.http.post(devEnvironment.productsApiUrl, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.showModal = false;
        this.isLoading = true;
        this.loadProducts();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.saveError = this.extractErrorMessage(err, 'No fue posible guardar el producto.');
      }
    });
  }

  private extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) {
      const firstLine = body.split('\n')[0].replace(/^System\.\w+:\s*/, '').trim();
      return firstLine || fallback;
    }
    if (body?.errors) {
      const fieldErrors = Object.entries(body.errors as Record<string, string[]>)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join(' | ');
      return fieldErrors || body.title || fallback;
    }
    if (body?.title) return body.title;
    if (body?.message) return body.message;
    return fallback;
  }

  isInvalid(field: string): boolean {
    const control = this.productForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  private loadProducts(): void {
    this.http.get<unknown[]>(devEnvironment.productsApiUrl).subscribe({
      next: (response) => {
        this.products = response.map((item) => this.mapProduct(item));
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar los productos desde la API.';
        this.isLoading = false;
      }
    });
  }

  private mapProduct(item: unknown): Product {
    const source = (item ?? {}) as Record<string, unknown>;

    return {
      name: this.getString(source, 'name', 'Name'),
      description: this.getString(source, 'description', 'Description'),
      priceAmount: this.getPriceAmount(source),
      supplierId: this.getString(source, 'supplierId', 'SupplierId'),
      stock: this.getNumber(source, 'stock', 'Stock'),
      imagen: this.extractImageName(this.getString(source, 'imagen', 'Imagen'))
    };
  }

  private getPriceAmount(source: Record<string, unknown>): number {
    const directPrice = this.getNumber(source, 'priceAmount', 'PriceAmount');
    if (directPrice !== 0) {
      return directPrice;
    }

    const priceObject = this.getValueByKey(source, 'price', 'Price');
    if (!priceObject || typeof priceObject !== 'object') {
      return directPrice;
    }

    return this.getNumber(priceObject as Record<string, unknown>, 'amount', 'Amount');
  }

  private extractImageName(imagePath: string): string {
    const path = imagePath.trim();

    if (!path) {
      return '';
    }

    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('data:') ||
      path.startsWith('blob:')
    ) {
      const lastSegment = path.split('/').filter(Boolean).pop() ?? '';
      return decodeURIComponent(lastSegment);
    }

    const normalizedPath = path.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').filter(Boolean).pop() ?? '';

    if (!fileName) {
      return '';
    }

    return fileName;
  }

  private getString(source: Record<string, unknown>, lower: string, upper: string): string {
    const value = this.getValueByKey(source, lower, upper);
    return typeof value === 'string' ? value : '';
  }

  private getNumber(source: Record<string, unknown>, lower: string, upper: string): number {
    const value = this.getValueByKey(source, lower, upper);

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value !== 'string') {
      return 0;
    }

    const normalized = value.trim().replace(/\s/g, '').replace(/[$€£]/g, '');

    if (!normalized) {
      return 0;
    }

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    let normalizedNumber = normalized;

    if (hasComma && hasDot) {
      if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
        normalizedNumber = normalized.replace(/\./g, '').replace(',', '.');
      } else {
        normalizedNumber = normalized.replace(/,/g, '');
      }
    } else if (hasComma) {
      normalizedNumber = normalized.replace(',', '.');
    }

    const parsed = Number(normalizedNumber);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getValueByKey(source: Record<string, unknown>, lower: string, upper: string): unknown {
    const directValue = source[lower] ?? source[upper];
    if (directValue !== undefined && directValue !== null) {
      return directValue;
    }

    const expectedKeys = [lower.toLowerCase(), upper.toLowerCase()];
    const matchedKey = Object.keys(source).find((key) => expectedKeys.includes(key.toLowerCase()));

    return matchedKey ? source[matchedKey] : undefined;
  }
}
