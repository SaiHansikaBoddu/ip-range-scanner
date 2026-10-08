/**
 * IP Range Scanner - Frontend Logic
 */

// Configuration
const API_BASE_URL = 'https://ip-range-scanner-backend.onrender.com';

// DOM Elements
const scanForm = document.getElementById('scan-form');
const startIpInput = document.getElementById('start-ip');
const endIpInput = document.getElementById('end-ip');
const scanBtn = document.getElementById('btn-scan');
const scanBtnText = document.getElementById('scan-btn-text');
const clearBtn = document.getElementById('btn-clear');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const loadingContainer = document.getElementById('loading-container');
const loadingDetails = document.getElementById('loading-details');
const statsContainer = document.getElementById('stats-container');
const statTotal = document.getElementById('stat-total');
const statActive = document.getElementById('stat-active');
const statInactive = document.getElementById('stat-inactive');
const resultsBody = document.getElementById('results-body');
const resultsCountBadge = document.getElementById('results-count-badge');
const presetButtons = document.querySelectorAll('.preset-btn');
const backendStatusIndicator = document.getElementById('backend-status-indicator');
const backendStatusText = document.getElementById('backend-status-text');

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
 * Display error banner with custom message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorContainer.classList.remove('hidden');
}

/**
 * Clear error banner
 */
function clearError() {
  errorMessage.textContent = '';
  errorContainer.classList.add('hidden');
}

/**
 * Set loading UI state
 */
function setLoading(isLoading, hostCount = 0) {
  if (isLoading) {
    scanBtn.disabled = true;
    scanBtnText.textContent = 'Scanning...';
    if (hostCount > 0) {
      loadingDetails.textContent = `Probing ${hostCount} host${hostCount > 1 ? 's' : ''} in parallel. Please wait...`;
    } else {
      loadingDetails.textContent = 'Sending ICMP ping requests to discover active hosts...';
    }
    loadingContainer.classList.remove('hidden');
  } else {
    scanBtn.disabled = false;
    scanBtnText.textContent = 'Scan IP Range';
    loadingContainer.classList.add('hidden');
  }
}

/**
 * Render scan results into the HTML table
 */
function renderResults(results) {
  resultsBody.innerHTML = '';

  if (!results || results.length === 0) {
    resultsBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="3">
          <div class="empty-state">
            <p>No results returned for the specified range.</p>
          </div>
        </td>
      </tr>
    `;
    resultsCountBadge.classList.add('hidden');
    return;
  }

  results.forEach((item, index) => {
    const row = document.createElement('tr');
    
    // Status badge class
    let badgeClass = 'badge-inactive';
    let dotColor = '';
    if (item.status === 'ACTIVE') {
      badgeClass = 'badge-active';
    } else if (item.status === 'ERROR') {
      badgeClass = 'badge-error';
    }

    row.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td class="col-ip">${escapeHtml(item.ip)}</td>
      <td class="col-status">
        <span class="badge ${badgeClass}">
          <span class="badge-dot"></span>
          ${escapeHtml(item.status)}
        </span>
      </td>
    `;
    resultsBody.appendChild(row);
  });

  // Update header count badge
  resultsCountBadge.textContent = `${results.length} Host${results.length > 1 ? 's' : ''}`;
  resultsCountBadge.classList.remove('hidden');
}

/**
 * Update summary statistic cards
 */
function updateStats(total, active, inactive) {
  statTotal.textContent = total;
  statActive.textContent = active;
  statInactive.textContent = inactive;
  statsContainer.classList.remove('hidden');
}

/**
 * Clear all results, messages, and reset table
 */
function clearAll() {
  clearError();
  setLoading(false);
  
  // Reset table to empty state
  resultsBody.innerHTML = `
    <tr class="empty-row" id="empty-row">
      <td colspan="3">
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          <p>No scan results yet. Enter an IP range above and click <strong>"Scan IP Range"</strong>.</p>
        </div>
      </td>
    </tr>
  `;

  // Hide count badge & stats
  resultsCountBadge.classList.add('hidden');
  statsContainer.classList.add('hidden');
}

/**
 * Prevent XSS in rendered outputs
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check backend health status on startup
 */
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
    if (response.ok) {
      backendStatusIndicator.className = 'badge-status online';
      backendStatusText.textContent = 'Backend: Online';
    } else {
      backendStatusIndicator.className = 'badge-status offline';
      backendStatusText.textContent = 'Backend: Error';
    }
  } catch (err) {
    backendStatusIndicator.className = 'badge-status offline';
    backendStatusText.textContent = 'Backend: Offline';
  }
}

/**
 * Handle form submission
 */
async function handleScan(e) {
  e.preventDefault();
  clearError();

  const startIp = startIpInput.value.trim();
  const endIp = endIpInput.value.trim();

  // 1. Client validation: Empty fields
  if (!startIp || !endIp) {
    showError('Please enter both Start IP and End IP addresses.');
    return;
  }

  // 2. Client validation: IPv4 format
  if (!isValidIpv4(startIp)) {
    showError(`Invalid Start IP "${startIp}". Must be a valid IPv4 address (e.g. 192.168.1.1).`);
    startIpInput.focus();
    return;
  }

  if (!isValidIpv4(endIp)) {
    showError(`Invalid End IP "${endIp}". Must be a valid IPv4 address (e.g. 192.168.1.10).`);
    endIpInput.focus();
    return;
  }

  // 3. Client validation: Start IP <= End IP
  const startLong = ipToLong(startIp);
  const endLong = ipToLong(endIp);

  if (startLong > endLong) {
    showError(`Start IP (${startIp}) cannot be greater than End IP (${endIp}).`);
    return;
  }

  // 4. Client validation: Range limit <= 256
  const hostCount = endLong - startLong + 1;
  if (hostCount > 256) {
    showError(`IP range exceeds maximum allowed limit of 256 hosts (requested ${hostCount} hosts).`);
    return;
  }

  // Prepare UI for scan
  setLoading(true, hostCount);

  try {
    const response = await fetch(`${API_BASE_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ startIp, endIp })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || `Server error (${response.status}): Failed to scan IP range.`);
      return;
    }

    // Scan succeeded
    backendStatusIndicator.className = 'badge-status online';
    backendStatusText.textContent = 'Backend: Online';

    renderResults(data.results || []);
    updateStats(data.total || 0, data.activeCount || 0, data.inactiveCount || 0);

  } catch (err) {
    console.error('Fetch error:', err);
    backendStatusIndicator.className = 'badge-status offline';
    backendStatusText.textContent = 'Backend: Offline';
    showError('Cannot connect to the backend server. Please ensure the backend server is running.');
  } finally {
    setLoading(false);
  }
}

// Preset button handlers
presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const start = btn.getAttribute('data-start');
    const end = btn.getAttribute('data-end');
    if (start && end) {
      startIpInput.value = start;
      endIpInput.value = end;
      clearError();
    }
  });
});

// Event Listeners
scanForm.addEventListener('submit', handleScan);
clearBtn.addEventListener('click', clearAll);

// Initial backend health check
checkBackendHealth();
