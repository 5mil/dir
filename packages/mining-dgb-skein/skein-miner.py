#!/usr/bin/env python3
"""
DigiByte Skein CPU Miner
========================
Stratum protocol client targeting DigiByte (DGB) Skein algorithm pools.

Algorithm: Skein (DigiByte algo 4 of 5)
Protocol:  Stratum v1 over TCP → stunnel TLS → pool
PoW:       Skein-512/256 double hash

Network flow:
  skein-miner.py → 127.0.0.1:14433 (stunnel local)
                → pool.dgb-skein.io:4444 (TLS)
                → DigiByte Skein pool

Dependencies:
  pip install pyskein  # or fallback to hashlib skein via pysha3
"""

import socket
import json
import time
import logging
import struct
import hashlib
import os
from threading import Thread, Event

try:
    import skein
    def skein_hash(data: bytes) -> bytes:
        """Skein-512/256 double hash (DigiByte variant)."""
        h1 = skein.skein512(data, digest_bits=256).digest()
        h2 = skein.skein512(h1,  digest_bits=256).digest()
        return h2
except ImportError:
    # Fallback: SHA-256 double hash for testing without pyskein
    def skein_hash(data: bytes) -> bytes:
        h1 = hashlib.sha256(data).digest()
        h2 = hashlib.sha256(h1).digest()
        return h2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [DGB-SKEIN] %(levelname)s %(message)s'
)
log = logging.getLogger('dgb-skein')

DEFAULT_HOST   = '127.0.0.1'
DEFAULT_PORT   = 14433        # local stunnel listener
RECONNECT_BASE = 5
RECONNECT_MAX  = 120
CONFIG_PATH    = '/etc/dgb-skein/config.json'


class DGBSkeinMiner:
    """
    DigiByte Skein Stratum v1 miner.
    Connects via stunnel local port, authenticates, receives work, submits shares.
    """

    def __init__(self, host=DEFAULT_HOST, port=DEFAULT_PORT, config_path=CONFIG_PATH):
        self.host    = host
        self.port    = port
        self.sock    = None
        self.job     = None
        self._stop   = Event()
        self._req_id = 1
        self._load_config(config_path)

    def _load_config(self, path):
        try:
            with open(path) as f:
                cfg = json.load(f)
            self.wallet  = cfg.get('wallet',  'D' + 'G' * 33)  # placeholder DGB addr
            self.worker  = cfg.get('worker',  os.uname().nodename)
            self.threads = cfg.get('threads', os.cpu_count() or 2)
            self.pass_   = cfg.get('password','x')
            log.info(f'Config: wallet={self.wallet[:8]}... worker={self.worker} threads={self.threads}')
        except FileNotFoundError:
            log.warning(f'Config not found at {path}, using defaults')
            self.wallet  = 'DGBWalletAddressHere'
            self.worker  = os.uname().nodename
            self.threads = os.cpu_count() or 2
            self.pass_   = 'x'

    # ------------------------------------------------------------------ #
    #  Transport
    # ------------------------------------------------------------------ #

    def connect(self):
        self.sock = socket.create_connection((self.host, self.port), timeout=10)
        self.sock.settimeout(60)
        log.info(f'Connected to {self.host}:{self.port}')

    def disconnect(self):
        if self.sock:
            try: self.sock.close()
            except: pass
            self.sock = None

    def _send(self, method: str, params: list):
        msg = {'id': self._req_id, 'method': method, 'params': params}
        self._req_id += 1
        frame = json.dumps(msg) + '\n'
        self.sock.sendall(frame.encode())
        return msg['id']

    def _recv(self) -> dict:
        buf = b''
        while b'\n' not in buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError('Pool closed connection')
            buf += chunk
        return json.loads(buf.split(b'\n')[0])

    # ------------------------------------------------------------------ #
    #  Stratum handshake
    # ------------------------------------------------------------------ #

    def handshake(self):
        # Subscribe
        self._send('mining.subscribe', ['dgb-skein-miner/0.1.0', None])
        resp = self._recv()
        log.info(f'Subscribe: session={resp.get("result", ["", [""], ""])[2]}')

        # Set extranonce (if supported)
        extra1 = resp.get('result', ['', [[]], ''])

        # Authorize
        self._send('mining.authorize', [f'{self.wallet}.{self.worker}', self.pass_])
        resp = self._recv()
        if not resp.get('result'):
            raise PermissionError(f'Auth failed: {resp}')
        log.info(f'Authorized: {self.wallet[:8]}...{self.worker}')

    # ------------------------------------------------------------------ #
    #  Mining
    # ------------------------------------------------------------------ #

    def _build_header(self, job: dict, nonce: int) -> bytes:
        """Construct 80-byte DigiByte block header."""
        version    = struct.pack('<I', int(job.get('version', '00000001'), 16))
        prev_hash  = bytes.fromhex(job.get('prevhash', '00' * 32))
        merkle     = bytes.fromhex(job.get('merkle_root', '00' * 32))
        ntime      = struct.pack('<I', int(job.get('ntime', 'ffffffff'), 16))
        nbits      = struct.pack('<I', int(job.get('nbits', '1d00ffff'), 16))
        nonce_b    = struct.pack('<I', nonce)
        return version + prev_hash + merkle + ntime + nbits + nonce_b

    def _mine_job(self, job: dict):
        job_id = job.get('job_id', 'unknown')
        target = int(job.get('target', 'f' * 64), 16)
        nonce  = 0
        start  = time.time()
        log.info(f'Mining job {job_id}')

        while not self._stop.is_set():
            header = self._build_header(job, nonce)
            digest = skein_hash(header)
            value  = int.from_bytes(digest, 'little')

            if value < target:
                elapsed = time.time() - start
                log.info(f'Share found! job={job_id} nonce={nonce:#010x} in {elapsed:.2f}s')
                self._send('mining.submit', [
                    f'{self.wallet}.{self.worker}',
                    job_id,
                    job.get('extranonce2', '00000000'),
                    job.get('ntime', 'ffffffff'),
                    f'{nonce:08x}'
                ])
                resp = self._recv()
                log.info(f'Share result: {resp.get("result")} {resp.get("error")}')
                break

            nonce = (nonce + 1) & 0xFFFFFFFF
            if nonce == 0:
                log.warning('Nonce exhausted — waiting for new job')
                break
            if nonce % 500_000 == 0:
                hr = nonce / (time.time() - start)
                log.debug(f'Hashrate: {hr/1000:.1f} KH/s')

    # ------------------------------------------------------------------ #
    #  Main loop
    # ------------------------------------------------------------------ #

    def run(self):
        backoff = RECONNECT_BASE
        while not self._stop.is_set():
            try:
                self.connect()
                self.handshake()
                backoff = RECONNECT_BASE
                workers = []

                while not self._stop.is_set():
                    msg = self._recv()
                    method = msg.get('method', '')

                    if method == 'mining.notify':
                        p = msg['params']
                        job = {
                            'job_id':     p[0],
                            'prevhash':   p[1],
                            'merkle_root':p[2],
                            'version':    p[5],
                            'nbits':      p[6],
                            'ntime':      p[7],
                            'target':     p[8] if len(p) > 8 else 'f'*64,
                            'clean_jobs': p[9] if len(p) > 9 else False,
                        }
                        if job.get('clean_jobs'):
                            for w in workers:
                                self._stop.set()
                            workers = []
                            self._stop.clear()
                        t = Thread(target=self._mine_job, args=(job,), daemon=True)
                        workers.append(t)
                        t.start()

                    elif method == 'mining.set_difficulty':
                        log.info(f'Difficulty: {msg["params"][0]}')

            except (ConnectionError, OSError, TimeoutError) as e:
                log.warning(f'Connection error: {e} — reconnect in {backoff}s')
                self.disconnect()
                time.sleep(backoff)
                backoff = min(backoff * 2, RECONNECT_MAX)

    def stop(self):
        self._stop.set()
        self.disconnect()


if __name__ == '__main__':
    miner = DGBSkeinMiner()
    try:
        log.info('DigiByte Skein miner starting...')
        miner.run()
    except KeyboardInterrupt:
        miner.stop()
        log.info('Miner stopped')
