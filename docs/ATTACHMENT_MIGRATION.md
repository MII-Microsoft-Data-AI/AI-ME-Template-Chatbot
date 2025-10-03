# Attachment Schema Migration - Removed conversation_id

## Overview
Removed `conversation_id` from the attachment system to simplify the architecture. Attachments are now only associated with users, not specific conversations.

## Changes Made

### Backend Changes

#### 1. Database Schema (`lib/database.py`)
**Attachment Model:**
- ✅ Removed `conversation_id` field
- ✅ Added `userid` field
- Structure changed from:
  ```python
  @dataclass
  class Attachment:
      id: str
      conversation_id: str  # REMOVED
      filename: str
      blob_name: str
      created_at: int
  ```
  To:
  ```python
  @dataclass
  class Attachment:
      id: str
      userid: str  # ADDED
      filename: str
      blob_name: str
      created_at: int
  ```

**Database Table:**
- Changed table schema from `conversation_id` to `userid`
- Updated indexes:
  - Removed: `idx_attachments_conversation_id`
  - Added: `idx_attachments_userid`

**Database Methods:**
- ✅ Updated `create_attachment()` - now takes `userid` instead of `conversation_id`
- ✅ Updated `get_attachment()` - returns userid in response
- ✅ Removed `get_conversation_attachments()` - no longer needed
- ✅ Added `get_user_attachments()` - get all attachments for a user

#### 2. Blob Storage Path (`lib/blob.py`)
Changed blob naming convention:
- **Old:** `attachments/{userid}/{conversation_id}/{attachment_id}_{filename}`
- **New:** `attachments/{userid}/{attachment_id}_{filename}`

#### 3. API Routes (`routes/attachment.py`)
**Upload Endpoint (POST `/api/v1/attachments/`):**
- ✅ Removed `conversation_id` from Form parameters
- ✅ Only requires `file` in form data
- ✅ Uses `userid` from header for blob path

**Response Model:**
- Changed `AttachmentDetailResponse` from `conversation_id` to `userid`

**Endpoints:**
- ✅ Removed: `GET /conversation/{conversation_id}` 
- ✅ Added: `GET /user` - Get all attachments for current user

### Frontend Changes

#### 1. VisionImageAdapter (`src/lib/integration/client/chat-conversation.ts`)
- ✅ Removed `getConversationIdFromUrl()` method - no longer needed
- ✅ Simplified `send()` method - doesn't append conversation_id to FormData
- ✅ Cleaner upload flow - just file upload, no URL parsing

**Before:**
```typescript
const conversationId = this.getConversationIdFromUrl();
const formData = new FormData();
formData.append('file', attachment.file);
formData.append('conversation_id', conversationId);
```

**After:**
```typescript
const formData = new FormData();
formData.append('file', attachment.file);
```

### Documentation Updates

#### 1. Backend API Docs (`docs/ATTACHMENT_API.md`)
- ✅ Updated all endpoints to reflect new schema
- ✅ Updated database schema documentation
- ✅ Updated blob storage path examples
- ✅ Updated code examples (Python, cURL)
- ✅ Changed endpoint from `/conversation/{id}` to `/user`

#### 2. Frontend Integration Docs (`docs/FRONTEND_ATTACHMENT_INTEGRATION.md`)
- ✅ Removed URL extraction section
- ✅ Updated flow diagrams
- ✅ Updated security considerations
- ✅ Updated testing instructions

### Migration

#### Migration Script (`migrate_attachments.py`)
Created a database migration script that:
1. Creates a backup of the database
2. Drops old attachments table
3. Creates new table with `userid` field
4. Migrates existing data (extracts userid from blob_name)
5. Recreates indexes
6. Cleans up

**To run migration:**
```bash
cd mock-backend
python migrate_attachments.py
```

## Benefits of This Change

1. **Simpler Architecture** - No need to track conversation context during upload
2. **Easier Frontend Integration** - No URL parsing required
3. **User-Centric** - Attachments belong to users, not conversations
4. **Cleaner Blob Structure** - Shorter, simpler paths in Azure storage
5. **Better Performance** - Faster queries with userid index

## API Usage Changes

### Before
```bash
curl -X POST http://localhost:8000/api/v1/attachments/ \
  -H "userid: user123" \
  -u apiuser:securepass123 \
  -F "file=@image.jpg" \
  -F "conversation_id=conv_456"  # REQUIRED BEFORE
```

### After
```bash
curl -X POST http://localhost:8000/api/v1/attachments/ \
  -H "userid: user123" \
  -u apiuser:securepass123 \
  -F "file=@image.jpg"  # conversation_id removed
```

## Blob Storage Changes

### Before
```
attachments/
  └── user123/
      └── conv_456/
          └── abc-def-123_image.jpg
```

### After
```
attachments/
  └── user123/
      └── abc-def-123_image.jpg
```

## Breaking Changes

⚠️ **This is a breaking change for existing code:**

1. **API Clients** must remove `conversation_id` from upload requests
2. **Database** must be migrated using the migration script
3. **Frontend** must update to remove conversation_id logic
4. **Existing attachments** will have their userid extracted from blob_name path

## Rollback Plan

If needed, restore from the backup created by the migration script:
```bash
# Backup is created as: mock.db.backup.YYYYMMDD_HHMMSS
cp mock.db.backup.20250103_120000 mock.db
```

## Testing Checklist

- [ ] Run migration script on development database
- [ ] Test file upload without conversation_id
- [ ] Verify files are stored in new path structure
- [ ] Test GET /api/v1/attachments/{id} endpoint
- [ ] Test GET /api/v1/attachments/user endpoint
- [ ] Test DELETE /api/v1/attachments/{id} endpoint
- [ ] Verify frontend can upload images
- [ ] Check that `file://{id}` URLs work correctly
- [ ] Verify existing attachments still accessible (if migrated)

## Files Modified

### Backend
- ✅ `mock-backend/lib/database.py`
- ✅ `mock-backend/routes/attachment.py`
- ✅ `mock-backend/docs/ATTACHMENT_API.md`

### Frontend
- ✅ `src/lib/integration/client/chat-conversation.ts`
- ✅ `docs/FRONTEND_ATTACHMENT_INTEGRATION.md`

### New Files
- ✅ `mock-backend/migrate_attachments.py` (migration script)
- ✅ `docs/ATTACHMENT_MIGRATION.md` (this document)

## Next Steps

1. Run the migration script on your development database
2. Test the new upload flow
3. Deploy to staging environment
4. Test thoroughly in staging
5. Run migration on production database
6. Deploy to production
7. Monitor for any issues

## Questions?

If you encounter any issues:
1. Check the backup file was created
2. Review migration script logs
3. Verify userid extraction worked correctly
4. Test with new file uploads first
5. Contact development team if needed
