# Attachment API Documentation

## Overview
The Attachment API provides endpoints for uploading, retrieving, and managing file attachments in conversations. Files are stored in Azure Blob Storage with metadata tracked in SQLite.

## Endpoints

### 1. Upload Attachment
**POST** `/api/v1/attachments/`

Upload a file attachment.

**Headers:**
- `userid` (required): User ID
- `Authorization`: Basic auth credentials

**Request:**
- Content-Type: `multipart/form-data`
- Form Fields:
  - `file`: File to upload (required)

**Response:**
```json
{
  "url": "file://{attachment_id}",
  "filename": "example.pdf",
  "message": "Attachment uploaded successfully"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (missing userid or invalid auth)
- `500`: Server error

---

### 2. Get Attachment by ID
**GET** `/api/v1/attachments/{attachment_id}`

Retrieve attachment details and a temporary download URL with SAS token (valid for 1 hour).

**Headers:**
- `userid` (required): User ID
- `Authorization`: Basic auth credentials

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "example.pdf",
  "blob_url": "https://storage.blob.core.windows.net/...?sas_token",
  "userid": "user_123"
}
```

**Status Codes:**
- `200`: Success
- `404`: Attachment not found
- `401`: Unauthorized
- `500`: Server error

---

### 3. Delete Attachment
**DELETE** `/api/v1/attachments/{attachment_id}`

Delete an attachment from both blob storage and database.

**Headers:**
- `userid` (required): User ID
- `Authorization`: Basic auth credentials

**Response:**
```json
{
  "message": "Attachment deleted successfully",
  "attachment_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Status Codes:**
- `200`: Success
- `404`: Attachment not found
- `401`: Unauthorized
- `500`: Server error

---

### 4. Get User Attachments
**GET** `/api/v1/attachments/user`

Get all attachments for the current user.

**Headers:**
- `userid` (required): User ID
- `Authorization`: Basic auth credentials

**Response:**
```json
{
  "userid": "user_123",
  "attachments": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "filename": "example.pdf",
      "created_at": 1696320000,
      "url": "file://123e4567-e89b-12d3-a456-426614174000"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

## Database Schema

### Attachments Table
```sql
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    userid TEXT NOT NULL,
    filename TEXT NOT NULL,
    blob_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
)
```

**Indexes:**
- `idx_attachments_userid` on `userid`
- `idx_attachments_created_at` on `created_at DESC`

---

## Blob Storage Structure

Files are stored in Azure Blob Storage with the following naming convention:
```
attachments/{userid}/{attachment_id}_{filename}
```

Example:
```
attachments/user123/789e-4567-e89b-12d3-a456_{original_filename.pdf}
```

---

## Implementation Details

### File Upload Flow
1. Client uploads file
2. Server generates unique `attachment_id`
3. File uploaded to Azure Blob Storage with structured path
4. Metadata stored in SQLite database
5. Returns `file://{attachment_id}` URL to client

### File Retrieval Flow
1. Client requests attachment by ID
2. Server queries database for blob name
3. Generates SAS token with 1-hour expiry
4. Returns temporary download URL

### Security
- All endpoints require Basic Authentication
- `userid` header required for user isolation
- SAS tokens expire after 1 hour
- File paths include userid to prevent unauthorized access

---

## Environment Variables Required

```env
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=...
BACKEND_AUTH_USERNAME=...
BACKEND_AUTH_PASSWORD=...
```

---

## Usage Example

### Python Client
```python
import requests
from requests.auth import HTTPBasicAuth

# Upload attachment
files = {'file': open('document.pdf', 'rb')}
headers = {'userid': 'user123'}
auth = HTTPBasicAuth('apiuser', 'securepass123')

response = requests.post(
    'http://localhost:8000/api/v1/attachments/',
    files=files,
    headers=headers,
    auth=auth
)

print(response.json())
# Output: {"url": "file://123e4567-...", "filename": "document.pdf", ...}

# Get attachment details
attachment_id = response.json()['url'].replace('file://', '')
response = requests.get(
    f'http://localhost:8000/api/v1/attachments/{attachment_id}',
    headers={'userid': 'user123'},
    auth=auth
)

print(response.json())
# Output: {"id": "123e4567-...", "blob_url": "https://...", ...}
```

### cURL
```bash
# Upload
curl -X POST http://localhost:8000/api/v1/attachments/ \
  -H "userid: user123" \
  -u apiuser:securepass123 \
  -F "file=@document.pdf"

# Get by ID
curl -X GET http://localhost:8000/api/v1/attachments/{attachment_id} \
  -H "userid: user123" \
  -u apiuser:securepass123
```
