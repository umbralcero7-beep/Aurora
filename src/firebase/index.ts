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
  memoryLocalCache,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

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

  const auth = getAuth(firebaseApp);

  // 4. Conectar a Emuladores en localhost
  if (isBrowser && window.location.hostname === 'localhost') {
    console.log("Activando modo Localhost: Conectando a emuladores Firebase...");
    try {
      // Intentamos conectar a emuladores. Si fallan, la app usar los servicios reales (cloud)
      // o entrar en modo offline automticamente por el failover de Firestore configurado arriba.
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
      console.log("Conexin a emuladores establecida.");
    } catch (e) {
      console.warn("Emuladores no detectados. Operando en modo Cloud/Offline:", e);
    }
  }

  // 5. Configurar Instancia Global
  sdkInstance = {
    firebaseApp,
    auth,
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
