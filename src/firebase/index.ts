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
  const isBrowser = typeof window !== 'undefined';
  
  // 1. Patrn singleton para evitar mltiples inicializaciones
  if (sdkInstance) return sdkInstance;

  // 2. Inicializar App
  let firebaseApp: FirebaseApp;
  const apps = getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
  } else {
    firebaseApp = initializeApp(firebaseConfig);
  }

  // 3. Inicializar Firestore con Persistencia Robusta y Failover
  let firestore: Firestore;
  
  try {
    // Intentamos recuperar instancia existente o inicializar con persistencia
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    // Si falla la recuperacin (no inicializado), intentamos inicializacin controlada
    const cache = isBrowser 
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache();

    try {
      firestore = initializeFirestore(firebaseApp, {
        localCache: cache,
      });
    } catch (innerError) {
      // FAILOVER CRTICO: Si la persistencia est corrupta (Assertion Failed), 
      // forzamos el modo memoria para que la app no muera.
      console.warn("Fallo persistencia Firestore, activando Failover de Memoria:", innerError);
      firestore = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache(),
      });
    }
  }

  // 4. Configurar Instancia Global
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
