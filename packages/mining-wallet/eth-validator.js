'use strict';
/**
 * eth-validator.js
 * ================
 * Ethereum address validation.
 * Supports:
 *   - Basic format:  0x + 40 hex chars
 *   - EIP-55 checksum validation (keccak256-based)
 *
 * Dependencies: keccak (npm install keccak)
 * Fallback:     if keccak unavailable, format-only validation
 */

let keccak;
try { keccak = require('keccak'); } catch (_) { keccak = null; }

/**
 * Returns true if address matches 0x + 40 hex chars.
 */
function isValidETHFormat(address) {
  if (typeof address !== 'string') return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

/**
 * Validates EIP-55 mixed-case checksum.
 * Returns true if checksum is valid OR if address is all-lower / all-upper
 * (non-checksummed addresses are accepted as valid).
 */
function isValidETHChecksum(address) {
  if (!isValidETHFormat(address)) return false;
  if (!keccak) return true; // can't verify without keccak — accept format-only
  const addr = address.trim();
  const hex  = addr.slice(2).toLowerCase();
  const hash = keccak('keccak256').update(hex).digest('hex');

  // If all-lower or all-upper → non-checksummed, accept
  if (addr.slice(2) === hex || addr.slice(2) === hex.toUpperCase()) return true;

  for (let i = 0; i < 40; i++) {
    const c = hex[i];
    if (c >= '0' && c <= '9') continue;
    const expectedUpper = parseInt(hash[i], 16) >= 8;
    if (expectedUpper  && addr[i + 2] !== c.toUpperCase()) return false;
    if (!expectedUpper && addr[i + 2] !== c.toLowerCase()) return false;
  }
  return true;
}

/**
 * Full validation — returns { valid, checksummed, address, error }
 */
function validateETHAddress(address) {
  if (!isValidETHFormat(address)) {
    return {
      valid: false,
      error: 'Invalid ETH address: must be 0x followed by 40 hex characters.'
    };
  }
  const checksummed = isValidETHChecksum(address);
  if (!checksummed) {
    return {
      valid: false,
      error: 'Invalid EIP-55 checksum. Verify your address or use all-lowercase.'
    };
  }
  return { valid: true, checksummed: true, address: address.trim() };
}

module.exports = { isValidETHFormat, isValidETHChecksum, validateETHAddress };
