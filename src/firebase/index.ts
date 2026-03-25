
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentMultipleTabManager,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

let firestoreInitialized = false;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);

  // Usar la nueva API de cache (reemplaza enableMultiTabIndexedDbPersistence)
  // Solo inicializamos Firestore con la nueva API una vez para evitar errores de re-inicialización
  let firestore;
  if (!firestoreInitialized && typeof window !== 'undefined') {
    try {
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
          tabManager: persistentMultipleTabManager()
        })
      });
      firestoreInitialized = true;
    } catch {
      // Si ya fue inicializado (recarga de módulo), obtener la instancia existente
      firestore = getFirestore(firebaseApp);
    }
  } else {
    firestore = getFirestore(firebaseApp);
  }

  return { firebaseApp, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
