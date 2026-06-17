#!/usr/bin/env python3
"""
FWSMP Protocol Stack — Step 48
Fennac WireBruce Secure Mining Protocol

Handles:
  - TCP connection to pool via stunnel (127.0.0.1:4435)
  - FWSMP handshake + authentication
  - Job acquisition loop
  - Share submission
  - Reconnect with exponential backoff

Network flow:
  fwsmp-stack.py -> 127.0.0.1:4435 (WireBruce)
                 -> pool.fennac.io:4434 (stunnel TLS 1.3)
                 -> Fennac pool server
"""

import socket
import json
import time
import logging
import hashlib
import os
from threading import Thread, Event

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [FWSMP] %(levelname)s %(message)s'
)
log = logging.getLogger('fwsmp')

DEFAULT_HOST   = '127.0.0.1'
DEFAULT_PORT   = 4435
RECONNECT_BASE = 5   # seconds
RECONNECT_MAX  = 120


class FWSMPClient:
    """
    FWSMP client — connects, authenticates, receives jobs, submits shares.
    """

    def __init__(self, host=DEFAULT_HOST, port=DEFAULT_PORT,
                 worker=None, config_path='/etc/fennac/config.json'):
        self.host   = host
        self.port   = port
        self.worker = worker or os.uname().nodename
        self.sock   = None
        self.job    = None
        self._stop  = Event()
        self._load_config(config_path)

    def _load_config(self, path):
        try:
            with open(path) as f:
                cfg = json.load(f)
            self.worker = cfg.get('worker_name', self.worker)
            self.threads = cfg.get('threads', os.cpu_count() or 4)
            log.info(f'Config loaded: worker={self.worker} threads={self.threads}')
        except FileNotFoundError:
            log.warning(f'Config not found at {path}, using defaults')
            self.threads = os.cpu_count() or 4

    # ------------------------------------------------------------------ #
    #  Connection
    # ------------------------------------------------------------------ #

    def connect(self):
        """Open TCP socket to stunnel local listener."""
        self.sock = socket.create_connection((self.host, self.port), timeout=10)
        self.sock.settimeout(30)
        log.info(f'Connected to {self.host}:{self.port}')

    def disconnect(self):
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    # ------------------------------------------------------------------ #
    #  FWSMP protocol frames
    # ------------------------------------------------------------------ #

    def _send(self, msg: dict):
        frame = json.dumps(msg) + '\n'
        self.sock.sendall(frame.encode())

    def _recv(self) -> dict:
        buf = b''
        while b'\n' not in buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError('Pool closed connection')
            buf += chunk
        return json.loads(buf.split(b'\n')[0])

    # ------------------------------------------------------------------ #
    #  FWSMP handshake
    # ------------------------------------------------------------------ #

    def handshake(self):
        """FWSMP login sequence."""
        self._send({
            'id': 1,
            'method': 'mining.subscribe',
            'params': ['fennacminer/0.1.0', None]
        })
        resp = self._recv()
        log.info(f'Subscribe: {resp}')

        self._send({
            'id': 2,
            'method': 'mining.authorize',
            'params': [self.worker, 'x']
        })
        resp = self._recv()
        if not resp.get('result'):
            raise PermissionError(f'Authorization failed: {resp}')
        log.info(f'Authorized as {self.worker}')

    # ------------------------------------------------------------------ #
    #  Job loop
    # ------------------------------------------------------------------ #

    def _process_job(self, job: dict):
        """Minimal proof-of-work: SHA-256 double hash (Fennac variant)."""
        job_id   = job.get('job_id', 'unknown')
        blob     = bytes.fromhex(job.get('blob', ''))
        target   = int(job.get('target', 'ffffffffffffffff'), 16)
        nonce    = 0

        log.info(f'Working job {job_id} target={job["target"]}')
        start = time.time()

        while not self._stop.is_set():
            candidate = blob + nonce.to_bytes(8, 'little')
            digest = hashlib.sha256(hashlib.sha256(candidate).digest()).digest()
            value  = int.from_bytes(digest[:8], 'little')

            if value < target:
                elapsed = time.time() - start
                log.info(f'Share found! nonce={nonce} in {elapsed:.2f}s')
                self._send({
                    'id': 4,
                    'method': 'mining.submit',
                    'params': [self.worker, job_id, nonce.to_bytes(8, 'little').hex()]
                })
                resp = self._recv()
                log.info(f'Share response: {resp}')
                break

            nonce += 1
            if nonce % 100_000 == 0:
                log.debug(f'Hashrate: {nonce / (time.time() - start):.0f} H/s')

    def run(self):
        """Main event loop with reconnect backoff."""
        backoff = RECONNECT_BASE
        while not self._stop.is_set():
            try:
                self.connect()
                self.handshake()
                backoff = RECONNECT_BASE  # reset on success

                while not self._stop.is_set():
                    msg = self._recv()
                    if msg.get('method') == 'job':
                        self.job = msg.get('params', {})
                        Thread(target=self._process_job, args=(self.job,), daemon=True).start()

            except (ConnectionError, OSError, TimeoutError) as e:
                log.warning(f'Connection error: {e} — reconnecting in {backoff}s')
                self.disconnect()
                time.sleep(backoff)
                backoff = min(backoff * 2, RECONNECT_MAX)

    def stop(self):
        self._stop.set()
        self.disconnect()


if __name__ == '__main__':
    client = FWSMPClient()
    try:
        log.info('FWSMP stack starting...')
        client.run()
    except KeyboardInterrupt:
        client.stop()
        log.info('FWSMP stack stopped')
