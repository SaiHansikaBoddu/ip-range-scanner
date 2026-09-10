# IP Range Scanner

> **⚠️ Security & Legal Notice:**
> **Use this scanner only on your own network or an authorized environment.**
> Unauthorized network scanning may violate applicable laws and organizational policies.

---

## 📌 Project Overview & Objective

The **IP Range Scanner** is a full-stack network utility built to scan and detect reachable (active) hosts across any valid IPv4 range. It features an Express.js backend that executes Windows-compatible ping operations and a responsive, modern HTML/CSS/JavaScript frontend with real-time feedback and results visualization.

---

## 🚀 Key Features

- **Real Network Probing**: Uses real Windows `ping` execution (`ping -n 1 -w 1000 <ip>`) without mock or hardcoded values.
- **Fast Concurrency Worker Pool**: Scans multiple IP addresses in parallel (up to 25 simultaneous pings) for fast responsiveness.
- **Comprehensive Validation**:
  - Validates IPv4 format (4 octets, 0–255).
  - Enforces Start IP ≤ End IP.
  - Limits range size to a maximum of 256 hosts.
  - Rejects empty, invalid, or out-of-order IP ranges.
- **Modern Responsive Frontend**:
  - Start/End IP inputs with quick-fill presets (e.g. Localhost test).
  - Clear visual status badges (`ACTIVE`, `INACTIVE`, `ERROR`).
  - Summary metrics (Total Hosts, Active Hosts, Inactive Hosts).
  - Real-time loading indicator with disabled button states.
  - "Clear Results" functionality.
  - Dedicated error message display area.
- **Full CORS Support**: Seamless communication between frontend and backend.

---

## 🛠️ Technologies Used

- **Frontend**:
  - HTML5 (Semantic structure)
  - Vanilla CSS3 (Modern dark theme, responsive grid, glassmorphism)
  - Vanilla JavaScript (ES6+, Fetch API, async/await, DOM manipulation)
- **Backend**:
  - Node.js (Runtime environment)
  - Express.js (REST API framework)
  - `cors` (Cross-Origin Resource Sharing middleware)
  - Node.js `child_process` (Windows ping execution)

---

## 📁 Folder Structure

```text
IP Range Scanner/
├── frontend/
│   ├── index.html       # Web interface structure & layout
│   ├── style.css        # Modern cybersecurity dark theme styling
│   └── script.js        # Frontend logic, validation, API requests & table rendering
└── backend/
    ├── server.js        # Express API server with validation and ping runner
    ├── package.json     # Node.js dependencies and run scripts
    └── README.md        # Complete documentation and setup guide
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- **Node.js** (v14 or higher recommended)
- **Windows OS** (for native Windows ping command execution)

### 2. Install Backend Dependencies
Open your terminal (PowerShell / Command Prompt) and navigate to the `backend` directory:
```powershell
cd "backend"
npm install
```

---

## 💻 How to Start the Application

### 1. Start the Backend API Server
Inside the `backend` folder, run:
```powershell
npm start
```
The server will start on:
```
http://localhost:5000
```

### 2. Open the Frontend
You can open `frontend/index.html` directly in any modern web browser:
- **Option A**: Double-click `frontend/index.html` in Windows File Explorer.
- **Option B (PowerShell)**:
  ```powershell
  Start-Process "..\frontend\index.html"
  ```
- **Option C**: Use VS Code Live Server or any static web server on port 3000/5500.

---

## 📡 API Specification

### 1. Health Check
- **Endpoint**: `GET /`
- **Description**: Returns server status.
- **Response**: `200 OK`
  ```json
  {
    "message": "IP Range Scanner API is running"
  }
  ```

---

### 2. Scan IP Range
- **Endpoint**: `POST /api/scan`
- **Description**: Validates input range, generates all IP addresses in between, and pings each host.
- **Headers**: `Content-Type: application/json`

#### **Request Body Example:**
```json
{
  "startIp": "192.168.1.1",
  "endIp": "192.168.1.5"
}
```

#### **Success Response (`200 OK`):**
```json
{
  "message": "Scan completed successfully",
  "total": 5,
  "activeCount": 2,
  "inactiveCount": 3,
  "errorCount": 0,
  "results": [
    {
      "ip": "192.168.1.1",
      "status": "ACTIVE"
    },
    {
      "ip": "192.168.1.2",
      "status": "INACTIVE"
    },
    {
      "ip": "192.168.1.3",
      "status": "INACTIVE"
    },
    {
      "ip": "192.168.1.4",
      "status": "INACTIVE"
    },
    {
      "ip": "192.168.1.5",
      "status": "ACTIVE"
    }
  ]
}
```

---

## ⚠️ Error Handling

The API returns standard HTTP status codes and structured JSON error objects:

| Status Code | Reason | Example Response |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing parameters | `{"error": "Both startIp and endIp are required non-empty string fields."}` |
| `400 Bad Request` | Invalid IPv4 address | `{"error": "Invalid Start IP address: \"999.1.1.1\". Must be a valid IPv4 address (e.g. 192.168.1.1)."}` |
| `400 Bad Request` | Start IP > End IP | `{"error": "Start IP (192.168.1.10) cannot be greater than End IP (192.168.1.1)."}` |
| `400 Bad Request` | Range > 256 hosts | `{"error": "IP range exceeds maximum allowed limit of 256 hosts (requested 500 hosts)."}` |
| `500 Server Error` | Unexpected error | `{"error": "An unexpected internal server error occurred while scanning."}` |

---

## 🔒 Authorized-Use Warning

> **Use this scanner only on your own network or an authorized environment.**
