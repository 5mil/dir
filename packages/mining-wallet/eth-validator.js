'use strict';
/**
 * eth-validator.js
 * ================
 * Ethereum address validation.
 *   - Format:  0x + 40 hex chars
 *   - EIP-55 checksum (keccak256-based, optional — graceful fallback)
 *
 * dep: keccak (npm install keccak)
 */

let keccak;
try { keccak = require('keccak'); } catch (_) { keccak = null; }

function isValidETHFormat(address) {
  if (typeof address !== 'string') return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

function isValidETHChecksum(address) {
  if (!isValidETHFormat(address)) return false;
  if (!keccak) return true;
  const addr = address.trim();
  const hex  = addr.slice(2).toLowerCase();
  // all-lower or all-upper = non-checksummed, accept
  if (addr.slice(2) === hex || addr.slice(2) === hex.toUpperCase()) return true;
  const hash = keccak('keccak256').update(hex).digest('hex');
  for (let i = 0; i < 40; i++) {
    const c = hex[i];
    if (c >= '0' && c <= '9') continue;
    const upper = parseInt(hash[i], 16) >= 8;
    if (upper  && addr[i + 2] !== c.toUpperCase()) return false;
    if (!upper && addr[i + 2] !== c.toLowerCase()) return false;
  }
  return true;
}

function validateETHAddress(address) {
  if (!isValidETHFormat(address))
    return { valid: false, error: 'Invalid ETH address: must be 0x + 40 hex characters.' };
  if (!isValidETHChecksum(address))
    return { valid: false, error: 'Invalid EIP-55 checksum. Use lowercase or correctly checksummed address.' };
  return { valid: true, checksummed: true, address: address.trim() };
}

module.exports = { isValidETHFormat, isValidETHChecksum, validateETHAddress };
