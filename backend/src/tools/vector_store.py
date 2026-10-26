import os
import uuid
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.src.config.settings import settings

logger = logging.getLogger(__name__)


def chunk_text(text: str, chunk_size: int = 700, chunk_overlap: int = 100) -> List[str]:
    """
    Splits long text into overlapping chunks for semantic retrieval,
    preserving paragraph and sentence integrity where possible.
    """
    if not text:
        return []
    
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
    ChromaDB-backed Vector Store for in-session RAG.
    Indexes scraped web content to allow targeted sub-question answering
    without overflowing the LLM context window.
    """

    def __init__(self, in_memory: bool = True, collection_name: Optional[str] = None):
        self.collection_name = collection_name or settings.chroma_collection_name
        
        if in_memory:
            self.client = chromadb.EphemeralClient()
        else:
            os.makedirs(settings.chroma_persist_directory, exist_ok=True)
            self.client = chromadb.PersistentClient(path=settings.chroma_persist_directory)

        self.collection = self.client.get_or_create_collection(name=self.collection_name)

    def add_scraped_document(
        self,
        url: str,
        text: str,
        competitor: str,
        dimension: str,
        title: Optional[str] = None
    ) -> int:
        """
        Chunks and indexes scraped text into the Chroma collection.
        Returns the number of chunks added.
        """
        chunks = chunk_text(text)
        if not chunks:
            return 0

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{uuid.uuid4().hex[:8]}_{i}"
            ids.append(chunk_id)
            documents.append(chunk)
            metadatas.append({
                "url": url,
                "title": title or "Scraped Document",
                "competitor": competitor,
                "dimension": dimension,
                "chunk_index": i
            })

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Indexed {len(chunks)} chunks from {url} for {competitor} [{dimension}]")
        return len(chunks)

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
