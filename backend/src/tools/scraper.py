import ipaddress
import logging
import socket
from typing import Optional
import urllib.error
import urllib.parse
import urllib.request
import trafilatura
from bs4 import BeautifulSoup

# Suppress noisy internal parser logs from trafilatura for empty / SPA pages
logging.getLogger("trafilatura").setLevel(logging.CRITICAL)

logger = logging.getLogger(__name__)


def _is_public_url(url: str) -> bool:
    """Rejects non-HTTP URLs and hosts that resolve to private, loopback, or link-local addresses."""
    try:
        parsed = urllib.parse.urlparse(url)
        host = (parsed.hostname or "").strip().lower()
        if parsed.scheme not in ("http", "https") or not host:
            return False
        if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
            return False
        addresses = {info[4][0].split("%")[0] for info in socket.getaddrinfo(host, None)}
    except Exception:
        return False

    if not addresses:
        return False
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False
    return True


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Blocks redirects that leave the public internet."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _is_public_url(newurl):
            raise urllib.error.URLError(f"blocked redirect to non-public URL: {newurl}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def scrape_url_clean_text(url: str, timeout: int = 8) -> Optional[str]:
    """
    Scrapes a web page and extracts clean, readable text without ads,
    navigation headers, cookies, or footer boilerplate.

    Multi-tier strategy:
    1. Fetch HTML with desktop browser User-Agent (avoids bot 403 blocks that return empty bodies).
    2. Extract clean article/body content with trafilatura.
    3. Fallback to BeautifulSoup if trafilatura extraction yields no text.
    """
    if not url or not _is_public_url(url):
        logger.warning(f"Blocked scrape of non-public URL: {url}")
        return None

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    }

    html: Optional[str] = None

    # Step 1: Fetch raw HTML using browser headers (avoids bot blocks)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.build_opener(_SafeRedirectHandler()).open(req, timeout=timeout) as response:
            content_type = response.headers.get("Content-Type", "")
            if not content_type or "text/html" in content_type:
                raw_bytes = response.read(2_000_000)  # Max 2MB buffer
                html = raw_bytes.decode("utf-8", errors="ignore")
    except Exception as exc:
        logger.debug(f"Scrape fetch failed for {url}: {exc}")
        html = None

    # Guard against empty, null, or stub responses
    if not html or len(html.strip()) < 100:
        return None

    # Step 2: High-accuracy extraction using trafilatura
    try:
        extracted = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=True,
            no_fallback=False
        )
        if extracted and len(extracted.strip()) > 100:
            return extracted.strip()
    except Exception:
        pass

    # Step 3: Fallback extraction with BeautifulSoup
    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "svg"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        return text if len(text) > 100 else None
    except Exception as exc:
        logger.debug(f"BeautifulSoup fallback failed for {url}: {exc}")
        return None

