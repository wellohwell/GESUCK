import React from 'react';

export type ModalType = 'center' | 'fullscreen' | 'drawer' | 'bottom-sheet';

export interface ModalState {
  id: string;
  type: ModalType;
  title?: string;
  subtitle?: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  onClose?: () => void;
  isClosing?: boolean;
}

export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
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
      memoryState = [...memoryState, action.payload];
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
    modal.onClose();
  }
  dispatch({ type: 'CLOSE', payload: id });
};

export const closeAllModals = () => {
  memoryState.forEach((modal) => {
    if (modal.onClose) modal.onClose();
  });
  dispatch({ type: 'CLOSE_ALL' });
};

export const openModal = (
  options: Omit<ModalState, 'id' | 'type'> & { type?: ModalType; id?: string }
) => {
  const id = options.id || generateId();
  // We determine default type based on device screen maybe? 
  // No, let UI handle responsiveness based on 'center' or 'drawer'.
  dispatch({
    type: 'OPEN',
    payload: { type: 'center', ...options, id },
  });
  return id;
};

export const openDrawer = (options: Omit<ModalState, 'id' | 'type'> & { id?: string }) => {
  const id = options.id || generateId();
  dispatch({
    type: 'OPEN',
    payload: { ...options, type: 'drawer', id },
  });
  return id;
};

export const openConfirm = (options: ConfirmOptions) => {
  const id = generateId();
  dispatch({
    type: 'OPEN',
    payload: {
      id,
      type: 'center',
      title: options.title,
      // For confirm, we use a specific content structure which will be handled externally or internally.
      // But we can just pass standard UI since we store ReactNode. Let's build a special component for ConfirmContent.
      content: (
        <ConfirmDialogContent 
          options={options} 
          onClose={() => closeModal(id)} 
        />
      ),
      hideCloseButton: true, // We have cancel button
    },
  });
  return id;
};

// Internal Confirm component
function ConfirmDialogContent({ options, onClose }: { options: ConfirmOptions, onClose: () => void }) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await options.onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleCancel = () => {
    if (options.onCancel) options.onCancel();
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="text-sm text-muted-foreground">{options.description}</div>
      <div className="flex items-center justify-end gap-3 mt-4">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors disabled:opacity-50"
        >
          {options.cancelText || 'Batal'}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`flex items-center justify-center min-w-[80px] px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
            options.confirmVariant === 'danger'
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
          ) : (
            options.confirmText || 'Konfirmasi'
          )}
        </button>
      </div>
    </div>
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
