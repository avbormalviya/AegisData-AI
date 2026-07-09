import re
import requests
import urllib.parse
from html import unescape
from langchain_core.tools import tool

@tool
def web_search_tool(query: str) -> str:
    """Use this tool to search the web for up-to-date information, news, general knowledge,
    or details not present in the local database or uploaded files.
    
    Args:
        query: The search query to run.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        r = requests.post(
            'https://lite.duckduckgo.com/lite/',
            data={'q': query},
            headers=headers,
            timeout=10
        )
        if r.status_code != 200:
            return f"Error: Web search returned status code {r.status_code}"
            
        html_content = r.text
        
        # Extract <a> tags
        a_tags = re.findall(r'<a\s+[^>]*>.*?</a>', html_content, re.DOTALL)
        links = []
        for tag in a_tags:
            if "class='result-link'" in tag or 'class="result-link"' in tag:
                href_match = re.search(r'href=["\']([^"\']+)["\']', tag)
                if href_match:
                    href = href_match.group(1)
                    text = re.sub(r'<[^>]+>', '', tag)
                    text = unescape(text.strip())
                    links.append((href, text))
                    
        # Extract snippets
        td_tags = re.findall(r'<td[^>]+class=["\']result-snippet["\'][^>]*>(.*?)</td>', html_content, re.DOTALL)
        snippets = []
        for td in td_tags:
            text = re.sub(r'<[^>]+>', '', td)
            text = unescape(text.strip())
            snippets.append(text)
            
        results = []
        for i in range(min(len(links), len(snippets))):
            href, title = links[i]
            snippet = snippets[i]
            
            # Resolve redirect url if needed
            if 'uddg=' in href:
                parsed = urllib.parse.urlparse(href)
                queries = urllib.parse.parse_qs(parsed.query)
                if 'uddg' in queries:
                    href = queries['uddg'][0]
                    
            results.append({
                'title': title,
                'url': href,
                'snippet': snippet
            })
            
        if not results:
            return "No search results found on the web."
            
        # Format results as a readable markdown string
        output_lines = [f"Search results for: '{query}':\n"]
        for idx, res in enumerate(results[:5]):
            output_lines.append(f"[{idx+1}] {res['title']}")
            output_lines.append(f"    URL: {res['url']}")
            output_lines.append(f"    Snippet: {res['snippet']}\n")
            
        return "\n".join(output_lines)
        
    except Exception as e:
        return f"Error executing web search: {str(e)}"
