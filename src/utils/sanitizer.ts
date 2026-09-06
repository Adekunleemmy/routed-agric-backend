/**
 * Anti-Circumvention & Escrow Security Engine
 * Sanitizes phone numbers (+234, 080, 070, 090, etc.) and email addresses to protect
 * buyers and farmers within RUUTED Escrow guarantee.
 */

export const PHONE_PATTERN = /(\+?234|0)[789][01]\d{1}[\s.-]?\d{3}[\s.-]?\d{4}|(\+?234|0)[789][01]\d{8}/gi;
export const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

export const PHONE_MASK_TEXT = '[📞 Phone Number Hidden — Transact on RUUTED for Quality Guarantee]';
export const EMAIL_MASK_TEXT = '[✉️ Email Hidden — Keep communication on RUUTED]';

export interface SanitizationResult {
  sanitizedText: string;
  isMasked: boolean;
  phoneDetected: boolean;
  emailDetected: boolean;
}

export function sanitizeMessageContent(rawText: string): SanitizationResult {
  if (!rawText) {
    return {
      sanitizedText: '',
      isMasked: false,
      phoneDetected: false,
      emailDetected: false
    };
  }

  let phoneDetected = false;
  let emailDetected = false;
  let cleanedText = rawText;

  if (PHONE_PATTERN.test(cleanedText)) {
    phoneDetected = true;
    cleanedText = cleanedText.replace(PHONE_PATTERN, PHONE_MASK_TEXT);
  }

  // Reset regex state if global
  EMAIL_PATTERN.lastIndex = 0;
  if (EMAIL_PATTERN.test(cleanedText)) {
    emailDetected = true;
    cleanedText = cleanedText.replace(EMAIL_PATTERN, EMAIL_MASK_TEXT);
  }

  const isMasked = phoneDetected || emailDetected;

  return {
    sanitizedText: cleanedText,
    isMasked,
    phoneDetected,
    emailDetected
  };
}
