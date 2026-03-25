"use client"

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isMemoized } from '../provider';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined,
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = [];
        snapshot.docs.forEach((doc) => {
          results.push({ ...(doc.data() as T), id: doc.id });
        });
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Manejo silencioso y seguro de errores para evitar "Application error"
        console.warn("Firestore Sync Status:", err.code);
        
        // Creamos un error contextual seguro sin acceder a propiedades privadas
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: 'collection_stream',
        });

        setError(contextualError);
        setData([]); // Evitamos null para no romper mapeos de UI
        setIsLoading(false);
        
        // Solo emitimos error global si es crítico para el flujo
        if (err.code === 'permission-denied') {
          // No emitimos throw para no romper la UI en Next.js
          errorEmitter.emit('permission-error', contextualError);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  if (memoizedTargetRefOrQuery && !isMemoized(memoizedTargetRefOrQuery)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Firestore reference or query was not properly memoized using useMemoFirebase');
    }
  }

  return { data, isLoading, error };
}
