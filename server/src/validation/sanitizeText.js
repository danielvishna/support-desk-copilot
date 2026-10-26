/**
 * @fileoverview Strips Unicode characters that don't change what text
 * means but can change how it displays - found during adversarial testing
 * (a ticket with a right-to-left override character visually reordered
 * part of its own subject line). Duplicated in client/src/lib/sanitizeText.js
 * since there's no shared package between client and server for two call
 * sites; keep both in sync if this changes.
 */

/**
 * Bidi override/isolate controls (can reorder surrounding text visually -
 * the classic filename-spoofing trick), zero-width space (invisible
 * character stuffing), and BOM/zero-width-no-break-space mid-string.
 * Deliberately NOT stripping zero-width joiner/non-joiner (U+200C/200D) -
 * those are legitimate in Persian/Indic script rendering and emoji
 * sequences, just the characters with no legitimate use in a ticket field.
 * @const {RegExp}
 */
const SUSPICIOUS_CHARS = /[‪-‮⁦-⁩​﻿]/g

/**
 * C0 control characters other than tab/newline/carriage return.
 * @const {RegExp}
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/**
 * @param {string} text
 * @return {string}
 */
export function sanitizeText(text) {
  return text.replace(SUSPICIOUS_CHARS, '').replace(CONTROL_CHARS, '')
}
