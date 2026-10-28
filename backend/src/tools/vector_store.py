import os
import re
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from backend.src.config.settings import settings

logger = logging.getLogger(__name__)

# Shared process-wide ChromaDB clients so connections are reused safely across threads
_SHARED_EPHEMERAL_CLIENT: Optional[Any] = None
_SHARED_PERSISTENT_CLIENT: Optional[Any] = None


def get_topic_collection_name(topic: str) -> str:
    """
    Generates a deterministic, ChromaDB-compliant collection name (3-63 chars, alphanumeric/underscore)
    for a given research topic so that multi-loop iterations and follow-up RAG chat share the same index.
    """
    cleaned = (topic or "default").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "_", cleaned).strip("_")[:32]
    if not slug:
        slug = "market_topic"
    digest = hashlib.md5(cleaned.encode("utf-8")).hexdigest()[:8]
    return f"rag_{slug}_{digest}"


def chunk_text(text: str, chunk_size: int = 700, chunk_overlap: int = 100) -> List[str]:
    """
    Splits long text into overlapping chunks for semantic retrieval,
    preserving paragraph and sentence integrity where possible.
    """
    if not text:
        return []

    # Guard against a zero/negative step in the character-window loop below
    chunk_overlap = max(0, min(chunk_overlap, chunk_size - 1))
    paragraphs = text.split("\n\n")
    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        cleaned_para = para.strip()
        if not cleaned_para:
            continue

        if len(current_chunk) + len(cleaned_para) < chunk_size:
            current_chunk += ("\n\n" + cleaned_para if current_chunk else cleaned_para)
        else:
            if current_chunk:
                chunks.append(current_chunk)
            
            # If paragraph itself is excessively large, split by character window
            if len(cleaned_para) > chunk_size:
                start = 0
                while start < len(cleaned_para):
                    end = start + chunk_size
                    chunks.append(cleaned_para[start:end])
                    start += (chunk_size - chunk_overlap)
                current_chunk = ""
            else:
                current_chunk = cleaned_para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


class ResearchVectorStore:
    """
    ChromaDB-backed Vector Store for in-session and cross-turn RAG.
    Indexes scraped web content to allow targeted sub-question answering
    and grounded follow-up chat without overflowing the LLM context window.
    """

    def __init__(self, in_memory: bool = False, collection_name: Optional[str] = None, topic: Optional[str] = None):
        global _SHARED_EPHEMERAL_CLIENT, _SHARED_PERSISTENT_CLIENT
        self.in_memory = in_memory
        if topic and not collection_name:
            self.collection_name = get_topic_collection_name(topic)
        else:
            self.collection_name = collection_name or settings.chroma_collection_name
        
        if in_memory:
            if _SHARED_EPHEMERAL_CLIENT is None:
                _SHARED_EPHEMERAL_CLIENT = chromadb.EphemeralClient()
            self.client = _SHARED_EPHEMERAL_CLIENT
        else:
            if _SHARED_PERSISTENT_CLIENT is None:
                os.makedirs(settings.chroma_persist_directory, exist_ok=True)
                _SHARED_PERSISTENT_CLIENT = chromadb.PersistentClient(path=settings.chroma_persist_directory)
                logger.info(f"Initialized persistent ChromaDB storage at: {os.path.abspath(settings.chroma_persist_directory)}")
            self.client = _SHARED_PERSISTENT_CLIENT

        self.collection = self.client.get_or_create_collection(name=self.collection_name)

    def add_scraped_document(
        self,
        url: str,
        text: str,
        competitor: str,
        dimension: str,
        title: Optional[str] = None,
        source_engine: str = "tavily"
    ) -> int:
        """
        Chunks and upserts scraped text into the Chroma collection with content-hash deduplication.
        Returns the number of unique chunks indexed.
        """
        chunks = chunk_text(text)
        if not chunks:
            return 0

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        seen_ids = set()
        valid_engine = source_engine if source_engine in ("google_grounding", "tavily", "duckduckgo") else "tavily"

        for i, chunk in enumerate(chunks):
            content_hash = hashlib.md5(f"{url}:{chunk}".encode("utf-8")).hexdigest()[:16]
            chunk_id = f"chk_{content_hash}"
            if chunk_id in seen_ids:
                continue
            seen_ids.add(chunk_id)

            ids.append(chunk_id)
            documents.append(chunk)
            metadatas.append({
                "url": url,
                "title": title or "Scraped Document",
                "competitor": competitor,
                "dimension": dimension,
                "source_engine": valid_engine,
                "chunk_index": i
            })

        if ids:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"Indexed {len(ids)} unique chunks from {url} for {competitor} [{dimension}]")
        return len(ids)

    def get_cached_evidence(
        self,
        competitor: str,
        dimension: str,
        query_text: str,
        n_results: int = 3
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Smart Vector Cache lookup: checks if the current topic collection already holds verified
        chunks for (competitor, dimension). Cross-topic reuse is intentionally disabled because
        pricing and sentiment go stale. Returns (cached_facts, cached_citation_dicts) or ([], []).
        """
        where_filter: Dict[str, Any] = {
            "$and": [
                {"competitor": competitor},
                {"dimension": dimension}
            ]
        }

        matched_docs: List[str] = []
        matched_metas: List[Dict[str, Any]] = []

        try:
            if self.collection.count() > 0:
                existing = self.collection.get(where=where_filter)
                matched_docs = existing.get("documents") or []
                matched_metas = existing.get("metadatas") or []
        except Exception as exc:
            logger.warning(f"[Smart Vector Cache] Lookup error for {competitor} [{dimension}]: {exc}")
            return [], []

        if not matched_docs:
            return [], []

        ranked_chunks = self.query(
            query_text=query_text,
            n_results=min(n_results, len(matched_docs)),
            where_filter=where_filter
        )
        facts: List[str] = [
            chunk["content"][:750]
            for chunk in ranked_chunks
            if chunk.get("content")
        ]
        if not facts:
            facts = [doc[:750] for doc in matched_docs[:n_results] if doc]

        citations: List[Dict[str, Any]] = []
        seen_urls = set()
        for doc, meta in zip(matched_docs, matched_metas):
            meta_dict = meta or {}
            url = meta_dict.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            raw_engine = meta_dict.get("source_engine", "tavily")
            valid_engine = raw_engine if raw_engine in ("google_grounding", "tavily", "duckduckgo") else "tavily"
            citations.append({
                "url": url,
                "title": meta_dict.get("title") or "Cached Document",
                "snippet": (doc or "")[:320],
                "source_engine": valid_engine,
                "competitor": competitor,
                "dimension": dimension
            })

        return (facts, citations) if (facts and citations) else ([], [])

    def query(
        self,
        query_text: str,
        n_results: int = 3,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Semantic similarity search across indexed competitor documents.
        """
        if self.collection.count() == 0:
            return []

        # Ensure n_results does not exceed total documents
        safe_n = min(n_results, self.collection.count())
        
        kwargs: Dict[str, Any] = {
            "query_texts": [query_text],
            "n_results": safe_n
        }
        if where_filter:
            kwargs["where"] = where_filter

        results = self.collection.query(**kwargs)

        extracted: List[Dict[str, Any]] = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else [{}] * len(docs)
            distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)

            for doc, meta, dist in zip(docs, metas, distances):
                extracted.append({
                    "content": doc,
                    "metadata": meta,
                    "distance": dist
                })

        return extracted

    def clear(self) -> None:
        """Clears all records in the collection."""
        try:
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.get_or_create_collection(name=self.collection_name)
        except Exception as exc:
            logger.warning(f"Error resetting collection: {exc}")
