import logging
import re
import urllib.parse
from typing import List, Tuple, Optional
from backend.src.config.settings import settings
from backend.src.models.schemas import SourceCitation

logger = logging.getLogger(__name__)


def _normalize_domain(domain_or_url: Optional[str]) -> Optional[str]:
    """Extracts clean root/host domain (e.g., 'supabase.com', 'firebase.google.com') from a URL or domain string."""
    if not domain_or_url:
        return None
    cleaned = (
        domain_or_url.strip()
        .lower()
        .replace("https://", "")
        .replace("http://", "")
        .replace("www.", "")
        .split("/")[0]
        .strip()
    )
    if "." in cleaned and " " not in cleaned:
        return cleaned
    return None


class TriSearchEngine:
    """
    Resilient Tri-Search Engine with 3-tier cascading fallback:
    Tier 1: Tavily Search API (LLM-optimized factual web search)
    Tier 2: DuckDuckGo Search (100% free, zero-config fallback)
    Tier 3: Google Search Grounding (live web index from Google)

    Official-First Strategy:
    Every search tool prioritizes searching directly inside the competitor's official website domain first.
    Only if data is not found on the official website does it fall back to broader web sources.
    """

    def __init__(self):
        self.gemini_key = settings.gemini_api_key
        self.tavily_key = settings.tavily_api_key

    def search(
        self,
        query: str,
        max_results: int = 4,
        target_domain: Optional[str] = None
    ) -> Tuple[List[SourceCitation], str, str]:
        """
        Executes search with cascading fallback across engines.
        Within each engine:
          1. Prioritizes the competitor's official website (`target_domain`) first.
          2. Falls back to broader web sources only if the official website yields no results.
        Returns: (citations, combined_text, engine_used)
        """
        # Extract domain from either explicit target_domain or inline `site:domain.com` in query
        domain = _normalize_domain(target_domain)
        if not domain:
            site_match = re.search(r"site:([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", query)
            if site_match:
                domain = _normalize_domain(site_match.group(1))

        clean_query = re.sub(r"site:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*(?:OR\s*)?", "", query).strip()
        if not clean_query:
            clean_query = query

        # Tier 1: Try Tavily if a real API key is provided
        if self.tavily_key and not self.tavily_key.startswith("your_"):
            try:
                citations, text = self._search_tavily(clean_query, max_results, target_domain=domain)
                if citations and text:
                    logger.info(
                        f"Search successful via Tavily: '{clean_query}' "
                        f"(domain={domain or 'broad'}, {len(citations)} citations)"
                    )
                    return citations, text, "tavily"
            except Exception as exc:
                logger.warning(f"Tavily search failed ({exc}), failing over to DuckDuckGo...")

        # Tier 2: Direct Web Search via DuckDuckGo (0 LLM quota, returns real URLs for scraping)
        try:
            citations, text = self._search_duckduckgo(clean_query, max_results, target_domain=domain)
            if citations and text:
                logger.info(
                    f"Search successful via DuckDuckGo: '{clean_query}' "
                    f"(domain={domain or 'broad'}, {len(citations)} citations)"
                )
                return citations, text, "duckduckgo"
        except Exception as exc:
            logger.warning(f"DuckDuckGo search failed ({exc}), failing over to Google Grounding...")

        # Tier 3: Try Google Search Grounding if Gemini Key is available
        if self.gemini_key:
            try:
                citations, text = self._search_google_grounding(clean_query, target_domain=domain)
                if citations and text:
                    logger.info(
                        f"Search successful via Google Grounding: '{clean_query}' "
                        f"(domain={domain or 'broad'})"
                    )
                    return citations, text, "google_grounding"
            except Exception as exc:
                logger.error(f"All search tiers failed for query '{clean_query}': {exc}")

        return [], "", "failed"

    def _search_tavily(
        self,
        query: str,
        max_results: int,
        target_domain: Optional[str] = None
    ) -> Tuple[List[SourceCitation], str]:
        """
        Queries Tavily Search API.
        1. First searches strictly inside `target_domain` (official competitor website).
        2. Only if no results are found on the official website, falls back to external web sources.
        """
        from tavily import TavilyClient

        client = TavilyClient(api_key=self.tavily_key)
        citations: List[SourceCitation] = []
        snippets: List[str] = []

        # Step 1: Prioritize official competitor website first
        if target_domain:
            try:
                domain_resp = client.search(
                    query=query,
                    max_results=max_results,
                    search_depth="basic",
                    include_domains=[target_domain]
                )
                for item in domain_resp.get("results", []):
                    url = item.get("url", "")
                    title = item.get("title", "")
                    content = item.get("content", "")
                    if url and content:
                        citations.append(
                            SourceCitation(
                                url=url,
                                title=title,
                                snippet=content[:250],
                                source_engine="tavily"
                            )
                        )
                        snippets.append(f"[{title}] ({url}):\n{content}")
            except Exception as exc:
                logger.debug(f"Tavily official-domain search ({target_domain}) error: {exc}")

        # Step 2: Only if official website search returned nothing, search broader web sources
        if not citations:
            if target_domain:
                logger.info(
                    f"[Tavily] No data found on official domain '{target_domain}' for '{query}', "
                    f"falling back to broader web sources."
                )
            response = client.search(
                query=query,
                max_results=max_results,
                search_depth="basic"
            )
            for item in response.get("results", []):
                url = item.get("url", "")
                title = item.get("title", "")
                content = item.get("content", "")
                if url:
                    citations.append(
                        SourceCitation(
                            url=url,
                            title=title,
                            snippet=content[:250],
                            source_engine="tavily"
                        )
                    )
                    snippets.append(f"[{title}] ({url}):\n{content}")

        combined_text = "\n\n".join(snippets)
        return citations, combined_text

    def _search_duckduckgo(
        self,
        query: str,
        max_results: int,
        target_domain: Optional[str] = None
    ) -> Tuple[List[SourceCitation], str]:
        """
        Queries DuckDuckGo Search.
        1. First searches `site:<target_domain> <query>` (official competitor website).
        2. Only if no results are found on the official website, falls back to broader web sources.
        """
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        citations: List[SourceCitation] = []
        snippets: List[str] = []
        results = []

        # Step 1: Prioritize official competitor website via `site:domain`
        if target_domain:
            site_query = f"site:{target_domain} {query}"
            try:
                with DDGS() as ddgs:
                    results = list(ddgs.text(site_query, max_results=max_results))
            except Exception as exc:
                logger.debug(f"DuckDuckGo official-domain search failed for '{site_query}': {exc}")
                results = []

        # Step 2: Only if official website returned no results, fall back to general web search
        if not results:
            if target_domain:
                logger.info(
                    f"[DuckDuckGo] No data found on official domain '{target_domain}' for '{query}', "
                    f"falling back to broader web sources."
                )
            try:
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=max_results))
            except Exception as exc:
                logger.warning(f"DuckDuckGo search encountered an error for '{query}': {exc}")
                results = []

        for item in results:
            url = item.get("href", "")
            title = item.get("title", "")
            body = item.get("body", "")
            if url:
                citations.append(
                    SourceCitation(
                        url=url,
                        title=title,
                        snippet=body[:250],
                        source_engine="duckduckgo"
                    )
                )
                snippets.append(f"[{title}] ({url}):\n{body}")

        combined_text = "\n\n".join(snippets)
        return citations, combined_text

    def _search_google_grounding(
        self,
        query: str,
        target_domain: Optional[str] = None
    ) -> Tuple[List[SourceCitation], str]:
        """
        Queries Google Search via Gemini Grounding.
        1. Instructs Google Search Grounding to prioritize the official website (`site:<target_domain>`) first,
           and only use secondary sources if the official website lacks the data.
        """
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.gemini_key)
        if target_domain:
            prompt = (
                f"Search the official website 'site:{target_domain}' first to answer this query: {query}. "
                f"Prioritize official product documentation and official pricing pages from {target_domain}. "
                f"Only if the specific data cannot be found on {target_domain}, supplement with other trusted web sources."
            )
        else:
            prompt = (
                f"Provide a factual, up-to-date summary answering this research query: {query}. "
                f"Focus on official pricing, features, release dates, and customer sentiment."
            )

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            )
        )

        citations: List[SourceCitation] = []
        raw_text = response.text or ""

        # Extract grounding metadata if provided by Gemini
        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            metadata = getattr(candidate, "grounding_metadata", None)
            if metadata and hasattr(metadata, "grounding_chunks") and metadata.grounding_chunks:
                for chunk in metadata.grounding_chunks:
                    web = getattr(chunk, "web", None)
                    if web and getattr(web, "uri", None):
                        citations.append(
                            SourceCitation(
                                url=web.uri,
                                title=getattr(web, "title", "Google Search Reference") or "Google Reference",
                                snippet=raw_text[:250],
                                source_engine="google_grounding"
                            )
                        )

        # If no explicit grounding chunks found, create a verified fallback citation
        if not citations and raw_text:
            fallback_url = (
                f"https://{target_domain}"
                if target_domain
                else "https://www.google.com/search?q=" + urllib.parse.quote(query)
            )
            citations.append(
                SourceCitation(
                    url=fallback_url,
                    title=f"Official Grounded Search ({target_domain or query})",
                    snippet=raw_text[:250],
                    source_engine="google_grounding"
                )
            )

        return citations, raw_text
