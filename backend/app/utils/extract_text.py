def extract_text(content) -> str:
    """Handles both plain string and Gemini's list-of-blocks content format."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") for block in content if isinstance(block, dict)
        )
    return str(content)