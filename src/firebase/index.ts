'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore,
  memoryLocalCache
} from 'firebase/firestore';

// Singleton para mantener las instancias y evitar re-inicializaciones costosas
let sdkInstance: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

export function initializeFirebase() {
  // Patrón singleton para evitar múltiples inicializaciones en entornos SSR/HMR
  if (sdkInstance) return sdkInstance;

  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      firebaseApp = getApp();
    }
  } else {
    firebaseApp = getApp();
  }

  const isBrowser = typeof window !== 'undefined';
  let firestore: Firestore;

  if (isBrowser) {
    try {
      // Configuración de persistencia exclusiva para el navegador (Modo Offline)
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      // Fallback si ya está inicializado o falla el acceso a IndexedDB
      firestore = getFirestore(firebaseApp);
    }
  } else {
    // Configuración para el servidor (SSR): Solo memoria para evitar errores de hidratación
    try {
      firestore = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache(),
      });
    } catch (e) {
      firestore = getFirestore(firebaseApp);
    }
  }

  sdkInstance = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };

  return sdkInstance;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
