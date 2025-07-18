// Modal Component Base Class
// Provides common modal functionality for all popup components

import BaseComponent, { ComponentOptions } from './base-component.js';

interface ModalOptions extends ComponentOptions {
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  modal?: boolean;
  backdrop?: 'static' | 'true' | 'false';
  keyboard?: boolean;
  focus?: boolean;
  animation?: boolean;
}

interface ModalState {
  isOpen: boolean;
  isAnimating: boolean;
  zIndex: number;
}

abstract class ModalComponent extends BaseComponent {
  protected modalState: ModalState;
  protected options: ModalOptions;
  protected backdrop?: HTMLElement;
  private static openModals: ModalComponent[] = [];
  private static baseZIndex = 1050;

  constructor(options: ModalOptions = {}) {
    super(options);
    
    this.options = {
      closeOnBackdrop: true,
      closeOnEscape: true,
      modal: true,
      backdrop: 'true',
      keyboard: true,
      focus: true,
      animation: true,
      ...options
    };

    this.modalState = {
      isOpen: false,
      isAnimating: false,
      zIndex: ModalComponent.baseZIndex
    };

    this.createBackdrop();
  }

  protected onInit(): void {
    super.onInit();
    this.setupModalEventListeners();
    this.addClass('modal');
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-hidden', 'true');
  }

  private createBackdrop(): void {
    if (this.options.backdrop !== 'false') {
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'modal-backdrop';
      this.backdrop.style.display = 'none';
    }
  }

  private setupModalEventListeners(): void {
    // Escape key handling
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    }

    // Backdrop click handling
    if (this.options.closeOnBackdrop && this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close();
        }
      });
    }

    // Prevent modal content clicks from closing modal
    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.modalState.isOpen && this.isTopModal()) {
      this.close();
    }
  }

  private isTopModal(): boolean {
    const openModals = ModalComponent.openModals;
    return openModals.length > 0 && openModals[openModals.length - 1] === this;
  }

  async open(): Promise<void> {
    if (this.modalState.isOpen || this.modalState.isAnimating) {
      return;
    }

    this.modalState.isAnimating = true;
    this.emit('opening');

    // Add to open modals stack
    ModalComponent.openModals.push(this);
    this.modalState.zIndex = ModalComponent.baseZIndex + ModalComponent.openModals.length;

    // Show backdrop
    if (this.backdrop) {
      document.body.appendChild(this.backdrop);
      this.backdrop.style.display = 'block';
      this.backdrop.style.zIndex = (this.modalState.zIndex - 1).toString();
    }

    // Show modal
    this.element.style.display = 'block';
    this.element.style.zIndex = this.modalState.zIndex.toString();
    this.element.setAttribute('aria-hidden', 'false');

    // Add body class to prevent scrolling
    document.body.classList.add('modal-open');

    // Animation
    if (this.options.animation) {
      await this.animateOpen();
    }

    // Focus management
    if (this.options.focus) {
      this.setFocus();
    }

    this.modalState.isOpen = true;
    this.modalState.isAnimating = false;
    this.emit('opened');
  }

  async close(): Promise<void> {
    if (!this.modalState.isOpen || this.modalState.isAnimating) {
      return;
    }

    this.modalState.isAnimating = true;
    this.emit('closing');

    // Animation
    if (this.options.animation) {
      await this.animateClose();
    }

    // Hide modal
    this.element.style.display = 'none';
    this.element.setAttribute('aria-hidden', 'true');

    // Remove from open modals stack
    const index = ModalComponent.openModals.indexOf(this);
    if (index > -1) {
      ModalComponent.openModals.splice(index, 1);
    }

    // Hide backdrop if this was the last modal
    if (this.backdrop && ModalComponent.openModals.length === 0) {
      this.backdrop.remove();
      document.body.classList.remove('modal-open');
    }

    this.modalState.isOpen = false;
    this.modalState.isAnimating = false;
    this.emit('closed');
  }

  toggle(): Promise<void> {
    return this.modalState.isOpen ? this.close() : this.open();
  }

  private async animateOpen(): Promise<void> {
    // Default modal open animation
    this.element.style.opacity = '0';
    this.element.style.transform = 'scale(0.9) translateY(-50px)';

    await this.animate([
      { 
        opacity: 0, 
        transform: 'scale(0.9) translateY(-50px)' 
      },
      { 
        opacity: 1, 
        transform: 'scale(1) translateY(0)' 
      }
    ], { 
      duration: 300, 
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)' 
    });

    // Animate backdrop
    if (this.backdrop) {
      this.backdrop.style.opacity = '0';
      await this.backdrop.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], { 
        duration: 200,
        fill: 'forwards'
      }).finished;
    }
  }

  private async animateClose(): Promise<void> {
    // Animate backdrop first
    if (this.backdrop) {
      await this.backdrop.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], { 
        duration: 200 
      }).finished;
    }

    // Animate modal
    await this.animate([
      { 
        opacity: 1, 
        transform: 'scale(1) translateY(0)' 
      },
      { 
        opacity: 0, 
        transform: 'scale(0.9) translateY(-50px)' 
      }
    ], { 
      duration: 200, 
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)' 
    });
  }

  private setFocus(): void {
    // Try to focus on the first focusable element
    const focusableElements = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    } else {
      this.element.focus();
    }
  }

  protected removeEventListeners(): void {
    super.removeEventListeners();
    
    if (this.options.closeOnEscape) {
      document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    }
  }

  protected onDestroy(): void {
    super.onDestroy();
    
    // Close modal if open
    if (this.modalState.isOpen) {
      this.close();
    }

    // Remove backdrop
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.remove();
    }

    // Remove from open modals
    const index = ModalComponent.openModals.indexOf(this);
    if (index > -1) {
      ModalComponent.openModals.splice(index, 1);
    }
  }

  // Getters
  get isOpen(): boolean {
    return this.modalState.isOpen;
  }

  get isAnimating(): boolean {
    return this.modalState.isAnimating;
  }

  // Static methods
  static closeAll(): Promise<void[]> {
    const promises = [...ModalComponent.openModals].map(modal => modal.close());
    return Promise.all(promises);
  }

  static getOpenModals(): ModalComponent[] {
    return [...ModalComponent.openModals];
  }

  static isAnyModalOpen(): boolean {
    return ModalComponent.openModals.length > 0;
  }
}

export default ModalComponent;
export type { ModalOptions, ModalState };