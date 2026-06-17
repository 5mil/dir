/**
 * DGB Integrated Wallet Manager
 * ==============================
 * Generates and manages a BIP39/BIP44 DigiByte HD wallet.
 * Stores encrypted keypair in /etc/dir/mining-wallet.enc
 *
 * DGB BIP44 path: m/44'/20'/0'/0/0
 * (coin type 20 = DigiByte)
 */

const bip39  = require('bip39');
const HDKey  = require('hdkey');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');

const WALLET_PATH = process.env.DGB_WALLET_PATH || '/etc/dir/mining-wallet.enc';
const DGB_COIN_TYPE = 20;
const DGB_DERIVATION = `m/44'/${DGB_COIN_TYPE}'/0'/0/0`;
const DIGIEXPLORER_API = 'https://digiexplorer.info/api';

function encrypt(text, pin) {
  const salt = crypto.randomBytes(16);
  const key  = crypto.scryptSync(pin, salt, 32);
  const iv   = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv:   iv.toString('hex'),
    tag:  tag.toString('hex'),
    data: enc.toString('hex')
  });
}

function decrypt(blob, pin) {
  const { salt, iv, tag, data } = JSON.parse(blob);
  const key = crypto.scryptSync(pin, Buffer.from(salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return decipher.update(Buffer.from(data, 'hex')) + decipher.final('utf8');
}

function pubkeyToDGBAddress(pubkeyBuffer) {
  const sha256 = crypto.createHash('sha256').update(pubkeyBuffer).digest();
  const ripe   = crypto.createHash('ripemd160').update(sha256).digest();
  const versioned = Buffer.concat([Buffer.from([0x1E]), ripe]);
  const cs1 = crypto.createHash('sha256').update(versioned).digest();
  const cs2 = crypto.createHash('sha256').update(cs1).digest();
  const full = Buffer.concat([versioned, cs2.slice(0, 4)]);
  return base58Encode(full);
}

const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(buf) {
  let n = BigInt('0x' + buf.toString('hex'));
  let result = '';
  while (n > 0n) {
    result = BASE58_CHARS[Number(n % 58n)] + result;
    n = n / 58n;
  }
  for (const byte of buf) {
    if (byte !== 0) break;
    result = '1' + result;
  }
  return result;
}

function createWallet(pin) {
  const mnemonic = bip39.generateMnemonic(256);
  const seed     = bip39.mnemonicToSeedSync(mnemonic);
  const root     = HDKey.fromMasterSeed(seed);
  const child    = root.derive(DGB_DERIVATION);
  const address  = pubkeyToDGBAddress(child.publicKey);

  const payload  = JSON.stringify({
    mnemonic,
    privateKey: child.privateKey.toString('hex'),
    publicKey:  child.publicKey.toString('hex'),
    address,
    derivation: DGB_DERIVATION,
    created:    new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(WALLET_PATH), { recursive: true });
  fs.writeFileSync(WALLET_PATH, encrypt(payload, pin), { mode: 0o600 });
  savePublicAddress(address);

  return { address, mnemonic };
}

function loadWallet(pin) {
  if (!fs.existsSync(WALLET_PATH)) throw new Error('No wallet found. Run createWallet() first.');
  const blob = fs.readFileSync(WALLET_PATH, 'utf8');
  return JSON.parse(decrypt(blob, pin));
}

function unlockWallet(pin) {
  const wallet = loadWallet(pin);
  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKeyMasked: `${wallet.privateKey.slice(0, 6)}••••••••${wallet.privateKey.slice(-6)}`,
    derivation: wallet.derivation,
    created: wallet.created,
    unlocked: true,
  };
}

function exportSensitiveWallet(pin) {
  const wallet = loadWallet(pin);
  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic,
    derivation: wallet.derivation,
    created: wallet.created,
  };
}

function getAddress() {
  if (!fs.existsSync(WALLET_PATH)) return null;
  try {
    const addrFile = WALLET_PATH + '.addr';
    if (fs.existsSync(addrFile)) return fs.readFileSync(addrFile, 'utf8').trim();
    return null;
  } catch { return null; }
}

function savePublicAddress(address) {
  fs.writeFileSync(WALLET_PATH + '.addr', address, { mode: 0o644 });
}

async function getBalance(address) {
  return new Promise((resolve, reject) => {
    https.get(`${DIGIEXPLORER_API}/addr/${address}/balance`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(parseFloat(data) / 1e8));
    }).on('error', reject);
  });
}

module.exports = {
  createWallet,
  loadWallet,
  unlockWallet,
  exportSensitiveWallet,
  getAddress,
  savePublicAddress,
  getBalance,
};
