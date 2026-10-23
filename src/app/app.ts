import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { Producto } from './models/producto';
import { ProductoService } from './services/producto.service';

type TipoMensaje = 'exito' | 'error' | 'info';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private productoService = inject(ProductoService);
  private formulario = viewChild(NgForm);

  // Estado de la interfaz (signals)
  productos = signal<Producto[]>([]);
  cargandoProductos = signal(true);
  errorCarga = signal(false);
  cargando = signal(false);
  productoEditando = signal<string | null>(null);
  mensaje = signal('');
  tipoMensaje = signal<TipoMensaje>('exito');

  // Modelo del formulario (ngModel)
  productoFormulario: Producto = this.nuevoFormulario();

  private temporizadorMensaje?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargarProductos();
  }

  private nuevoFormulario(): Producto {
    return { nombre: '', precio: 0, stock: 0 };
  }

  // GET
  cargarProductos(): void {
    this.cargandoProductos.set(true);
    this.errorCarga.set(false);

    this.productoService.obtenerProductos().subscribe({
      next: (datos) => {
        this.productos.set(datos);
        this.cargandoProductos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.cargandoProductos.set(false);
        this.errorCarga.set(true);
        this.mostrarMensaje(
          'No se pudieron cargar los productos. Verifica que JSON Server esté activo.',
          'error'
        );
      }
    });
  }

  // POST / PUT
  guardarProducto(form: NgForm): void {
    if (this.cargando()) {
      return;
    }

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const datos: Producto = {
      nombre: this.productoFormulario.nombre.trim(),
      precio: Number(this.productoFormulario.precio),
      stock: Number(this.productoFormulario.stock)
    };

    if (datos.nombre.length < 3) {
      this.mostrarMensaje('El nombre debe tener al menos 3 caracteres (sin contar espacios).', 'error');
      return;
    }
    if (!Number.isFinite(datos.precio) || datos.precio <= 0) {
      this.mostrarMensaje('El precio debe ser mayor a 0.', 'error');
      return;
    }
    if (!Number.isInteger(datos.stock) || datos.stock < 0) {
      this.mostrarMensaje('El stock debe ser un número entero de 0 o más.', 'error');
      return;
    }

    this.cargando.set(true);
    const id = this.productoEditando();

    if (id !== null) {
      this.productoService.actualizarProducto(id, datos).subscribe({
        next: (actualizado) => {
          const nuevo = { ...datos, ...actualizado, id };
          this.productos.update(lista => lista.map(p => (p.id === id ? nuevo : p)));
          this.finalizarOperacion('Producto actualizado correctamente.', form);
        },
        error: () => {
          this.cargando.set(false);
          this.mostrarMensaje('No se pudo actualizar el producto.', 'error');
        }
      });
    } else {
      this.productoService.agregarProducto(datos).subscribe({
        next: (creado) => {
          this.productos.update(lista => [...lista, creado]);
          this.finalizarOperacion('Producto registrado correctamente.', form);
        },
        error: () => {
          this.cargando.set(false);
          this.mostrarMensaje('No se pudo registrar el producto.', 'error');
        }
      });
    }
  }

  editarProducto(producto: Producto): void {
    if (this.cargando() || !producto.id) {
      return;
    }

    this.productoEditando.set(producto.id);
    this.productoFormulario = {
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock
    };

    this.limpiarMensaje();
  }

  cancelarEdicion(form: NgForm): void {
    if (this.cargando()) {
      return;
    }
    this.limpiarFormulario(form);
    this.mostrarMensaje('Edición cancelada.', 'info');
  }

  // DELETE
  eliminarProducto(producto: Producto): void {
    if (this.cargando() || !producto.id) {
      return;
    }

    const confirmar = window.confirm(`¿Deseas eliminar el producto "${producto.nombre}"?`);
    if (!confirmar) {
      return;
    }

    this.cargando.set(true);

    this.productoService.eliminarProducto(producto.id).subscribe({
      next: () => {
        this.productos.update(lista => lista.filter(p => p.id !== producto.id));

        if (this.productoEditando() === producto.id) {
          this.limpiarFormulario(this.formulario());
        }

        this.cargando.set(false);
        this.mostrarMensaje('Producto eliminado correctamente.', 'exito');
      },
      error: () => {
        this.cargando.set(false);
        this.mostrarMensaje('No se pudo eliminar el producto.', 'error');
      }
    });
  }

  private finalizarOperacion(mensaje: string, form: NgForm): void {
    this.limpiarFormulario(form);
    this.cargando.set(false);
    this.mostrarMensaje(mensaje, 'exito');
  }

  private limpiarFormulario(form?: NgForm): void {
    this.productoFormulario = this.nuevoFormulario();
    this.productoEditando.set(null);
    form?.resetForm(this.productoFormulario);
  }

  private mostrarMensaje(mensaje: string, tipo: TipoMensaje): void {
    clearTimeout(this.temporizadorMensaje);

    this.mensaje.set(mensaje);
    this.tipoMensaje.set(tipo);

    this.temporizadorMensaje = setTimeout(() => this.limpiarMensaje(), 4000);
  }

  private limpiarMensaje(): void {
    clearTimeout(this.temporizadorMensaje);
    this.mensaje.set('');
  }
}