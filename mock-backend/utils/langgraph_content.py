def get_text_from_contents(contents: list[dict]) -> str:
    """Extract text from message contents."""
    if isinstance(contents, list):
        texts = [item['text'] for item in contents if item['type'] == 'text']
        return "\n".join(texts)
    elif isinstance(contents, str):
        return contents
    return ""