import pytest
from backend.src.tools.vector_store import ResearchVectorStore, chunk_text
from backend.src.tools.search import TriSearchEngine


def test_chunk_text():
    sample = (
        "Paragraph 1: Cursor is an AI-first code editor.\n\n"
        "Paragraph 2: It integrates Claude and GPT-4 directly into the editor.\n\n"
        "Paragraph 3: Pricing starts with a free hobby tier and $20 pro tier."
    )
    chunks = chunk_text(sample, chunk_size=100, chunk_overlap=20)
    assert len(chunks) >= 2
    assert "Cursor is an AI-first" in chunks[0]


def test_chroma_vector_store():
    # Use ephemeral client for isolated testing
    store = ResearchVectorStore(in_memory=True, collection_name="test_collection")
    
    doc_text = (
        "Cursor Pro costs $20 per month and provides 500 fast requests. "
        "It includes tab completion and codebase indexing. "
        "GitHub Copilot costs $10 per month for individuals."
    )
    
    num_chunks = store.add_scraped_document(
        url="https://cursor.com/pricing",
        text=doc_text,
        competitor="Cursor",
        dimension="pricing_model",
        title="Cursor Pricing"
    )
    assert num_chunks > 0

    # Query for Cursor pricing
    results = store.query("How much does Cursor cost?", n_results=1)
    assert len(results) == 1
    assert "Cursor Pro costs $20" in results[0]["content"]
    assert results[0]["metadata"]["competitor"] == "Cursor"
    assert results[0]["metadata"]["dimension"] == "pricing_model"


def test_duckduckgo_fallback_search():
    engine = TriSearchEngine()
    # Explicitly test duckduckgo search (works without any API key)
    citations, text = engine._search_duckduckgo("LangChain Python", max_results=2)
    assert len(citations) > 0
    assert len(text) > 50
    assert citations[0].source_engine == "duckduckgo"
    assert citations[0].url.startswith("http")
