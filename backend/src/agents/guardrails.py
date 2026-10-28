import re
from typing import Tuple, Optional, List
from backend.src.tools.language import detect_language


def get_off_topic_refusal(topic: str, language: str = "en") -> str:
    """Returns a polite, professional refusal message for out-of-domain queries."""
    if language == "id":
        return (
            f"Maaf, sebagai asisten intelijen pasar StratAgent, saya hanya dapat menjawab pertanyaan yang berkaitan dengan topik riset pasar **'{topic}'** "
            f"(seperti perbandingan fitur, struktur harga, arsitektur teknis, sentimen pengguna, atau analisis SWOT kompetitor terkait).\n\n"
            f"Pertanyaan Anda berada di luar cakupan riset ini. Silakan ajukan pertanyaan seputar analisis kompetitor atau strategi pasar dari topik tersebut."
        )
    return (
        f"I apologize, but as a StratAgent market intelligence assistant, I can only address questions directly related to the research topic **'{topic}'** "
        f"(such as feature comparisons, pricing structures, technical architecture, user sentiment, or competitor SWOT analysis).\n\n"
        f"Your question is outside the scope of this research dossier. Please ask a question related to this market analysis or the competitors evaluated above."
    )


def get_greeting_reply(topic: str, language: str = "en") -> str:
    """Returns a welcoming message redirecting the user back to the active research topic."""
    if language == "id":
        return (
            f"Halo! Saya asisten intelijen pasar StratAgent untuk topik riset **'{topic}'**.\n\n"
            f"Ada aspek spesifik yang ingin Anda diskusikan lebih lanjut? Misalnya:\n"
            f"• Rincian paket harga dan biaya lisensi/penggunaan\n"
            f"• Analisis kelemahan atau keluhan pengguna terhadap kompetitor tertentu\n"
            f"• Rekomendasi taktik bisnis untuk memenangkan pangsa pasar"
        )
    return (
        f"Hello! I am your StratAgent market intelligence assistant for the research topic **'{topic}'**.\n\n"
        f"What specific area would you like to explore further? For example:\n"
        f"• Detailed pricing tiers and subscription/usage fee breakdown\n"
        f"• Critical weaknesses or user complaints regarding a specific competitor\n"
        f"• Strategic recommendations to capture competitive market share"
    )


def get_jailbreak_refusal(topic: str, language: str = "en") -> str:
    """Returns a firm refusal for prompt injection or role alteration attempts."""
    if language == "id":
        return (
            f"Maaf, sebagai asisten intelijen pasar StratAgent, saya beroperasi dengan batas keamanan ketat "
            f"dan tidak dapat mengubah peran, mengabaikan instruksi, atau keluar dari konteks topik riset **'{topic}'**."
        )
    return (
        f"I apologize, but as a StratAgent market intelligence assistant, I operate under strict safety guardrails "
        f"and cannot alter my role, ignore instructions, or deviate from the research topic **'{topic}'**."
    )


# Compiled regular expressions for fast, deterministic detection
GREETINGS_PATTERN = re.compile(
    r"^(halo|hi|hello|hai|hei|hey|pagi|siang|sore|malam|selamat pagi|selamat siang|selamat sore|selamat malam|good morning|good afternoon|good evening|wassup|yo)[\s\!\.\?]*$",
    re.IGNORECASE
)

JAILBREAK_PATTERN = re.compile(
    r"(ignore\s+(previous|all)\s+instructions|abaikan\s+(instruksi|semua|aturan)|"
    r"lupakan\s+(instruksi|aturan|semua)|dan\s+mode|jailbreak|developer\s+mode|"
    r"act\s+as\s+a\s+(chef|cook|poet|comedian|hacker|pirate)|"
    r"berperanlah\s+sebagai|kamu\s+sekarang\s+adalah\s+(koki|penyair|komedian))",
    re.IGNORECASE
)

OFF_TOPIC_RECIPE_PATTERN = re.compile(
    r"\b(resep|cara\s+memasak|bumbu|membuat\s+(kue|bolu|rendang|nasi\s+goreng|mie|martabak|bakso)|"
    r"recipe|recipes|how\s+to\s+cook|ingredients|bake\s+a\s+cake)\b",
    re.IGNORECASE
)

OFF_TOPIC_POLITICS_PATTERN = re.compile(
    r"\b(siapa\s+presiden|who\s+is\s+the\s+president|perdana\s+menteri|pilpres|pemilu\s+202|partai\s+politik|"
    r"ibu\s+kota\s+indonesia|capital\s+of\s+france|cuaca\s+hari\s+ini|weather\s+today)\b",
    re.IGNORECASE
)

OFF_TOPIC_CREATIVE_PATTERN = re.compile(
    r"\b(puisi|syair|dongeng|lelucon|joke|jokes|cerita\s+(fiksi|lucu|dongeng)|"
    r"(buatkan|tuliskan|ceritakan|tulis)\s+(puisi|cerita|dongeng|lelucon)|"
    r"write\s+(a\s+)?(poem|story|song|joke)|tell\s+(me\s+)?a\s+joke|lirik\s+lagu)\b",
    re.IGNORECASE
)

OFF_TOPIC_GAMES_PATTERN = re.compile(
    r"\b(game\s+ular|snake\s+game|game\s+tictactoe|flappy\s+bird|game\s+tebak\s+angka|"
    r"solusi\s+leetcode|download\s+video\s+youtube)\b",
    re.IGNORECASE
)

OFF_TOPIC_SPORTS_PATTERN = re.compile(
    r"\b(juara\s+piala\s+dunia|liga\s+champions|chelsea|manchester\s+united|real\s+madrid|barcelona|skor\s+bola)\b",
    re.IGNORECASE
)

RAW_MATH_PATTERN = re.compile(r"^[\d\s\+\-\*\/\^\(\)\=\?\.\,]+$")


def check_topic_guardrail(
    topic: str,
    query: str,
    language: str = "en",
    competitor_names: Optional[List[str]] = None
) -> Tuple[bool, Optional[str]]:
    """
    Tier 1 Guardrail: Evaluates whether a user's follow-up chat question is within
    the market research topic domain or violates guardrail boundaries (off-topic, jailbreak, trivia).
    Returns (is_allowed, direct_response).
    """
    if not query or not query.strip():
        return False, get_greeting_reply(topic, language)

    cleaned = query.strip()
    # Resolve effective language from prompt query semantics or fallback to specified language
    effective_lang = detect_language(cleaned, fallback_language=language)

    # 1. Jailbreak & Prompt Injection Defense
    if JAILBREAK_PATTERN.search(cleaned):
        return False, get_jailbreak_refusal(topic, effective_lang)

    # 2. Friendly Greeting Interception (Welcome + Contextual Guidance)
    if GREETINGS_PATTERN.match(cleaned):
        return False, get_greeting_reply(topic, effective_lang)

    # 3. Raw Math Expression (e.g., "100 * 45", "50 + 20 = ?")
    if RAW_MATH_PATTERN.match(cleaned) and len(cleaned) < 50:
        return False, get_off_topic_refusal(topic, effective_lang)

    # 4. Recipes / Cooking
    if OFF_TOPIC_RECIPE_PATTERN.search(cleaned):
        return False, get_off_topic_refusal(topic, effective_lang)

    # 5. General Politics / Non-market Trivia
    if OFF_TOPIC_POLITICS_PATTERN.search(cleaned):
        return False, get_off_topic_refusal(topic, effective_lang)

    # 6. Creative Writing / Poetry / Fiction / Jokes
    if OFF_TOPIC_CREATIVE_PATTERN.search(cleaned):
        return False, get_off_topic_refusal(topic, effective_lang)

    # 7. Generic Toys / Games / Non-market Scripts
    if OFF_TOPIC_GAMES_PATTERN.search(cleaned):
        return False, get_off_topic_refusal(topic, effective_lang)

    # 8. Sports & Football Trivia
    if OFF_TOPIC_SPORTS_PATTERN.search(cleaned):
        return False, get_off_topic_refusal(topic, effective_lang)

    # Passed Tier 1 checks; let Tier 2 LLM system prompt handle deep contextual nuance
    return True, None
