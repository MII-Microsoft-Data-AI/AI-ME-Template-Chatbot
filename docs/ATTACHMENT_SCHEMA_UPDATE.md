# Attachment Schema Update - Type and Metadata Support

## Overview
Updated the attachment schema to support `type` (file type/MIME type) and `metadata` (JSON-based flexible data storage) fields for enhanced attachment management and information tracking.

## Database Schema Changes

### New Columns in `attachments` table:

```sql
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    userid TEXT NOT NULL,
    filename TEXT NOT NULL,
    blob_name TEXT NOT NULL,
    type TEXT NOT NULL,              -- NEW: File type/MIME type
    metadata TEXT,                   -- NEW: JSON metadata (stored as TEXT, parsed as JSON)
    created_at INTEGER NOT NULL
)
```

### Column Details:

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | Unique attachment identifier | PRIMARY KEY |
| `userid` | TEXT | User ID | NOT NULL |
| `filename` | TEXT | Original filename | NOT NULL |
| `blob_name` | TEXT | Azure Blob Storage path | NOT NULL |
| `type` | TEXT | File type/MIME type | NEW, defaults to "unknown" |
| `metadata` | TEXT | JSON metadata (JSONB equivalent) | NEW, optional, NULL if not set |
| `created_at` | INTEGER | Unix timestamp | NOT NULL |

## Backend Changes

### Python Models Updated

#### Attachment Dataclass
```python
@dataclass
class Attachment:
    id: str
    userid: str
    filename: str
    blob_name: str
    type: str                                    # NEW
    created_at: int
    metadata: Optional[Dict[str, Any]] = None   # NEW
```

### Database Manager Methods

#### New Methods:
- **`create_attachment(..., attachment_type, metadata)`** - Now accepts type and metadata
- **`update_attachment_metadata(attachment_id, metadata)`** - Update metadata only
- **`update_attachment_type(attachment_id, type)`** - Update type only

#### Updated Methods:
- **`get_attachment()`** - Now returns type and metadata fields
- **`get_user_attachments()`** - Now returns type and metadata for all attachments

### API Response Models

#### AttachmentUploadResponse
```python
class AttachmentUploadResponse(BaseModel):
    url: str                              # file://{id}
    filename: str
    message: str
    type: str = "unknown"               # NEW
    metadata: Optional[Dict[str, Any]] = None  # NEW
```

#### AttachmentDetailResponse
```python
class AttachmentDetailResponse(BaseModel):
    id: str
    filename: str
    blob_url: str
    userid: str
    type: str                            # NEW
    metadata: Optional[Dict[str, Any]] = None  # NEW
```

## API Endpoints

### POST `/api/v1/attachments/` - Upload Attachment
**Request:**
- File upload with multipart form data
- `Content-Type` header is automatically captured as file type

**Response:**
```json
{
  "url": "file://550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "message": "Attachment uploaded successfully",
  "type": "application/pdf",
  "metadata": null
}
```

### GET `/api/v1/attachments/` - Get All User Attachments
**Response:**
```json
{
  "userid": "user123",
  "count": 3,
  "attachments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "document.pdf",
      "created_at": 1731553600,
      "type": "application/pdf",
      "metadata": {
        "pages": 10,
        "language": "en"
      },
      "url": "file://550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

### GET `/api/v1/attachments/{attachment_id}` - Get Attachment Details
**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "blob_url": "https://...",
  "userid": "user123",
  "type": "application/pdf",
  "metadata": {
    "pages": 10,
    "language": "en"
  }
}
```

### PATCH `/api/v1/attachments/{attachment_id}/metadata` - Update Metadata (NEW)
**Request:**
```json
{
  "pages": 15,
  "language": "en",
  "tags": ["important", "contract"],
  "custom_field": "any value"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "blob_url": "https://...",
  "userid": "user123",
  "type": "application/pdf",
  "metadata": {
    "pages": 15,
    "language": "en",
    "tags": ["important", "contract"],
    "custom_field": "any value"
  },
  "created_at": 1731553600,
  "message": "Metadata updated successfully"
}
```

### GET `/api/v1/attachments/user` - Get User Attachments
Same as `/api/v1/attachments/` endpoint.

### DELETE `/api/v1/attachments/{attachment_id}` - Delete Attachment
(No changes to this endpoint)

## Frontend Integration

### TypeScript Types Updated

```typescript
export interface Attachment {
  id: string
  filename: string
  created_at: number
  url: string
  type?: string              // NEW
  metadata?: Record<string, any>  // NEW
}
```

### Usage Examples

#### Get attachment with type and metadata
```typescript
const attachment = await AttachmentAPI.getAttachment(attachmentId)
console.log(attachment.type)      // "application/pdf"
console.log(attachment.metadata)  // { pages: 10, language: "en" }
```

#### Update attachment metadata
```typescript
const response = await fetch(`/api/be/api/v1/attachments/${id}/metadata`, {
  method: 'PATCH',
  body: JSON.stringify({
    pages: 15,
    tags: ['important'],
    custom_data: { key: 'value' }
  })
})
const updated = await response.json()
```

## Migration from Existing Data

### Backward Compatibility
- Existing attachments can continue to work without type and metadata
- Type defaults to `"unknown"` for existing records
- Metadata is optional (NULL if not set)
- Migration script automatically adds columns if missing

### Migration Strategy
```python
# For existing attachments without type:
# - type will be set to "unknown"
# - metadata will be NULL until explicitly set

# To migrate existing data with correct types:
def infer_type_from_filename(filename):
    ext = filename.split('.')[-1].lower()
    mime_types = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        # ... etc
    }
    return mime_types.get(ext, 'application/octet-stream')

# Then update: db_manager.update_attachment_type(id, inferred_type)
```

## JSON Metadata Examples

### Document Attachment
```json
{
  "pages": 42,
  "language": "en",
  "subject": "Contract",
  "indexed": true,
  "word_count": 5320
}
```

### Image Attachment
```json
{
  "width": 1920,
  "height": 1080,
  "format": "jpeg",
  "color_mode": "RGB",
  "taken_at": "2025-11-14T10:30:00Z"
}
```

### Audio/Video Attachment
```json
{
  "duration_seconds": 3600,
  "bitrate": "192k",
  "codec": "mp3",
  "channels": 2,
  "sample_rate": 44100
}
```

### Custom Application Metadata
```json
{
  "processing_status": "completed",
  "ai_analysis": {
    "sentiment": "positive",
    "entities": ["John", "Document"],
    "classification": "contract"
  },
  "user_tags": ["important", "client-review"],
  "version": 2,
  "revision_history": [
    { "user": "user1", "timestamp": 1731553600 },
    { "user": "user2", "timestamp": 1731553700 }
  ]
}
```

## SQL Migration Script

For existing databases without the new columns:

```sql
-- Add columns if they don't exist
ALTER TABLE attachments ADD COLUMN type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE attachments ADD COLUMN metadata TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(type);
```

## Benefits

1. **Content Classification** - Easily categorize attachments by MIME type
2. **Flexible Metadata Storage** - Store any JSON-compatible data without schema changes
3. **Enhanced Search & Filter** - Query by type, and search within metadata
4. **Audit Trail** - Store processing history, user actions, AI analysis
5. **Extensibility** - Add custom fields without database migration
6. **Backward Compatible** - Existing code continues to work

## Performance Considerations

- Type field is indexed for efficient filtering
- Metadata is stored as TEXT (JSON) - keep payloads under 64KB for optimal performance
- Consider indexing specific metadata fields if doing frequent queries on them
- JSON parsing happens on-demand in Python (not expensive for typical sizes)

## Security Notes

- Metadata is user-editable - validate and sanitize input
- MIME types are determined by upload client - verify on server if security-critical
- Metadata size is not currently limited - implement validation if needed
- Consider encryption for sensitive metadata if needed

## Future Enhancements

- JSONB indexing for more efficient metadata queries
- Metadata validation schema (JSON Schema support)
- Metadata encryption support
- Automated metadata extraction (e.g., extract PDF properties)
- Metadata versioning/history tracking
