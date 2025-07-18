// Base Component Class for MoonYetis Ecosystem
// Provides common functionality for all UI components

interface ComponentOptions {
  element?: HTMLElement;
  selector?: string;
  data?: Record<string, any>;
  autoInit?: boolean;
}

interface ComponentEvents {
  [eventName: string]: (...args: any[]) => void;
}

abstract class BaseComponent {
  protected element: HTMLElement;
  protected data: Record<string, any>;
  protected events: ComponentEvents = {};
  protected isInitialized: boolean = false;
  protected isDestroyed: boolean = false;

  constructor(options: ComponentOptions = {}) {
    // Find or create element
    if (options.element) {
      this.element = options.element;
    } else if (options.selector) {
      const found = document.querySelector(options.selector) as HTMLElement;
      if (!found) {
        throw new Error(`Element not found: ${options.selector}`);
      }
      this.element = found;
    } else {
      throw new Error('Either element or selector must be provided');
    }

    // Set data
    this.data = options.data || {};

    // Auto-initialize if requested
    if (options.autoInit !== false) {
      this.init();
    }
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract render(): void;

  // Common initialization logic
  init(): void {
    if (this.isInitialized || this.isDestroyed) {
      return;
    }

    this.setupEventListeners();
    this.render();
    this.onInit();
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  // Override in subclasses for custom initialization
  protected onInit(): void {}

  // Setup event listeners (override in subclasses)
  protected setupEventListeners(): void {}

  // Cleanup method
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.removeEventListeners();
    this.onDestroy();
    
    this.isDestroyed = true;
    this.isInitialized = false;
    this.emit('destroyed');
  }

  // Override in subclasses for custom cleanup
  protected onDestroy(): void {}

  // Remove event listeners (override in subclasses)
  protected removeEventListeners(): void {}

  // Event system
  on(eventName: string, handler: (...args: any[]) => void): void {
    if (!this.events[eventName]) {
      this.events[eventName] = handler;
    }
  }

  off(eventName: string): void {
    delete this.events[eventName];
  }

  emit(eventName: string, ...args: any[]): void {
    const handler = this.events[eventName];
    if (handler) {
      handler(...args);
    }

    // Also dispatch DOM event
    const event = new CustomEvent(`component:${eventName}`, {
      detail: { component: this, args },
      bubbles: true
    });
    this.element.dispatchEvent(event);
  }

  // Data management
  setData(key: string, value: any): void {
    this.data[key] = value;
    this.emit('dataChanged', key, value);
  }

  getData(key: string): any {
    return this.data[key];
  }

  getAllData(): Record<string, any> {
    return { ...this.data };
  }

  // DOM helpers
  protected $(selector: string): HTMLElement | null {
    return this.element.querySelector(selector);
  }

  protected $$(selector: string): NodeListOf<HTMLElement> {
    return this.element.querySelectorAll(selector);
  }

  protected addClass(className: string): void {
    this.element.classList.add(className);
  }

  protected removeClass(className: string): void {
    this.element.classList.remove(className);
  }

  protected toggleClass(className: string): void {
    this.element.classList.toggle(className);
  }

  protected hasClass(className: string): boolean {
    return this.element.classList.contains(className);
  }

  // State management
  protected setState(newState: Partial<Record<string, any>>): void {
    Object.assign(this.data, newState);
    this.render();
    this.emit('stateChanged', newState);
  }

  // Animation helpers
  protected async animate(
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions = {}
  ): Promise<void> {
    const animation = this.element.animate(keyframes, {
      duration: 300,
      easing: 'ease-in-out',
      ...options
    });

    return animation.finished;
  }

  protected async fadeIn(duration: number = 300): Promise<void> {
    return this.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], { duration });
  }

  protected async fadeOut(duration: number = 300): Promise<void> {
    return this.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], { duration });
  }

  protected async slideDown(duration: number = 300): Promise<void> {
    const height = this.element.scrollHeight;
    return this.animate([
      { height: '0px', overflow: 'hidden' },
      { height: `${height}px`, overflow: 'hidden' }
    ], { duration });
  }

  protected async slideUp(duration: number = 300): Promise<void> {
    const height = this.element.scrollHeight;
    return this.animate([
      { height: `${height}px`, overflow: 'hidden' },
      { height: '0px', overflow: 'hidden' }
    ], { duration });
  }

  // Utility methods
  protected debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  protected throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Getters
  get isReady(): boolean {
    return this.isInitialized && !this.isDestroyed;
  }

  get elementRef(): HTMLElement {
    return this.element;
  }
}

export default BaseComponent;
export type { ComponentOptions, ComponentEvents };