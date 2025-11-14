
import urllib

def decode_file_attachment(data_url: str) -> dict:
    """Decode base64 data URL to dictionary with mimetype, base64data, filename."""
    if not data_url.startswith("data:"):
        raise ValueError("Invalid data URL format")

    parts = data_url.split(",")
    if len(parts) < 2:
        raise ValueError("Invalid data URL format")

    header = parts[0]
    base64data = parts[1]

    # Parse mimetype from header
    if ":" not in header or ";" not in header.split(":", 1)[1]:
        raise ValueError("Invalid header format")
    mimetype = header.split(":", 1)[1].split(";", 1)[0]

    filename = None
    if len(parts) > 2:
        filename_part = parts[2]
        if filename_part.startswith("filename:"):
            encoded_filename = filename_part[9:]
            filename = urllib.parse.unquote(encoded_filename)

    return {
        "mimetype": mimetype,
        "base64data": base64data,
        "filename": filename
    }

def from_assistant_ui_contents_to_langgraph_contents(message: list[any]) -> dict:
    """Convert an Assistant UI message to a Langgraph message."""
    langgraph_contents = []

    for content in message:
        if content.get("type") == "text":
            langgraph_contents.append({
                "type": "text",
                "text": content.get("text", "")
            })
            continue

        if content.get("type") == "image":
            image_data = content.get("image", "")
            
            # Check the format of the image data
            if image_data.startswith("data:"):
                # Base64 data URL format - decode it
                file_data = decode_file_attachment(image_data)
                langgraph_content = {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{file_data['mimetype']};base64,{file_data['base64data']}",
                    },
                }
            elif image_data.startswith("file://") or image_data.startswith("https://") or image_data.startswith("http://"):
                # file:// or https:// URL format - use directly
                langgraph_content = {
                    "type": "image_url",
                    "image_url": {
                        "url": image_data,
                    },
                }
            else:
                # Unknown format - skip or log warning
                print(f"Warning: Unknown image format: {image_data[:50]}...")
                continue
            
            langgraph_contents.append(langgraph_content)
            continue
    
    return langgraph_contents