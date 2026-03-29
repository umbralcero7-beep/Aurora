'use client';
import { getAuth, type User } from 'firebase/auth';
import { getApps } from 'firebase/app';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

interface FirebaseAuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}

interface FirebaseAuthObject {
  uid: string;
  token: FirebaseAuthToken;
}

interface SecurityRuleRequest {
  auth: FirebaseAuthObject | null;
  method: string;
  path: string;
  resource?: {
    data: any;
  };
}

/**
 * Builds a security-rule-compliant auth object from the Firebase User.
 */
function buildAuthObject(currentUser: User | null): FirebaseAuthObject | null {
  if (!currentUser) return null;

  const token: FirebaseAuthToken = {
    name: currentUser.displayName,
    email: currentUser.email,
    email_verified: currentUser.emailVerified,
    phone_number: currentUser.phoneNumber,
    sub: currentUser.uid,
    firebase: {
      identities: currentUser.providerData.reduce((acc, p) => {
        if (p.providerId) {
          acc[p.providerId] = [p.uid];
        }
        return acc;
      }, {} as Record<string, string[]>),
      sign_in_provider: currentUser.providerData[0]?.providerId || 'custom',
      tenant: currentUser.tenantId,
    },
  };

  return { uid: currentUser.uid, token: token };
}

/**
 * Builds the complete, simulated request object for the error message.
 * Safe for SSR and pre-initialization environments.
 */
function buildRequestObject(context: SecurityRuleContext): SecurityRuleRequest {
  let authObject: FirebaseAuthObject | null = null;
  
  // Solo intentamos obtener auth si Firebase ha sido inicializado y estamos en el cliente
  if (typeof window !== 'undefined' && getApps().length > 0) {
    try {
      const firebaseAuth = getAuth();
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        authObject = buildAuthObject(currentUser);
      }
    } catch (e) {
      // Silencio absoluto si auth no está listo
    }
  }

  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}

function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(requestObject, null, 2)}`;
}

/**
 * A custom error class designed to be consumed by an LLM for debugging.
 */
export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    super(buildErrorMessage(requestObject));
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
}

export class FirestoreOfflineError extends Error {
  public readonly path: string;
  public readonly operation: string;

  constructor(context: SecurityRuleContext) {
    super(`FirestoreError: Operation "${context.operation}" on "${context.path}" failed because the device is offline. The operation will be retried when connectivity is restored.`);
    this.name = 'FirestoreOfflineError';
    this.path = context.path;
    this.operation = context.operation;
  }
}

export function isOfflineError(err: any): boolean {
  if (!err) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const code = err.code || '';
  return code === 'unavailable' || code === 'failed-precondition' || code === 'deadline-exceeded';
}
