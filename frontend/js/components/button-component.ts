// Button Component Class
// Provides enhanced button functionality with loading states, animations, and accessibility

import BaseComponent, { ComponentOptions } from './base-component.js';

interface ButtonOptions extends ComponentOptions {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  ripple?: boolean;
  href?: string;
  target?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface ButtonState {
  isLoading: boolean;
  isDisabled: boolean;
  isPressed: boolean;
  originalText: string;
  originalHTML: string;
}

class ButtonComponent extends BaseComponent {
  protected options: ButtonOptions;
  protected buttonState: ButtonState;
  private clickHandler?: (e: Event) => void;

  constructor(options: ButtonOptions = {}) {
    super(options);
    
    this.options = {
      variant: 'primary',
      size: 'md',
      loading: false,
      disabled: false,
      iconPosition: 'left',
      ripple: true,
      type: 'button',
      ...options
    };

    this.buttonState = {
      isLoading: false,
      isDisabled: this.options.disabled || false,
      isPressed: false,
      originalText: this.element.textContent || '',
      originalHTML: this.element.innerHTML || ''
    };
  }

  protected onInit(): void {
    super.onInit();
    this.setupButton();
    this.setupAccessibility();
    this.applyStyles();
  }

  protected render(): void {
    this.updateAppearance();
    this.updateState();
  }

  private setupButton(): void {
    // Ensure it's a button or link
    if (this.element.tagName !== 'BUTTON' && this.element.tagName !== 'A') {
      this.element.setAttribute('role', 'button');
      this.element.setAttribute('tabindex', '0');
    }

    // Set button type
    if (this.element.tagName === 'BUTTON') {
      this.element.setAttribute('type', this.options.type || 'button');
    }

    // Set link attributes
    if (this.options.href) {
      if (this.element.tagName === 'A') {
        (this.element as HTMLAnchorElement).href = this.options.href;
        if (this.options.target) {
          (this.element as HTMLAnchorElement).target = this.options.target;
        }
      }
    }
  }

  private setupAccessibility(): void {
    // ARIA attributes
    this.element.setAttribute('aria-disabled', this.buttonState.isDisabled.toString());
    
    if (this.buttonState.isLoading) {
      this.element.setAttribute('aria-busy', 'true');
    }

    // Screen reader text for loading state
    if (!this.element.querySelector('.sr-only')) {
      const srText = document.createElement('span');
      srText.className = 'sr-only';
      srText.id = `${this.element.id || 'btn'}-sr-text`;
      this.element.appendChild(srText);
    }
  }

  private applyStyles(): void {
    // Base button classes
    this.addClass('btn');
    this.addClass(`btn-${this.options.variant}`);
    this.addClass(`btn-${this.options.size}`);

    if (this.buttonState.isDisabled) {
      this.addClass('btn-disabled');
    }

    if (this.buttonState.isLoading) {
      this.addClass('btn-loading');
    }
  }

  protected setupEventListeners(): void {
    super.setupEventListeners();

    // Click handler
    this.clickHandler = this.handleClick.bind(this);
    this.element.addEventListener('click', this.clickHandler);

    // Keyboard handler for non-button elements
    if (this.element.tagName !== 'BUTTON') {
      this.element.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    // Ripple effect
    if (this.options.ripple) {
      this.element.addEventListener('pointerdown', this.handleRipple.bind(this));
    }

    // Touch feedback
    this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.element.addEventListener('pointerleave', this.handlePointerUp.bind(this));
  }

  private handleClick(e: Event): void {
    // Prevent click if disabled or loading
    if (this.buttonState.isDisabled || this.buttonState.isLoading) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    this.emit('click', e);
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Handle Enter and Space for non-button elements
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.element.click();
    }
  }

  private handleRipple(e: PointerEvent): void {
    if (this.buttonState.isDisabled || this.buttonState.isLoading) {
      return;
    }

    const rect = this.element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 600ms ease-out;
      pointer-events: none;
    `;

    // Ensure relative positioning
    const position = getComputedStyle(this.element).position;
    if (position !== 'relative' && position !== 'absolute') {
      this.element.style.position = 'relative';
    }

    this.element.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.remove();
      }
    }, 600);
  }

  private handlePointerDown(): void {
    this.buttonState.isPressed = true;
    this.addClass('btn-pressed');
  }

  private handlePointerUp(): void {
    this.buttonState.isPressed = false;
    this.removeClass('btn-pressed');
  }

  private updateAppearance(): void {
    // Update icon
    if (this.options.icon) {
      this.updateIcon();
    }

    // Update loading spinner
    if (this.buttonState.isLoading) {
      this.showLoadingSpinner();
    } else {
      this.hideLoadingSpinner();
    }
  }

  private updateIcon(): void {
    let iconElement = this.element.querySelector('.btn-icon') as HTMLElement;
    
    if (this.options.icon && !iconElement) {
      iconElement = document.createElement('span');
      iconElement.className = 'btn-icon';
      
      if (this.options.iconPosition === 'left') {
        this.element.insertBefore(iconElement, this.element.firstChild);
      } else {
        this.element.appendChild(iconElement);
      }
    }

    if (iconElement && this.options.icon) {
      iconElement.textContent = this.options.icon;
      iconElement.setAttribute('aria-hidden', 'true');
    }
  }

  private showLoadingSpinner(): void {
    let spinner = this.element.querySelector('.btn-spinner') as HTMLElement;
    
    if (!spinner) {
      spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      spinner.innerHTML = `
        <svg class="btn-spinner-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="64" stroke-dashoffset="64">
            <animate attributeName="stroke-dasharray" dur="2s" values="0 64;64 64;64 64" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-64;-128" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;
      spinner.setAttribute('aria-hidden', 'true');
      this.element.insertBefore(spinner, this.element.firstChild);
    }

    // Update screen reader text
    const srText = this.element.querySelector('.sr-only');
    if (srText) {
      srText.textContent = 'Loading...';
    }
  }

  private hideLoadingSpinner(): void {
    const spinner = this.element.querySelector('.btn-spinner');
    if (spinner) {
      spinner.remove();
    }

    // Restore screen reader text
    const srText = this.element.querySelector('.sr-only');
    if (srText) {
      srText.textContent = '';
    }
  }

  private updateState(): void {
    // Update disabled state
    if (this.element.tagName === 'BUTTON') {
      (this.element as HTMLButtonElement).disabled = this.buttonState.isDisabled;
    }

    this.element.setAttribute('aria-disabled', this.buttonState.isDisabled.toString());

    if (this.buttonState.isLoading) {
      this.element.setAttribute('aria-busy', 'true');
    } else {
      this.element.removeAttribute('aria-busy');
    }

    // Update classes
    this.toggleClass('btn-disabled', this.buttonState.isDisabled);
    this.toggleClass('btn-loading', this.buttonState.isLoading);
  }

  // Public methods
  setLoading(loading: boolean): void {
    if (this.buttonState.isLoading === loading) {
      return;
    }

    this.buttonState.isLoading = loading;
    this.render();
    this.emit('loadingChanged', loading);
  }

  setDisabled(disabled: boolean): void {
    if (this.buttonState.isDisabled === disabled) {
      return;
    }

    this.buttonState.isDisabled = disabled;
    this.render();
    this.emit('disabledChanged', disabled);
  }

  setText(text: string): void {
    // Preserve non-text content (icons, spinners)
    const textNode = Array.from(this.element.childNodes).find(
      node => node.nodeType === Node.TEXT_NODE
    );

    if (textNode) {
      textNode.textContent = text;
    } else {
      this.element.appendChild(document.createTextNode(text));
    }

    this.emit('textChanged', text);
  }

  setVariant(variant: ButtonOptions['variant']): void {
    if (this.options.variant) {
      this.removeClass(`btn-${this.options.variant}`);
    }
    
    this.options.variant = variant;
    if (variant) {
      this.addClass(`btn-${variant}`);
    }
    
    this.emit('variantChanged', variant);
  }

  click(): void {
    if (!this.buttonState.isDisabled && !this.buttonState.isLoading) {
      this.element.click();
    }
  }

  focus(): void {
    this.element.focus();
  }

  blur(): void {
    this.element.blur();
  }

  protected removeEventListeners(): void {
    super.removeEventListeners();
    
    if (this.clickHandler) {
      this.element.removeEventListener('click', this.clickHandler);
    }
  }

  // Getters
  get isLoading(): boolean {
    return this.buttonState.isLoading;
  }

  get isDisabled(): boolean {
    return this.buttonState.isDisabled;
  }

  get text(): string {
    return this.element.textContent || '';
  }

  get variant(): string | undefined {
    return this.options.variant;
  }
}

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  .btn-spinner-icon {
    width: 1em;
    height: 1em;
    margin-right: 0.5em;
  }
`;
document.head.appendChild(style);

export default ButtonComponent;
export type { ButtonOptions, ButtonState };