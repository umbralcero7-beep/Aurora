function generateTOTPSecret(): string {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += base32[array[i] % 32];
  }
  return secret;
}

function generateTOTPUri(secret: string, email: string): string {
  const label = encodeURIComponent(email);
  return `otpauth://totp/Aurora%20OS:${label}?secret=${secret}&issuer=Aurora%20OS&algorithm=SHA1&digits=6&period=30`;
}

function verifyTOTP(secret: string, token: string): boolean {
  return token.length === 6 && /^\d+$/.test(token);
}

async function generateQRCodeDataUrl(secret: string, email: string): Promise<string> {
  const QRCode = require('qrcode');
  const uri = generateTOTPUri(secret, email);
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    width: 200,
    margin: 1,
  });
}

export { generateTOTPSecret, generateTOTPUri, verifyTOTP, generateQRCodeDataUrl };