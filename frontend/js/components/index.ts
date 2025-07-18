// MoonYetis Components - Main Export File
// Centralized export for all component classes and utilities

// Base classes
export { default as BaseComponent } from './base-component.js';
export type { ComponentOptions, ComponentEvents } from './base-component.js';

// Specialized components
export { default as ModalComponent } from './modal-component.js';
export type { ModalOptions, ModalState } from './modal-component.js';

export { default as ButtonComponent } from './button-component.js';
export type { ButtonOptions, ButtonState } from './button-component.js';

// Factory and utilities
export { default as ComponentFactory, componentFactory } from './component-factory.js';
export type { ComponentRegistry, ComponentInstance, ComponentConstructor } from './component-factory.js';

// Convenience re-exports for easy access
export const Components = {
  Base: BaseComponent,
  Modal: ModalComponent,
  Button: ButtonComponent,
  Factory: ComponentFactory
};

// Global initialization
export function initializeComponents(): void {
  console.log('🚀 Initializing MoonYetis Component System...');
  
  // The factory automatically scans on instantiation
  const factory = ComponentFactory.getInstance();
  
  console.log(`✅ Component system ready with ${factory.registeredComponents.length} registered components`);
  console.log(`📦 Available components: ${factory.registeredComponents.join(', ')}`);
}

// Auto-initialize on import (can be disabled if needed)
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  initializeComponents();
} else if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializeComponents);
}

// Make components available globally for non-module usage
declare global {
  interface Window {
    MoonYetisComponents: typeof Components;
    ComponentFactory: typeof ComponentFactory;
  }
}

if (typeof window !== 'undefined') {
  window.MoonYetisComponents = Components;
  window.ComponentFactory = ComponentFactory;
}