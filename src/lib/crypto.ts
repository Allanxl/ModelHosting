import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.MASTER_ENCRYPTION_KEY;
  if (!key) throw new Error("MASTER_ENCRYPTION_KEY is not set");
  if (key.length !== 64) throw new Error("MASTER_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)");
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a plaintext API key using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encryptApiKey(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypt an encrypted API key string produced by encryptApiKey.
 */
export function decryptApiKey(encryptedString: string): string {
  const key = getMasterKey();
  const [ivHex, authTagHex, ciphertextHex] = encryptedString.split(":");

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted API key format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
