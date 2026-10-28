import logging
import re
from typing import Optional, Set

logger = logging.getLogger(__name__)

# Core Indonesian function words, pronouns, questions, and domain terms
INDONESIAN_WORDS: Set[str] = {
    # Pronouns & determiners
    "saya", "aku", "kamu", "anda", "dia", "ia", "mereka", "kita", "kami",
    "ini", "itu", "tersebut", "begini", "begitu",
    # Question words
    "apa", "apakah", "siapa", "bagaimana", "mengapa", "kenapa", "kapan", "dimana", "mana", "berapa",
    # Prepositions & conjunctions
    "dan", "atau", "yang", "di", "ke", "dari", "pada", "untuk", "dengan", "adalah", "yaitu", "ialah",
    "karena", "sebab", "sehingga", "maka", "jika", "kalau", "apabila", "bila", "supaya", "agar",
    "antara", "tentang", "seperti", "oleh", "kepada", "terhadap", "dalam", "luar", "atas", "bawah",
    "serta", "tetapi", "tapi", "melainkan", "sedangkan", "padahal", "meskipun", "walaupun",
    # Adverbs, auxiliaries & modals
    "bisa", "dapat", "tidak", "tak", "bukan", "belum", "sudah", "telah", "sedang", "akan", "hendak",
    "hanya", "saja", "juga", "masih", "lebih", "paling", "sangat", "amat", "sekali", "cukup",
    "harus", "wajib", "mesti", "perlu", "boleh", "mungkin", "pasti", "tentu", "selalu", "sering",
    # Market research & analytical vocabulary
    "bandingkan", "perbandingan", "kelebihan", "kekurangan", "keunggulan", "kelemahan",
    "fitur", "harga", "biaya", "tarif", "pasar", "analisis", "analisa", "kompetitor", "pesaing",
    "produk", "ulasan", "rekomendasi", "terbaik", "peluang", "ancaman", "kekuatan",
    "ringkasan", "laporan", "riset", "solusi", "pengguna", "konsumen", "pelanggan",
    "layanan", "arsitektur", "teknis", "skema", "paket", "gratis", "langganan",
    "strategi", "bisnis", "potensi", "perkembangan", "pertumbuhan", "tren", "evaluasi",
    "tantangan", "manfaat", "fungsi", "kapabilitas", "keamanan", "performa", "kinerja",
    # Common conversational & guardrail markers
    "halo", "hai", "selamat", "pagi", "siang", "sore", "malam", "terima", "kasih", "makasih",
    "tolong", "bantu", "mohon", "silakan", "coba", "jelaskan", "sebutkan", "tuliskan",
    "resep", "masak", "kue", "makanan", "puisi", "cerita", "dongeng", "lelucon", "presiden"
}

# Core English function words, pronouns, questions, and domain terms
ENGLISH_WORDS: Set[str] = {
    # Pronouns & determiners
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "their", "our", "its", "this", "that", "these", "those",
    # Question words
    "what", "which", "who", "whom", "whose", "how", "why", "where", "when",
    # Prepositions & conjunctions
    "and", "or", "the", "a", "an", "of", "in", "to", "for", "with", "on", "at", "from", "by",
    "about", "as", "into", "like", "through", "after", "over", "between", "out", "against",
    "during", "without", "before", "under", "around", "among", "since", "until", "while",
    # Verbs, auxiliaries & modals
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
    "do", "does", "did", "doing", "can", "could", "will", "would", "shall", "should",
    "may", "might", "must", "not", "no", "nor", "if", "so", "than", "too", "very", "just",
    # Market research & analytical vocabulary
    "compare", "comparison", "comparing", "features", "feature", "pricing", "prices", "price",
    "cost", "costs", "market", "analysis", "analytics", "competitor", "competitors", "competition",
    "product", "products", "review", "reviews", "recommendation", "recommendations",
    "strengths", "weaknesses", "opportunities", "threats", "overview", "summary", "report",
    "research", "solution", "solutions", "users", "user", "sentiment", "architecture",
    "technical", "stack", "developer", "experience", "benchmark", "benchmarks", "tiers",
    "strategy", "business", "growth", "trends", "evaluation", "capabilities", "security",
    "performance", "free", "tier", "subscription", "enterprise", "scalability", "latency",
    # Common conversational & guardrail markers
    "hello", "hi", "hey", "good", "morning", "afternoon", "evening", "thanks", "thank",
    "please", "help", "explain", "describe", "elaborate", "recipe", "cook", "bake", "poem", "story"
}


def detect_language(text: str, fallback_language: str = "en") -> str:
    """
    Intelligently detects whether the given prompt or question is in Indonesian ('id')
    or English ('en').

    Decision Hierarchy:
    1. If the text contains distinct Indonesian keywords/stop-words, returns 'id'.
    2. If the text contains distinct English keywords/stop-words, returns 'en'.
    3. If the text is purely neutral/proper-nouns (e.g. 'Supabase vs Neon'), falls back
       to fallback_language (which represents the UI language selected by the user).
    """
    if not text or not text.strip():
        return "id" if fallback_language.lower() == "id" else "en"

    normalized_fallback = "id" if fallback_language.lower() == "id" else "en"
    cleaned = text.lower().strip()

    # Tokenize words (stripping punctuation)
    tokens = re.findall(r"\b[a-zA-Z\xc0-\xff\-]+\b", cleaned)
    if not tokens:
        return normalized_fallback

    id_score = sum(1 for w in tokens if w in INDONESIAN_WORDS)
    en_score = sum(1 for w in tokens if w in ENGLISH_WORDS)

    # Secondary check: Indonesian morphological affixes (ber-, ter-, me-, pe-, -kan, -nya)
    for w in tokens:
        if len(w) >= 6:
            if w.endswith("kan") or w.endswith("nya") or w.endswith("lah"):
                id_score += 1
            if w.startswith("ber") or w.startswith("meng") or w.startswith("mem") or w.startswith("per"):
                id_score += 1
        if len(w) >= 6:
            if w.endswith("ing") or w.endswith("tion") or w.endswith("able") or w.endswith("ness"):
                en_score += 1

    if id_score > en_score:
        logger.debug(f"[Language Detector] Detected 'id' (id_score={id_score}, en_score={en_score}) for '{text[:60]}'")
        return "id"
    elif en_score > id_score:
        logger.debug(f"[Language Detector] Detected 'en' (id_score={id_score}, en_score={en_score}) for '{text[:60]}'")
        return "en"

    # Neutral or zero-word signal (e.g. "Supabase vs Neon", "Cursor vs Windsurf")
    logger.debug(
        f"[Language Detector] Neutral prompt (id_score={id_score}, en_score={en_score}). "
        f"Falling back to user UI language: '{normalized_fallback}' for '{text[:60]}'"
    )
    return normalized_fallback
