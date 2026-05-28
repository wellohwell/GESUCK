import React from 'react';

export type ModalType = 'center' | 'fullscreen' | 'drawer' | 'bottom-sheet';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

export interface ModalState {
  id: string;
  title?: string;
  size?: ModalSize;
  content: React.ReactNode;
  footer?: React.ReactNode;
  persistent?: boolean;
  onClose?: () => void;
  // Backward compatibility fields
  type?: ModalType;
  subtitle?: string;
  hideCloseButton?: boolean;
  className?: string;
}

export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  size?: ModalSize;
  persistent?: boolean;
}

type ModalAction =
  | { type: 'OPEN'; payload: ModalState }
  | { type: 'CLOSE'; payload: string }
  | { type: 'CLOSE_ALL' };

let memoryState: ModalState[] = [];
let listeners: Array<(state: ModalState[]) => void> = [];

function dispatch(action: ModalAction) {
  switch (action.type) {
    case 'OPEN':
      if (memoryState.some(m => m.id === action.payload.id)) {
        memoryState = memoryState.map(m => m.id === action.payload.id ? action.payload : m);
      } else {
        memoryState = [...memoryState, action.payload];
      }
      break;
    case 'CLOSE':
      memoryState = memoryState.filter((m) => m.id !== action.payload);
      break;
    case 'CLOSE_ALL':
      memoryState = [];
      break;
  }
  listeners.forEach((listener) => listener(memoryState));
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const closeModal = (id: string) => {
  const modal = memoryState.find((m) => m.id === id);
  if (modal?.onClose) {
    try {
      modal.onClose();
    } catch (e) {
      console.error(e);
    }
  }
  dispatch({ type: 'CLOSE', payload: id });
};

export const closeAllModals = () => {
  memoryState.forEach((modal) => {
    if (modal.onClose) {
      try {
        modal.onClose();
      } catch (e) {
        console.error(e);
      }
    }
  });
  dispatch({ type: 'CLOSE_ALL' });
};

export const openModal = (
  options: Omit<ModalState, 'id'> & { id?: string }
) => {
  const id = options.id || generateId();
  const modal: ModalState = {
    ...options,
    id,
    size: options.size || 'md'
  };
  dispatch({
    type: 'OPEN',
    payload: modal,
  });
  return id;
};

// For backward compatibility
export const openDrawer = (
  options: Omit<ModalState, 'id'> & { id?: string }
) => {
  return openModal({
    ...options,
    size: options.size || 'lg'
  });
};

export const openConfirm = (options: ConfirmOptions) => {
  const id = generateId();
  
  // Create confirm dialog content using React.createElement directly inside the .ts file
  const content = React.createElement(ConfirmDialogContent, {
    options,
    onClose: () => closeModal(id)
  });

  dispatch({
    type: 'OPEN',
    payload: {
      id,
      title: options.title,
      size: options.size || 'sm',
      content,
      persistent: options.persistent ?? true,
      hideCloseButton: true
    },
  });
  return id;
};

// React component for Confirm Content using standard API
function ConfirmDialogContent({ options, onClose }: { options: ConfirmOptions; onClose: () => void }) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await options.onConfirm();
    } catch (error) {
      console.error("Confirmation handler failed:", error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleCancel = () => {
    if (options.onCancel) {
      try {
        options.onCancel();
      } catch (e) {
        console.error(e);
      }
    }
    onClose();
  };

  return React.createElement(
    'div',
    { className: 'flex flex-col gap-4 pt-1' },
    React.createElement('div', { className: 'text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed' }, options.description),
    React.createElement(
      'div',
      { className: 'flex items-center justify-end gap-3 mt-4' },
      React.createElement(
        'button',
        {
          onClick: handleCancel,
          disabled: loading,
          className: 'px-4 py-2 text-sm font-semibold text-foreground bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-805 rounded-[1.25rem] transition-all disabled:opacity-50 active:scale-95'
        },
        options.cancelText || 'Batal'
      ),
      React.createElement(
        'button',
        {
          onClick: handleConfirm,
          disabled: loading,
          className: `flex items-center justify-center min-w-[90px] px-4 py-2 text-sm font-semibold rounded-[1.25rem] transition-all disabled:opacity-50 active:scale-95 ${
            options.confirmVariant === 'danger'
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`
        },
        loading
          ? React.createElement('span', { className: 'w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full' })
          : options.confirmText || 'Konfirmasi'
      )
    )
  );
}

export function useModal() {
  return {
    openModal,
    openDrawer,
    openConfirm,
    closeModal,
    closeAllModals,
    subscribe: (listener: (state: ModalState[]) => void) => {
      listeners.push(listener);
      listener(memoryState);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
  };
}
