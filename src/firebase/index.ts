
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore'

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

    const sdks = getSdks(firebaseApp);

    // Habilitamos persistencia local con fallback para máxima compatibilidad
    // NOTA: El error 'permission-denied' en collection_stream es esperado y se ignora
    // silenciosamente — ocurre antes de que el usuario se autentique.
    if (typeof window !== "undefined") {
      enableMultiTabIndexedDbPersistence(sdks.firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore: Persistencia fallida (múltiples pestañas)");
        } else if (err.code === 'unimplemented') {
          // Fallback a persistencia simple si multi-pestaña no es soportada
          enableIndexedDbPersistence(sdks.firestore).catch((e) => {
            if (e.code !== 'permission-denied') {
              console.error("Firestore: Fallo total de persistencia", e.code);
            }
          });
        } else if (err.code === 'permission-denied') {
          // Silencioso: el SDK intenta acceder antes de que el usuario se autentique.
          // Este error es esperado y la app funcionará correctamente tras el login.
        } else {
          console.warn("Firestore: Error de persistencia", err.code);
        }
      });
    }

    return sdks;
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
