import type { Product } from '../types';
import { get, post, put, del } from './api';

export function fetchProducts(projectId: string): Promise<Product[]> {
  return get<Product[]>(`/projects/${projectId}/products`);
}

export function fetchProduct(projectId: string, productId: string): Promise<Product> {
  return get<Product>(`/projects/${projectId}/products/${productId}`);
}

export function createProduct(projectId: string, data: Partial<Product>): Promise<Product> {
  return post<Product>(`/projects/${projectId}/products`, data);
}

export function updateProduct(projectId: string, productId: string, data: Partial<Product>): Promise<Product> {
  return put<Product>(`/projects/${projectId}/products/${productId}`, data);
}

export function deleteProduct(projectId: string, productId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/products/${productId}`);
}
