# Port Management Guide

Commands for managing development ports 3000, 3001, and 3020 during Nest.js + Nuxt.js development.

## Quick Port Cleanup

### For Claude Code Users (Recommended)
```bash
# Check active background processes
/bashes

# Kill specific background server by ID using KillBash tool
```

### Linux/WSL Ubuntu (Primary)
```bash
# One-line port cleanup
echo "🧹 Cleaning ports..." && for port in 3000 3001 3020; do lsof -ti :$port 2>/dev/null | xargs -r kill -9; done && pkill -f node 2>/dev/null; echo "✅ Done"
```

### Other Platforms
```bash
# Windows Git Bash
taskkill //F //IM node.exe

# Windows PowerShell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# macOS
pkill -f node
```

## Manual Steps

### 1. Check Ports
```bash
# WSL Ubuntu
lsof -i :3000,:3001,:3020

# Alternative
ss -tuln | grep -E ":(3000|3001|3020)"
```

### 2. Kill Processes
```bash
# By port
kill -9 $(lsof -ti :3000)
kill -9 $(lsof -ti :3001)
kill -9 $(lsof -ti :3020)

# All Node.js processes
pkill -f node
```

### 3. Verify Clean
```bash
# Should return no output
lsof -i :3000,:3001,:3020
```

## Development Workflow

### Starting Servers
```bash
# Terminal 1: Backend (Port 3020)
cd backend && npm run local

# Terminal 2: Frontend (Port 3000)
cd frontend && npm run local
```

### Stopping Servers
1. Press `Ctrl+C` in each terminal
2. If unresponsive, use cleanup commands above

## Troubleshooting

**"EADDRINUSE" Error:**
1. Run the one-line cleanup command above
2. If persistent: `sudo fuser -k 3000/tcp 3001/tcp 3020/tcp`
3. Last resort: Restart terminal/system

**Background Processes:**
- **Claude Code**: Use `/bashes` + KillBash tool
- **Manual**: `pkill -f node` or `ps aux | grep node` then `kill -9 <PID>`

## Port Configuration
- **Backend (NestJS)**: Port 3020 (`backend/.env.local`)
- **Frontend (Nuxt.js)**: Port 3000 (`frontend/nuxt.config.ts`)
- **Reserved**: Port 3001 (avoid conflicts)

## Related Docs
- [Development Setup](./development-setup.md)
- [API Communication](./api-communication.md)