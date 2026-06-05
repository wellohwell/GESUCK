export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type ToastAction = 
  | { type: 'ADD_TOAST'; toast: ToastProps }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToastProps> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId: string }
  | { type: 'REMOVE_TOAST'; toastId: string };

let memoryState: ToastProps[] = [];
let listeners: Array<(state: ToastProps[]) => void> = [];

const TOAST_LIMIT = 3;

function dispatch(action: ToastAction) {
  switch (action.type) {
    case 'ADD_TOAST': {
      const filtered = memoryState.filter((t) => t.id !== action.toast.id);
      memoryState = [action.toast, ...filtered].slice(0, TOAST_LIMIT);
      break;
    }
    case 'UPDATE_TOAST':
      memoryState = memoryState.map((t) =>
        t.id === action.toast.id ? { ...t, ...action.toast } : t
      );
      break;
    case 'DISMISS_TOAST':
    case 'REMOVE_TOAST':
      memoryState = memoryState.filter((t) => t.id !== action.toastId);
      break;
  }
  listeners.forEach((listener) => listener(memoryState));
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

type ToastOptions = Omit<ToastProps, 'id' | 'type' | 'title'> & { id?: string };

function createToast(type: ToastType, title: string, options?: ToastOptions) {
  const id = options?.id || generateId();
  dispatch({
    type: 'ADD_TOAST',
    toast: { id, title, type, ...options },
  });
  return id;
}

export const toast = Object.assign(
  (title: string, options?: ToastOptions) => createToast('info', title, options),
  {
    success: (title: string, options?: ToastOptions) => createToast('success', title, options),
    error: (title: string, options?: ToastOptions) => createToast('error', title, options),
    warning: (title: string, options?: ToastOptions) => createToast('warning', title, options),
    info: (title: string, options?: ToastOptions) => createToast('info', title, options),
    loading: (title: string, options?: ToastOptions) => createToast('loading', title, options),
    dismiss: (toastId: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    update: (id: string, props: Partial<ToastProps> & { render?: string }) => dispatch({ 
      type: 'UPDATE_TOAST', 
      toast: { id, ...props, ...(props.render ? { title: props.render } : {}) } 
    }),
  }
);

export function useToast() {
  return {
    toast,
    dismiss: toast.dismiss,
    subscribe: (listener: (state: ToastProps[]) => void) => {
      listeners.push(listener);
      listener(memoryState);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
  };
}
