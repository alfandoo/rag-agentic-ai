import logging
from typing import List, Tuple, Optional
from backend.src.config.settings import settings
from backend.src.models.schemas import SourceCitation

logger = logging.getLogger(__name__)


class TriSearchEngine:
    """
    Resilient Tri-Search Engine with 3-tier cascading fallback:
    Tier 1: Google Search Grounding (live web index from Google)
    Tier 2: Tavily Search API (LLM-optimized factual web search)
    Tier 3: DuckDuckGo Search (100% free, zero-config fallback)
    """

    def __init__(self):
        self.gemini_key = settings.gemini_api_key
        self.tavily_key = settings.tavily_api_key

    def search(self, query: str, max_results: int = 4) -> Tuple[List[SourceCitation], str, str]:
        """
        Executes search with cascading fallback.
        Returns: (citations, combined_text, engine_used)
        """
        # Tier 1: Try Google Search Grounding if Gemini Key is available
        if self.gemini_key:
            try:
                citations, text = self._search_google_grounding(query)
                if citations and text:
                    logger.info(f"Search successful via Google Grounding: '{query}'")
                    return citations, text, "google_grounding"
            except Exception as exc:
                logger.warning(f"Google Grounding search failed ({exc}), failing over to Tavily...")

        # Tier 2: Try Tavily if API key is provided
        if self.tavily_key:
            try:
                citations, text = self._search_tavily(query, max_results)
                if citations and text:
                    logger.info(f"Search successful via Tavily: '{query}'")
                    return citations, text, "tavily"
            except Exception as exc:
                logger.warning(f"Tavily search failed ({exc}), failing over to DuckDuckGo...")

        # Tier 3: Zero-dependency DuckDuckGo fallback
        try:
            citations, text = self._search_duckduckgo(query, max_results)
            logger.info(f"Search successful via DuckDuckGo fallback: '{query}'")
            return citations, text, "duckduckgo"
        except Exception as exc:
            logger.error(f"All search tiers failed for query '{query}': {exc}")
            return [], "", "failed"

    def _search_google_grounding(self, query: str) -> Tuple[List[SourceCitation], str]:
        """Queries Google Search via Gemini Grounding."""
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.gemini_key)
        prompt = (
            f"Provide a factual, up-to-date factual summary answering this research query: {query}. "
            f"Focus on pricing, official features, release dates, and customer sentiment."
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
            citations.append(
                SourceCitation(
                    url="https://www.google.com/search?q=" + urllib.parse.quote(query),
                    title=f"Google Grounded Search: {query}",
                    snippet=raw_text[:250],
                    source_engine="google_grounding"
                )
            )

        return citations, raw_text

    def _search_tavily(self, query: str, max_results: int) -> Tuple[List[SourceCitation], str]:
        """Queries Tavily Search API."""
        from tavily import TavilyClient

        client = TavilyClient(api_key=self.tavily_key)
        response = client.search(query=query, max_results=max_results, search_depth="basic")

        citations: List[SourceCitation] = []
        snippets: List[str] = []

        for item in response.get("results", []):
            url = item.get("url", "")
            title = item.get("title", "")
            content = item.get("content", "")
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

    def _search_duckduckgo(self, query: str, max_results: int) -> Tuple[List[SourceCitation], str]:
        """Queries DuckDuckGo Search without needing any API key."""
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        citations: List[SourceCitation] = []
        snippets: List[str] = []

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))

        for item in results:
            url = item.get("href", "")
            title = item.get("title", "")
            body = item.get("body", "")
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


# Import urllib.parse for Google query quoting
import urllib.parse
