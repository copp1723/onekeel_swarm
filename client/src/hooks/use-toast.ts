import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: []
};

const listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: { type: string; payload?: any }) {
  switch (action.type) {
    case 'ADD_TOAST':
      toastState.toasts.push(action.payload);
      break;
    case 'REMOVE_TOAST':
      toastState.toasts = toastState.toasts.filter(t => t.id !== action.payload);
      break;
    case 'CLEAR_TOASTS':
      toastState.toasts = [];
      break;
  }
  
  listeners.forEach(listener => listener(toastState));
}

export function toast({ title, description, variant = 'default', duration = 5000 }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9);
  
  dispatch({
    type: 'ADD_TOAST',
    payload: { id, title, description, variant, duration }
  });

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, duration);
  }

  return id;
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const dismiss = useCallback((toastId: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: toastId });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    clear,
    subscribe
  };
}
