// Component Factory - Creates and manages component instances
// Provides a centralized way to create, register, and manage UI components

import BaseComponent, { ComponentOptions } from './base-component.js';
import ModalComponent, { ModalOptions } from './modal-component.js';
import ButtonComponent, { ButtonOptions } from './button-component.js';

// Component registry type
type ComponentConstructor<T extends BaseComponent = BaseComponent> = new (options?: any) => T;

interface ComponentRegistry {
  [componentName: string]: ComponentConstructor;
}

interface ComponentInstance {
  component: BaseComponent;
  element: HTMLElement;
  options: ComponentOptions;
  createdAt: Date;
}

class ComponentFactory {
  private static instance: ComponentFactory;
  private registry: ComponentRegistry = {};
  private instances: Map<string, ComponentInstance> = new Map();
  private autoScanEnabled: boolean = true;

  constructor() {
    if (ComponentFactory.instance) {
      return ComponentFactory.instance;
    }

    ComponentFactory.instance = this;
    this.registerDefaultComponents();
    this.setupAutoScan();
  }

  // Register default components
  private registerDefaultComponents(): void {
    this.register('base', BaseComponent as any);
    this.register('modal', ModalComponent as any);
    this.register('button', ButtonComponent as any);
  }

  // Setup automatic DOM scanning
  private setupAutoScan(): void {
    if (this.autoScanEnabled) {
      // Scan on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.scanDOM());
      } else {
        this.scanDOM();
      }

      // Scan for dynamically added elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.scanElement(node as HTMLElement);
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Register a component class
  register<T extends BaseComponent>(
    name: string, 
    componentClass: ComponentConstructor<T>
  ): void {
    this.registry[name] = componentClass;
    console.log(`📦 Component registered: ${name}`);
  }

  // Create a component instance
  create<T extends BaseComponent>(
    componentName: string,
    element: HTMLElement | string,
    options: ComponentOptions = {}
  ): T | null {
    const ComponentClass = this.registry[componentName];
    if (!ComponentClass) {
      console.error(`❌ Component not found: ${componentName}`);
      return null;
    }

    try {
      // Get element
      let targetElement: HTMLElement;
      if (typeof element === 'string') {
        const found = document.querySelector(element) as HTMLElement;
        if (!found) {
          console.error(`❌ Element not found: ${element}`);
          return null;
        }
        targetElement = found;
      } else {
        targetElement = element;
      }

      // Create component
      const componentOptions = { ...options, element: targetElement };
      const component = new ComponentClass(componentOptions) as T;

      // Store instance
      const instanceId = this.generateInstanceId(componentName, targetElement);
      this.instances.set(instanceId, {
        component,
        element: targetElement,
        options: componentOptions,
        createdAt: new Date()
      });

      // Mark element as initialized
      targetElement.setAttribute('data-component', componentName);
      targetElement.setAttribute('data-component-id', instanceId);

      console.log(`✅ Component created: ${componentName} (${instanceId})`);
      return component;

    } catch (error) {
      console.error(`❌ Failed to create component ${componentName}:`, error);
      return null;
    }
  }

  // Create component from data attributes
  createFromElement(element: HTMLElement): BaseComponent | null {
    const componentName = element.getAttribute('data-component');
    if (!componentName) {
      return null;
    }

    // Check if already initialized
    if (element.hasAttribute('data-component-id')) {
      return this.getInstance(element.getAttribute('data-component-id')!)?.component || null;
    }

    // Parse options from data attributes
    const options: any = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-component-')) {
        const key = attr.name.replace('data-component-', '').replace(/-./g, x => x[1].toUpperCase());
        if (key !== 'component' && key !== 'id') {
          options[key] = this.parseAttributeValue(attr.value);
        }
      }
    });

    return this.create(componentName, element, options);
  }

  // Scan DOM for components
  scanDOM(): void {
    const elements = document.querySelectorAll('[data-component]');
    elements.forEach(element => {
      this.createFromElement(element as HTMLElement);
    });
    
    console.log(`🔍 DOM scan complete: ${elements.length} components found`);
  }

  // Scan specific element and its children
  scanElement(element: HTMLElement): void {
    // Scan the element itself
    if (element.hasAttribute('data-component')) {
      this.createFromElement(element);
    }

    // Scan children
    const children = element.querySelectorAll('[data-component]');
    children.forEach(child => {
      this.createFromElement(child as HTMLElement);
    });
  }

  // Get component instance
  getInstance(instanceId: string): ComponentInstance | null {
    return this.instances.get(instanceId) || null;
  }

  // Get component by element
  getByElement(element: HTMLElement): BaseComponent | null {
    const instanceId = element.getAttribute('data-component-id');
    if (!instanceId) {
      return null;
    }
    return this.getInstance(instanceId)?.component || null;
  }

  // Get all instances of a component type
  getByType(componentName: string): ComponentInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.element.getAttribute('data-component') === componentName
    );
  }

  // Destroy component instance
  destroy(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    try {
      instance.component.destroy();
      instance.element.removeAttribute('data-component-id');
      this.instances.delete(instanceId);
      
      console.log(`🗑️ Component destroyed: ${instanceId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to destroy component ${instanceId}:`, error);
      return false;
    }
  }

  // Destroy all instances
  destroyAll(): void {
    const instanceIds = Array.from(this.instances.keys());
    instanceIds.forEach(id => this.destroy(id));
    console.log(`🗑️ All components destroyed: ${instanceIds.length} instances`);
  }

  // Destroy components by type
  destroyByType(componentName: string): number {
    const instances = this.getByType(componentName);
    let destroyed = 0;

    instances.forEach(instance => {
      const instanceId = instance.element.getAttribute('data-component-id');
      if (instanceId && this.destroy(instanceId)) {
        destroyed++;
      }
    });

    return destroyed;
  }

  // Utility methods
  private generateInstanceId(componentName: string, element: HTMLElement): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const elementId = element.id || 'el';
    return `${componentName}-${elementId}-${timestamp}-${random}`;
  }

  private parseAttributeValue(value: string): any {
    // Try to parse as JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Parse boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Parse number
    if (!isNaN(Number(value)) && value !== '') {
      return Number(value);
    }

    return value;
  }

  // Getters
  get registeredComponents(): string[] {
    return Object.keys(this.registry);
  }

  get instanceCount(): number {
    return this.instances.size;
  }

  get allInstances(): ComponentInstance[] {
    return Array.from(this.instances.values());
  }

  // Static methods
  static getInstance(): ComponentFactory {
    if (!ComponentFactory.instance) {
      ComponentFactory.instance = new ComponentFactory();
    }
    return ComponentFactory.instance;
  }

  // Convenience methods for common components
  static createButton(element: HTMLElement | string, options: ButtonOptions = {}): ButtonComponent | null {
    return ComponentFactory.getInstance().create<ButtonComponent>('button', element, options);
  }

  static createModal(element: HTMLElement | string, options: ModalOptions = {}): ModalComponent | null {
    return ComponentFactory.getInstance().create<ModalComponent>('modal', element, options);
  }
}

// Global factory instance
const componentFactory = ComponentFactory.getInstance();

// Export for module usage
export default ComponentFactory;
export { componentFactory };
export type { ComponentRegistry, ComponentInstance, ComponentConstructor };