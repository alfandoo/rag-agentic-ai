import pytest
from backend.src.tools.vector_store import ResearchVectorStore, chunk_text, get_topic_collection_name
from backend.src.tools.search import TriSearchEngine


def test_topic_collection_name_determinism():
    name1 = get_topic_collection_name("Cursor vs GitHub Copilot")
    name2 = get_topic_collection_name("  cursor VS github copilot  ")
    assert name1 == name2
    assert name1.startswith("rag_")
    assert 3 <= len(name1) <= 63


def test_chunk_text():
    sample = (
        "Paragraph 1: Cursor is an AI-first code editor.\n\n"
        "Paragraph 2: It integrates Claude and GPT-4 directly into the editor.\n\n"
        "Paragraph 3: Pricing starts with a free hobby tier and $20 pro tier."
    )
    chunks = chunk_text(sample, chunk_size=100, chunk_overlap=20)
    assert len(chunks) >= 2
    assert "Cursor is an AI-first" in chunks[0]


def test_chroma_vector_store_and_deduplication():
    store = ResearchVectorStore(in_memory=True, topic="Cursor vs Copilot Test")
    store.clear()
    
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
    count_after_first = store.collection.count()

    # Upserting identical document should deduplicate and not double the collection count
    store.add_scraped_document(
        url="https://cursor.com/pricing",
        text=doc_text,
        competitor="Cursor",
        dimension="pricing_model",
        title="Cursor Pricing"
    )
    assert store.collection.count() == count_after_first

    # Another instance initialized with the same topic shares the in-memory index (like Follow-Up Chat)
    chat_store = ResearchVectorStore(in_memory=True, topic="Cursor vs Copilot Test")
    results = chat_store.query("How much does Cursor cost?", n_results=1)
    assert len(results) == 1
    assert "Cursor Pro costs $20" in results[0]["content"]
    assert results[0]["metadata"]["competitor"] == "Cursor"
    assert results[0]["metadata"]["dimension"] == "pricing_model"


def test_smart_vector_cache_hit_and_reconstruction():
    store = ResearchVectorStore(in_memory=True, topic="Supabase vs Firebase Test")
    store.clear()

    store.add_scraped_document(
        url="https://supabase.com/pricing",
        text="Supabase offers a free tier with 500MB database and Pro tier at $25/month with 8GB storage.",
        competitor="Supabase",
        dimension="pricing_model",
        title="Supabase Official Pricing",
        source_engine="tavily"
    )

    facts, citations = store.get_cached_evidence(
        competitor="Supabase",
        dimension="pricing_model",
        query_text="Supabase pricing tiers cost",
        n_results=2
    )

    assert len(facts) >= 1
    assert "Supabase offers a free tier" in facts[0]
    assert len(citations) >= 1
    assert citations[0]["url"] == "https://supabase.com/pricing"
    assert citations[0]["competitor"] == "Supabase"
    assert citations[0]["dimension"] == "pricing_model"
    assert citations[0]["source_engine"] == "tavily"

    # Cache miss for different dimension or competitor
    empty_facts, empty_cits = store.get_cached_evidence(
        competitor="Supabase",
        dimension="user_sentiment",
        query_text="user sentiment reviews"
    )
    assert empty_facts == []
    assert empty_cits == []


def test_duckduckgo_fallback_search():
    engine = TriSearchEngine()
    citations, text = engine._search_duckduckgo("LangChain Python", max_results=2)
    assert isinstance(citations, list)
    assert isinstance(text, str)
    if citations:
        assert citations[0].source_engine == "duckduckgo"
        assert citations[0].url.startswith("http")
