import json

def safe_str(result):
    """
    Safely convert a result to a string.
    Handles DataFrames, Series, and other types.
    """
    try:
        if hasattr(result, 'to_dict'):  # DataFrame or Series
            return json.dumps(result.to_dict(), default=str)
        return str(result)
    except Exception:
        return str(result)