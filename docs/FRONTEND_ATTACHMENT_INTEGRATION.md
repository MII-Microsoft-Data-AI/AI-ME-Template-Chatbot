# Frontend Attachment Integration

## Overview
The frontend now integrates with the backend attachment API to upload images and other files, returning `file://{id}` URLs that can be used in chat conversations.

## Implementation

### VisionImageAdapter
Located in: `src/lib/integration/client/chat-conversation.ts`

The custom `VisionImageAdapter` class implements the `AttachmentAdapter` interface from `@assistant-ui/react` and handles:

1. **File Validation** - Ensures images don't exceed 20MB
2. **Upload to Backend** - Sends files to `/api/be/api/v1/attachments/`
3. **Returns File URL** - Receives and uses `file://{id}` format from backend

### Key Methods

#### `add({ file }: { file: File })`
- Validates file size (max 20MB)
- Returns a pending attachment with upload status
- Creates unique ID for tracking

#### `send(attachment: PendingAttachment)`
- Uploads file to backend using FormData
- Returns complete attachment with `file://{id}` URL

#### `remove(_attachment: PendingAttachment)`
- Placeholder for cleanup operations
- Can be extended to delete files from backend

### URL Extraction

The adapter no longer requires conversation ID extraction. Files are uploaded directly and associated with the user via the `userid` header.

## API Integration

### Upload Request
```typescript
const formData = new FormData();
formData.append('file', attachment.file);

const response = await fetch(`${BaseAPIPath}/api/v1/attachments/`, {
  method: 'POST',
  body: formData,
});
```

### Backend Response
```json
{
  "url": "file://123e4567-e89b-12d3-a456-426614174000",
  "filename": "example.jpg",
  "message": "Attachment uploaded successfully"
}
```

### Frontend Usage
The returned `file://` URL is stored in the attachment content:
```typescript
{
  id: attachment.id,
  type: "image",
  name: attachment.name,
  contentType: "image/jpeg",
  content: [
    {
      type: "image",
      image: "file://123e4567-...", // Backend URL
    },
  ],
  status: { type: "complete" },
}
```

## Configuration

### Accepted File Types
```typescript
accept = "image/jpeg,image/png,image/webp,image/gif";
```

### File Size Limit
```typescript
const maxSize = 20 * 1024 * 1024; // 20MB
```

### API Endpoint
```typescript
const BaseAPIPath = "/api/be"
// Full path: /api/be/api/v1/attachments/
```

## Error Handling

The adapter includes comprehensive error handling:

```typescript
try {
  // Upload logic
} catch (error) {
  console.error('Error uploading attachment:', error);
  throw error;
}
```

Errors are:
1. Logged to console for debugging
2. Re-thrown to be handled by the UI layer
3. Displayed to the user via the assistant-ui framework

## Usage in Chat Runtime

The adapter is integrated into the chat runtime via `CompositeAttachmentAdapter`:

```typescript
const CompositeAttachmentsAdapter = new CompositeAttachmentAdapter([
  new VisionImageAdapter(),
])

export const FirstChatAPIRuntime = () => useCustomDataStreamRuntime({
  api: `${BaseAPIPath}/chat`,
  adapters: {
    attachments: CompositeAttachmentsAdapter,
  }
})
```

This means:
- All image uploads automatically use the backend API
- Files are stored in Azure Blob Storage
- `file://` URLs are used throughout the application
- Attachments are tracked in the database

## Flow Diagram

```
User selects image
    ↓
VisionImageAdapter.add()
    ↓
Validate file size
    ↓
Create pending attachment
    ↓
VisionImageAdapter.send()
    ↓
Upload to /api/be/api/v1/attachments/
    ↓
Backend stores in Azure Blob Storage
    ↓
Backend returns file://{id}
    ↓
Frontend creates complete attachment
    ↓
Image ready for use in chat
```

## Security Considerations

1. **File Size Validation** - 20MB limit prevents excessive uploads
2. **Type Restriction** - Only accepts specific image formats
3. **Backend Authentication** - All requests go through authenticated endpoints
4. **User Isolation** - Files are organized by user ID

## Future Enhancements

Potential improvements:
1. **Progress Tracking** - Show upload progress to users
2. **File Deletion** - Implement `remove()` method to delete files
3. **Multi-file Support** - Support document uploads (PDF, DOCX, etc.)
4. **Retry Logic** - Add automatic retry on upload failure
5. **Optimistic UI** - Show image preview before upload completes
6. **Compression** - Compress large images before upload

## Testing

To test the integration:

1. Navigate to a chat conversation
2. Click the attachment button
3. Select an image (JPG, PNG, WebP, or GIF)
4. Image should upload and return `file://{id}` URL
5. Check browser console for any errors
6. Verify file appears in Azure Blob Storage under `attachments/{userid}/`

### Debug Logs
```javascript
// Check upload progress
console.log('Uploading attachment:', file.filename);

// Check successful upload
console.log('Attachment uploaded successfully:', attachment_id);

// Check for errors
console.error('Error uploading attachment:', error);
```
