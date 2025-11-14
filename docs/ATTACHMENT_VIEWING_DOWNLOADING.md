# Attachment Viewing and Downloading Feature

## Overview
Enhanced the attachments page with full viewing and downloading capabilities. Users can now preview certain file types directly and download any attachment.

## Features Added

### 1. **View Functionality**
- **Supported formats:** PDF, Images (JPG, JPEG, PNG, GIF), and Text files
- **How to use:** 
  - Click on the filename or the eye icon to open the file in a new browser tab
  - Files are loaded with temporary SAS tokens for secure access
  - Browser's native viewer is used for preview

### 2. **Download Functionality**
- **All file types supported:** Any attachment can be downloaded
- **How to use:**
  - Click the download icon (⬇️) on any attachment
  - File downloads with original filename preserved
  - Uses Azure Blob Storage with SAS token for secure temporary access

### 3. **Enhanced UI/UX**
- **View Button:** Blue eye icon - only visible for viewable file types
- **Download Button:** Green download icon - available for all attachments
- **Delete Button:** Red trash icon - existing functionality
- **Loading States:** Spinners show during view/download operations
- **Hover Effects:** Filename becomes clickable for viewable files with color change
- **Tooltips:** Helpful hints on all action buttons

### 4. **User Interactions**
- **Click filename:** If file is viewable, clicking the filename directly opens it
- **Disabled state:** Buttons are disabled during download/view to prevent multiple requests
- **Error handling:** User-friendly alert messages if view/download fails
- **File icons:** Visual indicators for different file types

## Technical Implementation

### State Management
```typescript
interface LoadingStates {
  [key: string]: 'downloading' | 'viewing' | null
}
```

### Key Functions
- **`handleDownload(attachment)`** - Downloads file with proper filename
- **`handleView(attachment)`** - Opens file in new tab
- **`isViewable(filename)`** - Checks if file type is viewable

### Viewable File Types
- `.pdf` - PDF documents
- `.jpg`, `.jpeg` - JPEG images
- `.png` - PNG images
- `.gif` - GIF images
- `.txt` - Text files

### API Integration
Uses `AttachmentAPI.getAttachmentBlobUrl()` to:
- Get temporary SAS token for secure access
- Preserve security with token expiry (1 hour)
- Enable browser to download/display file

## File Structure
```
src/app/attachments/
├── page.tsx (Updated)
├── layout.tsx
└── ... 
```

## Code Changes

### New State Variables
```typescript
const [loadingStates, setLoadingStates] = useState<LoadingStates>({})
```

### New Functions
```typescript
const handleDownload = async (attachment: Attachment) => { ... }
const handleView = async (attachment: Attachment) => { ... }
const isViewable = (filename: string): boolean => { ... }
```

### Updated JSX
- Added conditional rendering for view button (only for viewable types)
- Added download button for all attachments
- Filename is now clickable for viewable files
- Added loading spinners for view/download operations

## Error Handling
- Network errors are caught and displayed as alerts
- Operations fail gracefully without affecting page state
- Users can retry failed operations
- Console logs available for debugging

## Browser Compatibility
- Modern browsers with Blob support
- SAS token-based authentication for Azure
- Window.open() used for new tab opening
- Download API through anchor element

## Security
- All downloads use temporary SAS tokens (1 hour expiry)
- Files are served from Azure Blob Storage
- User ID header validated on backend
- No direct file path exposure to clients

## Performance
- Lazy loading of file URLs (only requested when needed)
- Efficient state updates with React hooks
- Minimal re-renders using proper dependency tracking
- No additional API calls for viewing supported formats

## Future Enhancements
- Inline preview modal instead of new tab
- Image gallery view for multiple images
- File preview for Office documents (DOCX, XLSX)
- Drag-and-drop reordering
- Multi-select operations
- Search/filter functionality
