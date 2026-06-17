/**
 * Pool API Router
 * ===============
 * Express sub-router mounted at /api/mining/pools
 */

const express = require('express');
const router  = express.Router();
const poolCfg = require('./pool-config');

// GET /api/mining/pools — list all pools + active flag
router.get('/', (req, res) => {
  const cfg    = poolCfg.loadConfig();
  const pools  = poolCfg.allPools().map(p => ({
    ...p,
    active: p.id === cfg.active_pool_id,
    in_failover: (cfg.failover_order || []).includes(p.id),
  }));
  res.json({
    active_pool_id: cfg.active_pool_id,
    failover_order: cfg.failover_order,
    use_tls: cfg.use_tls,
    pools,
  });
});

// GET /api/mining/pools/active
router.get('/active', (req, res) => {
  res.json(poolCfg.getActivePool());
});

// POST /api/mining/pools/active — { pool_id }
router.post('/active', (req, res) => {
  const { pool_id } = req.body;
  if (!pool_id) return res.status(400).json({ error: 'pool_id required' });
  try {
    const cfg = poolCfg.setActivePool(pool_id);
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/mining/pools/failover — { order: [id, id, ...] }
router.post('/failover', (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of pool ids' });
  try {
    const cfg = poolCfg.setFailoverOrder(order);
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/mining/pools/custom — add custom pool
router.post('/custom', (req, res) => {
  try {
    const cfg = poolCfg.addCustomPool(req.body);
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/mining/pools/custom/:id — remove custom pool
router.delete('/custom/:id', (req, res) => {
  try {
    const cfg = poolCfg.removeCustomPool(req.params.id);
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/mining/pools/test — { pool_id } or { url }
router.post('/test', async (req, res) => {
  const { pool_id, url } = req.body;
  let testUrl = url;
  if (pool_id) {
    const pool = poolCfg.getPool(pool_id);
    if (!pool) return res.status(404).json({ error: `Pool not found: ${pool_id}` });
    testUrl = pool.url;
  }
  if (!testUrl) return res.status(400).json({ error: 'pool_id or url required' });
  const result = await poolCfg.testPoolReachability(testUrl);
  res.json({ url: testUrl, ...result });
});

module.exports = router;
