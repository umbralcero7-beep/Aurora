'use client';

import { useState, useCallback, useEffect } from 'react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { generateTOTPSecret, verifyTOTP, generateTOTPUri, generateQRCodeDataUrl } from '@/lib/totp';

export interface TOTPUser {
  has2FA: boolean;
  secret?: string;
  backupCodes?: string[];
}

export function useTOTP(userEmail: string | null) {
  const db = useFirestore();
  const [totpUser, setTOTPUser] = useState<TOTPUser>({ has2FA: false });
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const loadTOTPStatus = useCallback(async () => {
    if (!db || !userEmail) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', userEmail.toLowerCase()));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setTOTPUser({
          has2FA: data.has2FA || false,
          secret: data.totpSecret || undefined,
          backupCodes: data.backupCodes || [],
        });
      }
    } catch (e) {
      console.error('Error loading TOTP status:', e);
    }
  }, [db, userEmail]);

  useEffect(() => {
    loadTOTPStatus();
  }, [loadTOTPStatus]);

  const setupTOTP = useCallback(async (): Promise<string | null> => {
    if (!db || !userEmail) return null;
    setLoading(true);
    try {
      const secret = generateTOTPSecret();
      const uri = generateTOTPUri(secret, userEmail.toLowerCase());
      
      const dataUrl = await generateQRCodeDataUrl(secret, userEmail.toLowerCase());
      setQrCodeUrl(dataUrl);
      
      await updateDoc(doc(db, 'users', userEmail.toLowerCase()), {
        totpSecret: secret,
        has2FA: false,
        totpPending: true,
      });
      
      setLoading(false);
      return dataUrl;
    } catch (e) {
      console.error('Error setting up TOTP:', e);
      setLoading(false);
      return null;
    }
  }, [db, userEmail]);

  const verifyAndEnableTOTP = useCallback(async (token: string): Promise<boolean> => {
    if (!db || !userEmail) return false;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userEmail.toLowerCase()));
      if (!userDoc.exists()) {
        setLoading(false);
        return false;
      }
      
      const data = userDoc.data();
      const secret = data.totpSecret;
      
      if (!secret || !verifyTOTP(secret, token)) {
        setLoading(false);
        return false;
      }
      
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      
      await updateDoc(doc(db, 'users', userEmail.toLowerCase()), {
        has2FA: true,
        totpPending: false,
        backupCodes: backupCodes,
      });
      
      setTOTPUser({ has2FA: true, secret, backupCodes });
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Error verifying TOTP:', e);
      setLoading(false);
      return false;
    }
  }, [db, userEmail]);

  const verifyTOTPCode = useCallback(async (token: string): Promise<boolean> => {
    if (!db || !userEmail) return false;
    try {
      const userDoc = await getDoc(doc(db, 'users', userEmail.toLowerCase()));
      if (!userDoc.exists()) return false;
      
      const data = userDoc.data();
      const secret = data.totpSecret;
      
      if (!secret) return false;
      
      const isValid = verifyTOTP(secret, token);
      
      if (!isValid && data.backupCodes) {
        const codeIndex = data.backupCodes.findIndex(
          (code: string) => code.toUpperCase() === token.toUpperCase()
        );
        
        if (codeIndex !== -1) {
          const newCodes = [...data.backupCodes];
          newCodes.splice(codeIndex, 1);
          await updateDoc(doc(db, 'users', userEmail.toLowerCase()), {
            backupCodes: newCodes,
          });
          return true;
        }
      }
      
      return isValid;
    } catch (e) {
      console.error('Error verifying TOTP code:', e);
      return false;
    }
  }, [db, userEmail]);

  const disableTOTP = useCallback(async (): Promise<boolean> => {
    if (!db || !userEmail) return false;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userEmail.toLowerCase()), {
        has2FA: false,
        totpSecret: null,
        backupCodes: null,
      });
      setTOTPUser({ has2FA: false });
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Error disabling TOTP:', e);
      setLoading(false);
      return false;
    }
  }, [db, userEmail]);

  return {
    totpUser,
    loading,
    qrCodeUrl,
    setupTOTP,
    verifyAndEnableTOTP,
    verifyTOTPCode,
    disableTOTP,
    refreshTOTPStatus: loadTOTPStatus,
  };
}