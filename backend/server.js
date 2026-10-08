const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

/**
 * Validate standard IPv4 address format (0.0.0.0 - 255.255.255.255)
 */
function isValidIpv4(ip) {
  if (typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;

  return parts.every(part => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255 && String(num) === part;
  });
}

/**
 * Convert IPv4 string to 32-bit unsigned integer
 */
function ipToLong(ip) {
  return ip
    .trim()
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);
}

/**
 * Convert 32-bit unsigned integer back to IPv4 string
 */
function longToIp(long) {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

/**
 * Ping a single IP address using Windows-compatible command: ping -n 1 -w 1000 <ip>
 * Returns a Promise resolving to { ip, status: "ACTIVE" | "INACTIVE" | "ERROR" }
 */

      function pingHost(ip) {
  return new Promise((resolve) => {
    // Use Linux ping options on Render
    const cmd = `ping -c 1 -W 1 ${ip}`;

    exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
      const output = (stdout || '') + (stderr || '');

      // Linux ping success is indicated by "1 received"
      const hasReply =
        /1 received/i.test(output) ||
        /bytes from/i.test(output);

      if (hasReply) {
        resolve({ ip, status: 'ACTIVE' });
      } else if (error && !output) {
        resolve({ ip, status: 'ERROR' });
      } else {
        resolve({ ip, status: 'INACTIVE' });
      }
    });
  });
}

/**
 * Helper to process an array of items with a fixed concurrency limit
 */
async function mapConcurrent(items, limit, asyncFn) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await asyncFn(items[idx]);
    }
  }

  const workers = [];
  const workerCount = Math.min(limit, items.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * GET /
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    message: 'IP Range Scanner API is running'
  });
});

/**
 * POST /api/scan
 * Request body: { startIp: "192.168.1.1", endIp: "192.168.1.10" }
 */
app.post('/api/scan', async (req, res) => {
  try {
    const { startIp, endIp } = req.body || {};

    // 1. Validate presence
    if (!startIp || !endIp || typeof startIp !== 'string' || typeof endIp !== 'string' || !startIp.trim() || !endIp.trim()) {
      return res.status(400).json({
        error: 'Both startIp and endIp are required non-empty string fields.'
      });
    }

    const cleanStartIp = startIp.trim();
    const cleanEndIp = endIp.trim();

    // 2. Validate IPv4 format
    if (!isValidIpv4(cleanStartIp)) {
      return res.status(400).json({
        error: `Invalid Start IP address: "${cleanStartIp}". Must be a valid IPv4 address (e.g. 192.168.1.1).`
      });
    }

    if (!isValidIpv4(cleanEndIp)) {
      return res.status(400).json({
        error: `Invalid End IP address: "${cleanEndIp}". Must be a valid IPv4 address (e.g. 192.168.1.10).`
      });
    }

    // 3. Compare start and end IP
    const startLong = ipToLong(cleanStartIp);
    const endLong = ipToLong(cleanEndIp);

    if (startLong > endLong) {
      return res.status(400).json({
        error: `Start IP (${cleanStartIp}) cannot be greater than End IP (${cleanEndIp}).`
      });
    }

    // 4. Validate range limit (maximum 256 hosts)
    const hostCount = endLong - startLong + 1;
    if (hostCount > 256) {
      return res.status(400).json({
        error: `IP range exceeds maximum allowed limit of 256 hosts (requested ${hostCount} hosts).`
      });
    }

    // 5. Generate IP list
    const ipList = [];
    for (let current = startLong; current <= endLong; current++) {
      ipList.push(longToIp(current));
    }

    // 6. Ping all IPs concurrently (pool size 25 for fast scanning)
    const results = await mapConcurrent(ipList, 25, pingHost);

    const activeCount = results.filter((r) => r.status === 'ACTIVE').length;
    const inactiveCount = results.filter((r) => r.status === 'INACTIVE').length;
    const errorCount = results.filter((r) => r.status === 'ERROR').length;

    return res.status(200).json({
      message: 'Scan completed successfully',
      total: results.length,
      activeCount,
      inactiveCount,
      errorCount,
      results
    });
  } catch (err) {
    console.error('Unhandled scan error:', err);
    return res.status(500).json({
      error: 'An unexpected internal server error occurred while scanning.'
    });
  }
});

// Handle 404 for unknown endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`IP Range Scanner API server running on http://localhost:${PORT}`);
});
