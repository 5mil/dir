#!/usr/bin/env python3
"""
DGB Skein Stratum Stack
DigiByte Skein algorithm mining client over Stratum protocol.

Algorithm: Skein-512 (DigiByte algo #3, alternating algorithm)
Protocol:  Stratum V1 (same as Fennac/Bitcoin Stratum)
Network:   Stratum pool via TCP (optionally via stunnel TLS)

PoW construction:
  Skein-512 hash of 80-byte block header:
    version (4) + prevhash (32) + merkle_root (32) +
    ntime (4) + nbits (4) + nonce (4)

Pool flow:
  mining.subscribe  -> session/extranonce
  mining.authorize  -> wallet address + 'x'
  mining.notify     -> job params (prevhash, coinb1/2, merkle, ntime, nbits)
  mining.submit     -> nonce solution
"""

import socket
import json
import time
import logging
import struct
import hashlib
import os
from threading import Thread, Event

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [DGB-SKEIN] %(levelname)s %(message)s'
)
log = logging.getLogger('dgb-skein')

DEFAULT_HOST   = '127.0.0.1'
DEFAULT_PORT   = 3369          # DGB Skein stratum default
RECONNECT_BASE = 5
RECONNECT_MAX  = 120


# ------------------------------------------------------------------ #
#  Skein-512 PoW (pure Python fallback; use C ext for performance)
# ------------------------------------------------------------------ #

def _skein512(data: bytes) -> bytes:
    """
    Skein-512 via pyskein or hashlib (if available).
    Falls back to SHA-512 stub for environments without pyskein.
    Install: pip install pyskein
    """
    try:
        import skein
        return skein.hash(data, digest_bits=512).digest()
    except ImportError:
        log.warning('pyskein not installed — using SHA-512 stub (not real PoW)')
        return hashlib.sha512(data).digest()


def skein_hash(header: bytes) -> bytes:
    """Single-pass Skein-512 of 80-byte block header."""
    return _skein512(header)


def build_header(prevhash: str, coinbase: str, merkle_branches: list,
                 version: int, nbits: str, ntime: str, nonce: int) -> bytes:
    """
    Construct 80-byte DGB block header for hashing.
    """
    # Simplified coinbase + merkle construction
    merkle = bytes.fromhex(coinbase)
    for branch in merkle_branches:
        merkle = hashlib.sha256(hashlib.sha256(merkle + bytes.fromhex(branch)).digest()).digest()

    header = struct.pack('<I', version)
    header += bytes.fromhex(prevhash)[::-1]
    header += merkle[:32]
    header += bytes.fromhex(ntime)[::-1]
    header += bytes.fromhex(nbits)[::-1]
    header += struct.pack('<I', nonce)
    return header


# ------------------------------------------------------------------ #
#  Stratum client
# ------------------------------------------------------------------ #

class DGBSkeinClient:

    def __init__(self, host=DEFAULT_HOST, port=DEFAULT_PORT,
                 config_path='/etc/dgb-skein/config.json'):
        self.host    = host
        self.port    = port
        self.sock    = None
        self.job     = None
        self._stop   = Event()
        self._req_id = 0
        self._load_config(config_path)

    def _load_config(self, path):
        try:
            with open(path) as f:
                cfg = json.load(f)
            self.wallet  = cfg['wallet_address']
            self.threads = cfg.get('threads', os.cpu_count() or 4)
            self.pool_url = cfg.get('pool_url', f'{self.host}:{self.port}')
            log.info(f'Config: wallet={self.wallet[:12]}... threads={self.threads}')
        except FileNotFoundError:
            log.warning(f'Config not found at {path}')
            self.wallet  = 'UNCONFIGURED'
            self.threads = os.cpu_count() or 4
            self.pool_url = f'{self.host}:{self.port}'

    # ---- network ------------------------------------------------- #

    def connect(self):
        self.sock = socket.create_connection((self.host, self.port), timeout=10)
        self.sock.settimeout(30)
        log.info(f'Connected to {self.host}:{self.port}')

    def disconnect(self):
        if self.sock:
            try: self.sock.close()
            except: pass
            self.sock = None

    def _send(self, method, params):
        self._req_id += 1
        msg = json.dumps({'id': self._req_id, 'method': method, 'params': params}) + '\n'
        self.sock.sendall(msg.encode())

    def _recv(self) -> dict:
        buf = b''
        while b'\n' not in buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError('Pool closed connection')
            buf += chunk
        return json.loads(buf.split(b'\n')[0])

    # ---- handshake ----------------------------------------------- #

    def handshake(self):
        self._send('mining.subscribe', ['dgb-skein-stack/0.1.0', None])
        resp = self._recv()
        log.info(f'Subscribe: {resp.get("result")}')

        self._send('mining.authorize', [self.wallet, 'x'])
        resp = self._recv()
        if not resp.get('result'):
            raise PermissionError(f'Auth failed: {resp}')
        log.info(f'Authorized wallet {self.wallet[:16]}...')

    # ---- PoW loop ------------------------------------------------ #

    def _work_job(self, job: list):
        """
        job params from mining.notify:
        [job_id, prevhash, coinb1, coinb2, merkle_branch,
         version, nbits, ntime, clean_jobs]
        """
        job_id, prevhash, coinb1, coinb2, merkle_branch, \
            version, nbits, ntime, _ = job[:9]

        coinbase = coinb1 + coinb2
        target_int = (2**256 - 1) // (2**32)  # approximate; real target from pool

        log.info(f'Working job {job_id} ntime={ntime}')
        start = time.time()
        nonce = 0

        while not self._stop.is_set():
            header = build_header(prevhash, coinbase, merkle_branch,
                                  int(version, 16), nbits, ntime, nonce)
            digest = skein_hash(header)
            value  = int.from_bytes(digest[:4], 'little')

            if value < 0x00000FFF:  # simplified difficulty check
                elapsed = time.time() - start
                log.info(f'Share found! nonce={nonce:#010x} in {elapsed:.2f}s')
                self._send('mining.submit', [
                    self.wallet, job_id, '', ntime,
                    struct.pack('<I', nonce).hex()
                ])
                resp = self._recv()
                log.info(f'Submit response: {resp}')
                break

            nonce = (nonce + 1) & 0xFFFFFFFF
            if nonce == 0:
                log.warning('Nonce exhausted for job — waiting for new job')
                break
            if nonce % 100_000 == 0:
                log.debug(f'{nonce / (time.time()-start):.0f} H/s')

    # ---- main loop ----------------------------------------------- #

    def run(self):
        backoff = RECONNECT_BASE
        while not self._stop.is_set():
            try:
                self.connect()
                self.handshake()
                backoff = RECONNECT_BASE

                while not self._stop.is_set():
                    msg = self._recv()
                    if msg.get('method') == 'mining.notify':
                        self.job = msg.get('params', [])
                        Thread(target=self._work_job, args=(self.job,), daemon=True).start()
                    elif msg.get('method') == 'mining.set_difficulty':
                        log.info(f'Difficulty: {msg["params"]}')

            except (ConnectionError, OSError, TimeoutError) as e:
                log.warning(f'Connection error: {e} — reconnecting in {backoff}s')
                self.disconnect()
                time.sleep(backoff)
                backoff = min(backoff * 2, RECONNECT_MAX)

    def stop(self):
        self._stop.set()
        self.disconnect()


if __name__ == '__main__':
    client = DGBSkeinClient()
    try:
        log.info('DGB Skein stack starting...')
        client.run()
    except KeyboardInterrupt:
        client.stop()
        log.info('DGB Skein stack stopped')
