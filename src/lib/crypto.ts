import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const FALLBACK_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function getVaultKey(): Buffer {
  const keyHex = process.env.CUST0DY_VAULT_KEY || FALLBACK_KEY_HEX;
  if (/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    return Buffer.from(keyHex, "hex");
  }
  return crypto.createHash("sha256").update(keyHex).digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  fingerprint: string;
}

/**
 * Encrypts sensitive transfer credentials (EPP Auth Codes, Swap Keys) using AES-256-GCM.
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  const fingerprint = crypto
    .createHash("sha256")
    .update(encrypted)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag,
    fingerprint,
  };
}

/**
 * Decrypts AES-256-GCM encrypted vault credentials only during authorized settlement release.
 */
export function decryptSecret(
  ciphertext: string,
  ivHex: string,
  authTagHex: string
): string {
  const key = getVaultKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Generates a unique cryptographic DNS TXT challenge string: cust0dy-verify=c0_<8hex>
 */
export function generateDnsVerificationCode(): string {
  const token = crypto.randomBytes(4).toString("hex");
  return `cust0dy-verify=c0_${token}`;
}

/**
 * Generates a unique social bio verification code: C0-<4digits>
 */
export function generateBioVerificationCode(): string {
  const num = crypto.randomInt(1000, 9999);
  return `C0-${num}`;
}

/**
 * Generates a clean-room burner email for social handle custody handover.
 */
export function generateBurnerVaultEmail(): string {
  const num = crypto.randomInt(1000, 9999);
  return `escrow-${num}@vault.cust0dy.io`;
}

/**
 * Generates a trade identifier: C0-ESC-<4digits>
 */
export function generateTradeCode(): string {
  const num = crypto.randomInt(1000, 9999);
  return `C0-ESC-${num}`;
}
