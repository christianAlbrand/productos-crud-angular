
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/producto';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3000/productos';

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  agregarProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto);
  }

  actualizarProducto(
    id: string,
    producto: Producto
  ): Observable<Producto> {
    return this.http.put<Producto>(
      `${this.apiUrl}/${id}`,
      producto
    );
  }

  eliminarProducto(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}
