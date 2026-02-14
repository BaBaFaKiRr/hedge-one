# Frontend Logging - Quick Start Guide

**For Cursor AI:** Use this guide to quickly implement log viewing in the frontend.

## Quick Implementation Flow

### Step 1: Backend API Endpoint

```python
# FastAPI example
from fastapi import FastAPI, Query
from helpers.log_retrieval import query_log_files, get_signed_url

app = FastAPI()

@app.get("/api/logs/files")
async def list_log_files(
    user_id: str = Query(...),
    broker: str = None,
    limit: int = 100
):
    files = query_log_files(user_id=user_id, broker=broker, limit=limit)
    
    # Add signed URLs
    for f in files:
        f["signed_url"] = get_signed_url(f["storage_path"], expires_in=3600)
    
    return {"files": files}
```

### Step 2: Frontend - Fetch Files

```typescript
// Fetch log files list
const response = await fetch(`/api/logs/files?user_id=${userId}&broker=${broker}`);
const { files } = await response.json();
```

### Step 3: Frontend - Download and Parse Log File

```typescript
// Download log file using signed URL
const logResponse = await fetch(files[0].signed_url);
const logText = await logResponse.text();

// Parse NDJSON (newline-delimited JSON)
const logEntries = logText
  .trim()
  .split('\n')
  .filter(line => line.trim())
  .map(line => JSON.parse(line));

// Each entry has:
// {
//   "ts": "2025-01-14T09:16:02.341Z",
//   "level": "INFO",
//   "component": "strategy.stock_ema_crossover",
//   "message": "BUY order placed",
//   "strategy": "stock_ema_crossover",  // optional
//   "symbol": "NIFTY",  // optional
//   "order_id": "A123456"  // optional
// }
```

### Step 4: Frontend - Display Logs

```typescript
function LogViewer({ userId, broker }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [entries, setEntries] = useState([]);

  // Fetch files list
  useEffect(() => {
    fetch(`/api/logs/files?user_id=${userId}&broker=${broker}`)
      .then(r => r.json())
      .then(data => setFiles(data.files));
  }, [userId, broker]);

  // Download and parse selected file
  useEffect(() => {
    if (!selectedFile?.signed_url) return;
    
    fetch(selectedFile.signed_url)
      .then(r => r.text())
      .then(text => {
        const parsed = text
          .trim()
          .split('\n')
          .filter(l => l.trim())
          .map(l => JSON.parse(l));
        setEntries(parsed);
      });
  }, [selectedFile]);

  return (
    <div style={{ display: 'flex' }}>
      {/* File list */}
      <div style={{ width: '300px', borderRight: '1px solid #ddd' }}>
        {files.map(file => (
          <div 
            key={file.id} 
            onClick={() => setSelectedFile(file)}
            style={{ 
              padding: '0.75rem', 
              cursor: 'pointer',
              backgroundColor: selectedFile?.id === file.id ? '#e3f2fd' : 'white'
            }}
          >
            <div><strong>{file.broker}</strong></div>
            <div>{file.log_date} {file.log_hour.toString().padStart(2, '0')}:00</div>
          </div>
        ))}
      </div>

      {/* Log entries */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {entries.map((entry, i) => (
          <div 
            key={i} 
            style={{
              padding: '0.5rem',
              borderBottom: '1px solid #eee',
              fontFamily: 'monospace',
              backgroundColor: 
                entry.level === 'ERROR' ? '#ffebee' :
                entry.level === 'WARNING' ? '#fff3e0' : '#f5f5f5'
            }}
          >
            <span style={{ color: '#666', marginRight: '1rem' }}>
              {new Date(entry.ts).toLocaleString()}
            </span>
            <span style={{
              fontWeight: 'bold',
              padding: '0.2rem 0.5rem',
              borderRadius: '3px',
              marginRight: '0.5rem',
              backgroundColor: entry.level === 'ERROR' ? '#f44336' : '#2196f3',
              color: 'white'
            }}>
              {entry.level}
            </span>
            {entry.strategy && (
              <span style={{
                backgroundColor: '#9c27b0',
                color: 'white',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
                marginRight: '0.5rem'
              }}>
                {entry.strategy}
              </span>
            )}
            <span>{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Complete React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useLogs(userId: string, broker?: string) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch files
  useEffect(() => {
    setLoading(true);
    fetch(`/api/logs/files?user_id=${userId}${broker ? `&broker=${broker}` : ''}`)
      .then(r => r.json())
      .then(data => {
        setFiles(data.files);
        setLoading(false);
      });
  }, [userId, broker]);

  // Fetch log content when file selected
  useEffect(() => {
    if (!selectedFile?.signed_url) {
      setEntries([]);
      return;
    }

    setLoading(true);
    fetch(selectedFile.signed_url)
      .then(r => r.text())
      .then(text => {
        const parsed = text
          .trim()
          .split('\n')
          .filter(l => l.trim())
          .map(l => JSON.parse(l));
        setEntries(parsed);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load log:', err);
        setLoading(false);
      });
  }, [selectedFile]);

  return {
    files,
    entries,
    loading,
    selectFile: setSelectedFile,
    selectedFile
  };
}

// Usage
function LogViewer({ userId }) {
  const { files, entries, loading, selectFile, selectedFile } = useLogs(userId, 'angelone');

  return (
    <div>
      <div>
        {files.map(f => (
          <button key={f.id} onClick={() => selectFile(f)}>
            {f.broker} - {f.log_date}
          </button>
        ))}
      </div>
      {loading ? <div>Loading...</div> : (
        <div>
          {entries.map((e, i) => (
            <div key={i}>
              {e.ts} [{e.level}] {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Key Functions to Use

### Backend (Python)
```python
from helpers.log_retrieval import (
    query_log_files,      # Query metadata table
    get_signed_url,        # Generate signed URL
    get_log_files_for_user_broker,  # Convenience function
    get_log_files_for_session       # Get all files for a session
)
```

### Frontend (TypeScript/JavaScript)
```typescript
// 1. Fetch file list
const files = await fetch('/api/logs/files?user_id=...').then(r => r.json());

// 2. Download log file
const content = await fetch(files[0].signed_url).then(r => r.text());

// 3. Parse NDJSON
const entries = content.split('\n').map(line => JSON.parse(line));

// 4. Display
entries.forEach(entry => {
  console.log(`${entry.ts} [${entry.level}] ${entry.message}`);
});
```

## Log Entry Structure

Each log entry is a JSON object:

```json
{
  "ts": "2025-01-14T09:16:02.341Z",      // ISO timestamp (UTC)
  "level": "INFO",                        // INFO | WARNING | ERROR | DEBUG
  "component": "strategy.stock_ema_crossover",  // Logger name
  "message": "BUY order placed",         // Log message
  "strategy": "stock_ema_crossover",     // Optional: strategy name
  "symbol": "NIFTY",                     // Optional: trading symbol
  "order_id": "A123456"                  // Optional: order ID
}
```

## Filtering Examples

```typescript
// Filter by level
const errors = entries.filter(e => e.level === 'ERROR');

// Filter by strategy
const strategyLogs = entries.filter(e => e.strategy === 'stock_ema_crossover');

// Search in message
const searchResults = entries.filter(e => 
  e.message.toLowerCase().includes('order')
);

// Filter by time range
const recentLogs = entries.filter(e => {
  const ts = new Date(e.ts);
  return ts > new Date('2025-01-14T09:00:00Z');
});
```

## Security Checklist

- ✅ Backend verifies `user_id` matches authenticated user
- ✅ Signed URLs expire after 1 hour
- ✅ Never expose service role key to frontend
- ✅ RLS policies prevent users from seeing other users' logs

## Performance Tips

1. **Pagination**: Limit file list to 50-100 files
2. **Lazy Loading**: Only download log content when file is selected
3. **Virtual Scrolling**: Use for large log files (1000+ entries)
4. **Caching**: Cache signed URLs (they expire in 1 hour)

## Testing

Test your implementation:

```bash
# 1. Query files
curl "http://localhost:8000/api/logs/files?user_id=YOUR_USER_ID"

# 2. Download a log file
curl "SIGNED_URL_FROM_STEP_1"
```

This guide provides everything needed to implement log viewing!
