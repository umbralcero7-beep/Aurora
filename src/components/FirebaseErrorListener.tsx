'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, FirestoreOfflineError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

/**
 * Listens for globally emitted Firestore error events and shows toasts to the user.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      logger.warn('Firestore Permission Error', 'ErrorListener', error.message);
      toast({
        variant: "destructive",
        title: "Sin Permisos",
        description: "No tienes permisos para esta operación. Contacta al administrador.",
      });
    };

    const handleOfflineError = (error: FirestoreOfflineError) => {
      logger.info('Firestore Offline Error', 'ErrorListener', error.message);
      toast({
        variant: "destructive",
        title: "Sin Conexión",
        description: "Los datos se guardarán localmente y se sincronizarán al reconectarse.",
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    errorEmitter.on('offline-error', handleOfflineError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
      errorEmitter.off('offline-error', handleOfflineError);
    };
  }, [toast]);

  return null;
}
