export type Language = "en" | "id";

export interface Translations {
  navbar: {
    title: string;
    version: string;
    live: string;
    audited: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  input: {
    placeholder: string;
    loops: string;
    buttonIdle: string;
    buttonRunning: string;
    presetsLabel: string;
  };
  pipeline: {
    title: string;
    completed: string;
    stepPrefix: string;
    confidence: string;
    loopPrefix: string;
    traceTitle: string;
    eventsCount: string;
    emptyTrace: string;
    stages: {
      planner: { label: string; role: string };
      researcher: { label: string; role: string };
      fact_checker: { label: string; role: string };
      writer: { label: string; role: string };
    };
  };
  report: {
    badge: string;
    copySummary: string;
    copiedSummary: string;
    exportMarkdown: string;
    tabs: {
      overview: string;
      matrix: string;
      swot: string;
      sources: string;
    };
    sections: {
      executiveSummary: string;
      marketOverview: string;
      competitorProfiles: string;
      strategicRecommendations: string;
      featureMatrix: string;
      pricingMatrix: string;
      swotTitle: string;
      sourcesTitle: string;
      sourcesSubtitle: string;
      pricingModel: string;
      pros: string;
      cons: string;
    };
  };
  chat: {
    header: string;
    subtitle: string;
    placeholder: string;
    send: string;
    suggestionsLabel: string;
    suggestions: string[];
    waiting: string;
  };
  footer: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    navbar: {
      title: "StratAgent",
      version: "v1.0 • research-engine",
      live: "FastAPI SSE",
      audited: "Fact-Audited"
    },
    hero: {
      title: "Market Intelligence Engine",
      subtitle: "Autonomous multi-agent research with self-correcting feedback loops, Tri-Search grounding, and verified SWOT synthesis."
    },
    input: {
      placeholder: "Search competitor, market sector, or product comparison...",
      loops: "Loops:",
      buttonIdle: "Research",
      buttonRunning: "Running",
      presetsLabel: "Presets:"
    },
    pipeline: {
      title: "Agent Pipeline:",
      completed: "Execution Completed",
      stepPrefix: "Step:",
      confidence: "Confidence:",
      loopPrefix: "Loop",
      traceTitle: "Execution Trace Log",
      eventsCount: "events",
      emptyTrace: "Awaiting pipeline execution...",
      stages: {
        planner: { label: "Planner", role: "Formulating dimensions" },
        researcher: { label: "Researcher", role: "Tri-Search & ChromaDB" },
        fact_checker: { label: "Fact-Checker", role: "Auditing & Confidence score" },
        writer: { label: "Synthesizer", role: "Executive dossier compilation" }
      }
    },
    report: {
      badge: "Audited Intelligence Dossier",
      copySummary: "Copy Summary",
      copiedSummary: "Copied Summary",
      exportMarkdown: "Export .MD",
      tabs: {
        overview: "Executive Summary",
        matrix: "Comparison Matrices",
        swot: "SWOT Analysis",
        sources: "Sources"
      },
      sections: {
        executiveSummary: "1. Executive Summary",
        marketOverview: "2. Market Overview & Sector Dynamics",
        competitorProfiles: "3. Competitor Deep-Dives",
        strategicRecommendations: "4. Strategic Recommendations",
        featureMatrix: "Feature Comparison Matrix",
        pricingMatrix: "Pricing & Subscription Matrix",
        swotTitle: "SWOT Analysis",
        sourcesTitle: "Audited Citations & Grounding Sources",
        sourcesSubtitle: "Factual citations audited during Tri-Search grounding:",
        pricingModel: "Pricing Model:",
        pros: "Pros",
        cons: "Cons"
      }
    },
    chat: {
      header: "Follow-Up Intelligence Chat",
      subtitle: "Ask questions, explore deeper competitor strategies, or probe specific features grounded in the dossier.",
      placeholder: "Ask follow-up question (e.g., 'Compare GoPay vs OVO fees', 'Draft marketing battlecard')...",
      send: "Send",
      suggestionsLabel: "Follow-up Prompts:",
      suggestions: [
        "Compare pricing tiers in more detail",
        "What is the best strategy to beat the market leader?",
        "What are the primary regulatory and compliance risks?"
      ],
      waiting: "Thinking..."
    },
    footer: "StratAgent • LangGraph Multi-Agent Architecture • Production Portfolio"
  },
  id: {
    navbar: {
      title: "StratAgent",
      version: "v1.0 • mesin-riset",
      live: "FastAPI SSE Aktif",
      audited: "Terverifikasi Fakta"
    },
    hero: {
      title: "Mesin Riset Intelijen Pasar",
      subtitle: "Riset multi-agent otonom dengan siklus koreksi diri (self-correcting loops), Tri-Search grounding, dan sintesis analisis SWOT tervalidasi."
    },
    input: {
      placeholder: "Cari kompetitor, sektor pasar, atau perbandingan produk...",
      loops: "Siklus:",
      buttonIdle: "Riset Pasar",
      buttonRunning: "Memproses",
      presetsLabel: "Contoh Topik:"
    },
    pipeline: {
      title: "Alur Eksekusi Agen:",
      completed: "Eksekusi Selesai",
      stepPrefix: "Langkah:",
      confidence: "Tingkat Keyakinan:",
      loopPrefix: "Siklus",
      traceTitle: "Catatan Jejak Eksekusi Agen",
      eventsCount: "catatan",
      emptyTrace: "Menunggu eksekusi riset dimulai...",
      stages: {
        planner: { label: "Perencana", role: "Memetakan dimensi riset" },
        researcher: { label: "Periset", role: "Tri-Search & ChromaDB" },
        fact_checker: { label: "Pemeriksa Fakta", role: "Audit & Skor Validitas" },
        writer: { label: "Penyusun", role: "Sintesis berkas eksekutif" }
      }
    },
    report: {
      badge: "Berkas Intelijen Terverifikasi",
      copySummary: "Salin Ringkasan",
      copiedSummary: "Ringkasan Tersalin",
      exportMarkdown: "Unduh .MD",
      tabs: {
        overview: "Ringkasan Eksekutif",
        matrix: "Matriks Perbandingan",
        swot: "Analisis SWOT",
        sources: "Sumber Terverifikasi"
      },
      sections: {
        executiveSummary: "1. Ringkasan Eksekutif",
        marketOverview: "2. Lanskap Pasar & Dinamika Sektor",
        competitorProfiles: "3. Profil Mendalam Kompetitor",
        strategicRecommendations: "4. Rekomendasi Strategis",
        featureMatrix: "Matriks Perbandingan Fitur",
        pricingMatrix: "Matriks Harga & Model Langganan",
        swotTitle: "Analisis SWOT",
        sourcesTitle: "Sitasi & Sumber Referensi Tervalidasi",
        sourcesSubtitle: "Kutipan faktual yang diaudit selama proses Tri-Search grounding:",
        pricingModel: "Model Harga:",
        pros: "Kelebihan",
        cons: "Kekurangan"
      }
    },
    chat: {
      header: "Chat Lanjutan (Follow-up AI Chatbot)",
      subtitle: "Tanyakan detail lebih lanjut, bandingkan fitur tertentu, atau minta strategi bisnis berdasarkan hasil riset di atas.",
      placeholder: "Tanyakan hal lanjutan (contoh: 'Bandingkan biaya GoPay vs OVO', 'Buatkan strategi pemasaran')...",
      send: "Kirim",
      suggestionsLabel: "Contoh Pertanyaan Lanjutan:",
      suggestions: [
        "Bandingkan model harga dan biaya transaksi lebih detail",
        "Bagaimana strategi terbaik untuk merebut market share?",
        "Apa saja risiko regulasi dan kepatuhan hukumnya?"
      ],
      waiting: "Sedang menganalisis..."
    },
    footer: "StratAgent • Arsitektur Multi-Agent LangGraph • Portofolio AI Engineer"
  }
};
