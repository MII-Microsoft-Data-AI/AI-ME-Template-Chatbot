# Image Processing in LangGraph

## Overview
The system now supports multimodal input with image attachments. Images are uploaded as `file://{id}` URLs and automatically converted to temporary blob URLs with SAS tokens before being sent to the AI model.

## Architecture

### Flow Diagram

```
User uploads image
    ↓
Frontend sends file://{id} in message
    ↓
Message stored in LangGraph state
    ↓
Before AI inference:
    ↓
change_file_to_url() processes messages
    ↓
Finds file://{id} URLs
    ↓
Looks up attachment in database
    ↓
Gets blob_name from attachment
    ↓
Generates temporary SAS URL (1 hour expiry)
    ↓
Replaces file://{id} with blob URL
    ↓
AI receives message with accessible image URL
    ↓
AI processes image and generates response
```

## Implementation Details

### 1. Message Format

**Input Format (from frontend):**
```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "What's in this image?"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "file://abc-def-123-456"
      }
    }
  ]
}
```

**Processed Format (sent to AI):**
```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "What's in this image?"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://storage.blob.core.windows.net/container/blob?sas_token"
      }
    }
  ]
}
```

### 2. Core Function: `change_file_to_url()`

Located in: `mock-backend/lib/langgraph.py`

**Purpose:**
- Inspects all messages in the conversation state
- Identifies `file://{id}` URLs in image_url content
- Converts them to temporary blob URLs with SAS tokens

**Key Features:**
- ✅ Processes all message types (HumanMessage, AIMessage)
- ✅ Handles multimodal content (text + images)
- ✅ Generates 1-hour SAS tokens for secure access
- ✅ Error handling with fallback to original URL
- ✅ Preserves message structure and metadata

**Usage:**
```python
from lib.langgraph import change_file_to_url

# Before sending to AI
messages = change_file_to_url(messages)
```

### 3. Integration in Agent Graph

Located in: `mock-backend/agent/graph.py`

**Processing Order:**
1. **Trim messages** - Fit within token limit
2. **Sanitize messages** - Ensure proper tool call/response pairing
3. **Convert file URLs** - Replace file:// with blob URLs ← NEW
4. **Add system prompt** - Inject instructions
5. **Send to AI** - Model processes with accessible images

**Code:**
```python
def call_model(state: AgentState, config = None) -> Dict[str, List[BaseMessage]]:
    messages = state["messages"]
    
    # Existing processing
    messages = trim_messages(...)
    messages = sanitize_and_validate_messages(messages)
    
    # NEW: Convert file:// URLs to blob URLs
    messages = change_file_to_url(messages)
    
    # Continue with model invocation
    system_msg = SystemMessage(content=system_prompt)
    messages = [system_msg] + messages
    model_with_tools = model.bind_tools(AVAILABLE_TOOLS)
    response = model_with_tools.invoke(messages)
    
    return {"messages": [response]}
```

## Functions Reference

### `change_file_to_url(messages: List[BaseMessage]) -> List[BaseMessage]`

Main function that processes all messages.

**Parameters:**
- `messages`: List of BaseMessage objects from conversation state

**Returns:**
- List of BaseMessage objects with converted URLs

**Example:**
```python
messages = [
    HumanMessage(content=[
        {"type": "text", "text": "What's this?"},
        {"type": "image_url", "image_url": {"url": "file://abc-123"}}
    ])
]

processed = change_file_to_url(messages)
# Image URL is now: https://storage.blob.core.windows.net/...?sas_token
```

---

### `process_human_message(message: HumanMessage) -> HumanMessage`

Processes HumanMessage objects.

**Features:**
- Handles string content (no images)
- Handles list content (multimodal)
- Preserves message metadata
- Creates new message instance (immutable)

---

### `process_ai_message(message: AIMessage) -> AIMessage`

Processes AIMessage objects.

**Note:** AI messages typically don't have file:// URLs, but this ensures completeness.

---

### `process_image_url_item(item: dict) -> dict`

Core logic for converting a single image_url item.

**Process:**
1. Check if URL starts with `file://`
2. Extract attachment ID
3. Query database for attachment
4. Get blob_name from attachment
5. Generate temporary SAS URL
6. Return updated item

**Error Handling:**
- Attachment not found → logs warning, returns original
- Database error → logs error, returns original
- Blob storage error → logs error, returns original

---

### `extract_file_ids_from_messages(messages: List[BaseMessage]) -> List[str]`

Utility function to extract all file IDs from messages.

**Usage:**
```python
file_ids = extract_file_ids_from_messages(messages)
print(f"Found {len(file_ids)} images: {file_ids}")
```

**Use Cases:**
- Debugging
- Tracking image usage
- Preloading attachments
- Validating message content

## Security Considerations

1. **SAS Token Expiry**
   - Default: 1 hour
   - Configurable via `expiry` parameter
   - Tokens auto-expire for security

2. **Access Control**
   - Only authenticated users can upload
   - userid isolation in blob storage
   - Database validates attachment ownership

3. **URL Privacy**
   - `file://{id}` hides blob path
   - SAS tokens are temporary
   - No direct blob access without token

## Error Handling

### Attachment Not Found
```python
# Logs warning and keeps original URL
print(f"Warning: Attachment not found for ID: {attachment_id}")
return item  # Original item with file:// URL
```

### Blob Storage Error
```python
# Catches exception and keeps original
try:
    blob_url = get_file_temporary_link(blob_name)
except Exception as e:
    print(f"Error generating blob URL: {e}")
    return item  # Original item
```

### Malformed Content
```python
# Graceful handling of unexpected formats
if not isinstance(content, list):
    return message  # Return as-is
```

## Performance Considerations

1. **Database Queries**
   - One query per unique file:// URL
   - Indexed by attachment ID (fast lookup)
   - Cached in conversation state

2. **SAS Token Generation**
   - Fast operation (milliseconds)
   - No network calls
   - Cryptographic signing only

3. **Message Processing**
   - Linear scan through messages
   - Only processes multimodal content
   - Minimal overhead for text-only conversations

## Testing

### Unit Test Example
```python
from lib.langgraph import change_file_to_url
from langchain_core.messages import HumanMessage

def test_file_url_conversion():
    # Setup
    message = HumanMessage(content=[
        {"type": "text", "text": "Test"},
        {"type": "image_url", "image_url": {"url": "file://test-id"}}
    ])
    
    # Execute
    result = change_file_to_url([message])
    
    # Verify
    image_url = result[0].content[1]["image_url"]["url"]
    assert image_url.startswith("https://")
    assert "?" in image_url  # Has SAS token
```

### Integration Test
```python
def test_full_conversation_flow():
    # 1. Upload image via API
    response = upload_attachment(file=image_file)
    file_url = response["url"]  # file://{id}
    
    # 2. Send message with image
    message = {
        "content": [
            {"type": "text", "text": "Describe this image"},
            {"type": "image_url", "image_url": {"url": file_url}}
        ]
    }
    
    # 3. Process through graph
    result = graph.invoke({"messages": [HumanMessage(**message)]})
    
    # 4. Verify AI received blob URL
    assert "https://" in processed_url
```

## Troubleshooting

### Issue: AI can't access image

**Symptoms:**
- AI returns "I can't see the image"
- Vision model error

**Solutions:**
1. Check SAS token expiry (default 1 hour)
2. Verify blob exists in storage
3. Check network connectivity to Azure
4. Verify blob permissions

### Issue: file:// URL not converted

**Symptoms:**
- AI receives file:// instead of blob URL
- Image not displayed

**Solutions:**
1. Check attachment exists in database
2. Verify `change_file_to_url()` is called
3. Check function integration in graph
4. Review error logs

### Issue: Database query slow

**Symptoms:**
- Long response times with images
- Timeout errors

**Solutions:**
1. Check database index on attachment ID
2. Monitor query performance
3. Consider caching frequently used attachments
4. Optimize database connection pool

## Future Enhancements

1. **Caching**
   - Cache SAS URLs for repeated requests
   - Reduce database queries
   - Improve performance

2. **Batch Processing**
   - Generate multiple SAS tokens in parallel
   - Optimize for multiple images
   - Reduce processing time

3. **URL Validation**
   - Pre-validate blob existence
   - Check SAS token validity
   - Fail fast on invalid URLs

4. **Monitoring**
   - Track image usage metrics
   - Monitor SAS token generation
   - Alert on errors

5. **Multiple Formats**
   - Support video URLs
   - Support audio URLs
   - Support document URLs

## Related Documentation

- [Attachment API](../mock-backend/docs/ATTACHMENT_API.md)
- [Frontend Integration](./FRONTEND_ATTACHMENT_INTEGRATION.md)
- [Attachment Migration](./ATTACHMENT_MIGRATION.md)
- [LangGraph Streaming Protocol](./LANGGRAPH_STREAMING_PROTOCOL.md)
