import logging
from typing import Optional
import urllib.request
import urllib.error
import trafilatura
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def scrape_url_clean_text(url: str, timeout: int = 10) -> Optional[str]:
    """
    Scrapes a web page and extracts clean, readable text without ads,
    navigation headers, cookies, or footer boilerplate.

    Primary: trafilatura (best-in-class text extraction for NLP/LLMs)
    Fallback: BeautifulSoup text extraction
    """
    if not url or not url.startswith(("http://", "https://")):
        return None

    try:
        # Step 1: Fetch raw HTML using trafilatura
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            extracted = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=True,
                no_fallback=False
            )
            if extracted and len(extracted.strip()) > 100:
                return extracted.strip()

        # Step 2: Fallback with standard urllib & BeautifulSoup
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            html = response.read().decode("utf-8", errors="ignore")

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        return text if len(text) > 100 else None

    except Exception as exc:
        logger.warning(f"Failed to scrape URL '{url}': {exc}")
        return None
