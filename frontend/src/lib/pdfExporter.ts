import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CompetitorReport } from "@/types";
import { VERIFIED_THRESHOLD } from "@/lib/constants";

/**
 * Strips markdown markup and unsupported unicode emojis to guarantee
 * crisp, artifact-free text in jsPDF standard fonts.
 */
function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/^[#]+\s+/gm, "")
    .replace(/^[*-]\s+/gm, "- ")
    .replace(/[⚠️🚨]/g, "[!]")
    .replace(/[✅✔]/g, "[OK]")
    .replace(/[❌✖]/g, "[X]")
    .replace(/[💡]/g, "[*]")
    .replace(/[👉➡️]/g, ">")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .trim();
}

/**
 * Parses markdown comparison tables (| col1 | col2 |) into structured
 * headers and rows for jspdf-autotable.
 */
function parseMarkdownTable(markdown: string): { head: string[]; body: string[][] } | null {
  if (!markdown) return null;
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 2) return null;

  // Header line
  const headCells = lines[0]
    .split("|")
    .slice(1, -1)
    .map((c) => cleanText(c.trim()));

  // Filter out the separator line (|---|---|)
  const bodyLines = lines.slice(1).filter((l) => !/^[|\-:\s]+$/.test(l));

  const bodyRows = bodyLines.map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => cleanText(c.trim()))
  );

  if (headCells.length === 0 || bodyRows.length === 0) return null;
  return { head: headCells, body: bodyRows };
}

function getLastAutoTableY(pdf: jsPDF): number {
  const state = pdf as unknown as { lastAutoTable?: { finalY: number } };
  return state.lastAutoTable?.finalY ?? 0;
}

interface ExportPdfOptions {
  report: CompetitorReport;
  language: "id" | "en";
  formattedDate: string;
}

/**
 * Generates and directly triggers an instant download of a high-quality,
 * professional executive intelligence dossier in PDF format.
 */
export async function downloadReportPdf({
  report,
  language,
  formattedDate,
}: ExportPdfOptions): Promise<void> {
  const isId = language === "id";
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const maxContentWidth = pageWidth - marginX * 2; // 182mm
  let currentY = 16;

  const score = report.confidence_score !== undefined ? report.confidence_score : VERIFIED_THRESHOLD;
  const isVerified = score >= VERIFIED_THRESHOLD;

  // Helper to ensure enough vertical space before drawing a block
  const ensureSpace = (requiredMm: number) => {
    if (currentY + requiredMm > pageHeight - 20) {
      doc.addPage();
      currentY = 16;
    }
  };

  // Helper for Section Titles
  const drawSectionHeader = (numberStr: string, titleStr: string) => {
    ensureSpace(16);
    currentY += 4;

    // Subtle background pill
    doc.setFillColor(244, 244, 245);
    doc.roundedRect(marginX, currentY - 4.5, maxContentWidth, 8, 1.5, 1.5, "F");

    // Accent left stripe
    doc.setFillColor(16, 185, 129); // emerald
    doc.rect(marginX, currentY - 4.5, 2.5, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(`${numberStr} // ${titleStr.toUpperCase()}`, marginX + 6, currentY + 1);

    currentY += 9;
  };

  // Helper for Sub-headers
  const drawSubHeader = (titleStr: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(titleStr, marginX, currentY);
    currentY += 5;
  };

  // Helper for multi-line body paragraphs
  const drawParagraph = (text: string, fontSize = 9, color = [51, 65, 85]) => {
    if (!text) return;
    const cleaned = cleanText(text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(cleaned, maxContentWidth);
    const blockHeight = lines.length * (fontSize * 0.42);

    ensureSpace(blockHeight + 3);
    doc.text(lines, marginX, currentY);
    currentY += blockHeight + 3;
  };

  // =========================================================================
  // 1. TOP HEADER & BRAND BAR
  // =========================================================================
  doc.setFillColor(9, 9, 11); // dark zinc-950
  doc.rect(0, 0, pageWidth, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // emerald-400
  doc.text("STRATAGENT", marginX, 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text(
    isId
      ? "• INTELIJEN PASAR & AUDIT KOMPETITOR MULTI-AGEN RAG"
      : "• AUTONOMOUS MULTI-AGENT MARKET INTELLIGENCE DOSSIER",
    marginX + 25,
    7.5
  );

  doc.setTextColor(212, 212, 216);
  doc.text(formattedDate, pageWidth - marginX, 7.5, { align: "right" });

  currentY = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(cleanText(report.title), maxContentWidth);
  doc.text(titleLines, marginX, currentY);
  currentY += titleLines.length * 7 + 2;

  // KPI & Verification Badges Bar
  const badgeY = currentY;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, badgeY, maxContentWidth, 12, 2, 2, "FD");

  // Status badge
  if (isVerified) {
    doc.setFillColor(220, 252, 231); // emerald-100
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginX + 3, badgeY + 2.5, 36, 7, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61); // emerald-700
    doc.text(isId ? "[OK] TERVERIFIKASI" : "[OK] VERIFIED", marginX + 6, badgeY + 7);
  } else {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(marginX + 3, badgeY + 2.5, 36, 7, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(isId ? "[!] BUKTI PARSIAL" : "[!] PARTIAL PROOF", marginX + 6, badgeY + 7);
  }

  // Key metrics on badge bar
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const metricText1 = `${isId ? "Tingkat Keyakinan" : "Confidence"}: ${score.toFixed(1)}%`;
  const metricText2 = `${isId ? "Kompetitor" : "Competitors"}: ${report.competitor_profiles.length}`;
  const metricText3 = `${isId ? "Sumber Valid" : "Verified Sources"}: ${report.verified_citations.length} URL`;

  doc.text(metricText1, marginX + 44, badgeY + 7.2);
  doc.text("•", marginX + 90, badgeY + 7.2);
  doc.text(metricText2, marginX + 94, badgeY + 7.2);
  doc.text("•", marginX + 128, badgeY + 7.2);
  doc.text(metricText3, marginX + 132, badgeY + 7.2);

  currentY = badgeY + 16;

  // Audit Critique Warning Box if not verified
  if (!isVerified && report.audit_critique) {
    ensureSpace(18);
    doc.setFillColor(255, 251, 235); // amber-50
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.roundedRect(marginX, currentY, maxContentWidth, 14, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(isId ? "CATATAN AUDIT FACT-CHECKER:" : "FACT-CHECKER AUDIT NOTICE:", marginX + 4, currentY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    const critLines = doc.splitTextToSize(cleanText(report.audit_critique), maxContentWidth - 8);
    doc.text(critLines.slice(0, 2), marginX + 4, currentY + 9);
    currentY += 17;
  }

  // =========================================================================
  // 2. EXECUTIVE SUMMARY & MARKET OVERVIEW
  // =========================================================================
  drawSectionHeader(
    "01",
    isId ? "Ringkasan Eksekutif & Tinjauan Pasar" : "Executive Summary & Market Overview"
  );

  drawSubHeader(isId ? "Ringkasan Eksekutif" : "Executive Summary");
  drawParagraph(report.executive_summary, 9);

  drawSubHeader(isId ? "Tinjauan Pasar & Lanskap Industri" : "Market Overview & Landscape");
  drawParagraph(report.market_overview, 9);

  // =========================================================================
  // 3. COMPETITOR PROFILES DEEP-DIVE
  // =========================================================================
  drawSectionHeader(
    "02",
    isId ? "Profil Mendalam Kompetitor" : "Competitor Deep-Dive Profiles"
  );

  report.competitor_profiles.forEach((comp, idx) => {
    ensureSpace(32);

    // Competitor Card Header
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, maxContentWidth, 8, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${comp.name}`, marginX + 3, currentY + 5.5);

    if (comp.website) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(16, 185, 129);
      doc.text(comp.website, pageWidth - marginX - 3, currentY + 5.5, { align: "right" });
    }
    currentY += 11;

    // Tagline / Positioning
    if (comp.tagline) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const tagLines = doc.splitTextToSize(`"${cleanText(comp.tagline)}"`, maxContentWidth);
      doc.text(tagLines, marginX + 2, currentY);
      currentY += tagLines.length * 4 + 2;
    }

    // Go-to-market and pricing inline
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${isId ? "Target Pasar" : "Target Market"}: `, marginX + 2, currentY);

    doc.setFont("helvetica", "normal");
    const gtmText = cleanText(comp.market_positioning);
    const gtmLines = doc.splitTextToSize(gtmText, maxContentWidth - 28);
    doc.text(gtmLines, marginX + 25, currentY);
    currentY += gtmLines.length * 4 + 1.5;

    doc.setFont("helvetica", "bold");
    doc.text(`${isId ? "Model Harga" : "Pricing Model"}: `, marginX + 2, currentY);
    doc.setFont("helvetica", "normal");
    const priceText = cleanText(comp.pricing_summary);
    const priceLines = doc.splitTextToSize(priceText, maxContentWidth - 28);
    doc.text(priceLines, marginX + 25, currentY);
    currentY += priceLines.length * 4 + 1.5;

    if (comp.user_sentiment) {
      doc.setFont("helvetica", "bold");
      doc.text(`${isId ? "Sentimen Pengguna" : "User Sentiment"}: `, marginX + 2, currentY);
      doc.setFont("helvetica", "normal");
      const sentText = cleanText(comp.user_sentiment);
      const sentLines = doc.splitTextToSize(sentText, maxContentWidth - 32);
      doc.text(sentLines, marginX + 32, currentY);
      currentY += sentLines.length * 4 + 1.5;
    }

    // Key Features bullet line
    if (comp.key_features && comp.key_features.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text(`${isId ? "Fitur Kunci" : "Key Features"}: `, marginX + 2, currentY);
      doc.setFont("helvetica", "normal");
      const featText = comp.key_features.map((f) => cleanText(f)).join(" • ");
      const featLines = doc.splitTextToSize(featText, maxContentWidth - 26);
      doc.text(featLines, marginX + 25, currentY);
      currentY += featLines.length * 4 + 2;
    }

    // Pros & Cons Side-by-side or stacked block
    const halfWidth = (maxContentWidth - 4) / 2;

    // Pros Block
    doc.setFillColor(240, 253, 244); // green-50
    doc.setDrawColor(187, 247, 208);
    const prosLines = comp.pros.map((p) => `+ ${cleanText(p)}`);
    const prosSplit = doc.splitTextToSize(prosLines.join("\n"), halfWidth - 4);
    const prosHeight = Math.max(14, prosSplit.length * 3.8 + 6);

    // Cons Block
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211);
    const consLines = comp.cons.map((c) => `- ${cleanText(c)}`);
    const consSplit = doc.splitTextToSize(consLines.join("\n"), halfWidth - 4);
    const consHeight = Math.max(14, consSplit.length * 3.8 + 6);

    const blockH = Math.max(prosHeight, consHeight);
    ensureSpace(blockH + 4);

    // Draw Pros Box
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginX, currentY, halfWidth, blockH, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.text(isId ? "KELEBIHAN (PROS)" : "PROS & ADVANTAGES", marginX + 3, currentY + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text(prosSplit, marginX + 3, currentY + 8);

    // Draw Cons Box
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(marginX + halfWidth + 4, currentY, halfWidth, blockH, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(225, 29, 72);
    doc.text(isId ? "KEKURANGAN (CONS)" : "CONS & LIMITATIONS", marginX + halfWidth + 7, currentY + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(159, 18, 57);
    doc.text(consSplit, marginX + halfWidth + 7, currentY + 8);

    currentY += blockH + 6;
  });

  // =========================================================================
  // 4. COMPARISON MATRICES (FEATURE & PRICING)
  // =========================================================================
  drawSectionHeader(
    "03",
    isId ? "Matriks Perbandingan Fitur & Harga" : "Feature & Pricing Comparison Matrices"
  );

  // 4a. Feature Matrix
  drawSubHeader(isId ? "Matriks Fitur Teknis & Kapabilitas" : "Technical Feature & Capability Matrix");
  const featureTable = parseMarkdownTable(report.feature_matrix_markdown);
  if (featureTable) {
    autoTable(doc, {
      startY: currentY,
      head: [featureTable.head],
      body: featureTable.body,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 42 },
      },
    });
    currentY = getLastAutoTableY(doc) + 7;
  } else {
    drawParagraph(report.feature_matrix_markdown, 8);
  }

  // 4b. Pricing Matrix
  drawSubHeader(isId ? "Matriks Model Harga & Struktur Biaya" : "Pricing Model & Tier Matrix");
  const pricingTable = parseMarkdownTable(report.pricing_matrix_markdown);
  if (pricingTable) {
    autoTable(doc, {
      startY: currentY,
      head: [pricingTable.head],
      body: pricingTable.body,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 42 },
      },
    });
    currentY = getLastAutoTableY(doc) + 8;
  } else {
    drawParagraph(report.pricing_matrix_markdown, 8);
  }

  // =========================================================================
  // 5. COMPREHENSIVE SWOT ANALYSIS (4 QUADRANTS)
  // =========================================================================
  drawSectionHeader(
    "04",
    isId ? "Analisis SWOT 4-Kuadran Komprehensif" : "Comprehensive SWOT Analysis (4 Quadrants)"
  );

  report.swot_analyses.forEach((swot) => {
    ensureSpace(38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${swot.competitor} — SWOT Audit`, marginX, currentY);
    currentY += 4;

    const swotRows = [
      [
        {
          content: `${isId ? "KEKUATAN (STRENGTHS)" : "STRENGTHS"}\n${swot.strengths?.map((s) => `• ${cleanText(s)}`).join("\n") || "-"}`,
          styles: { fillColor: [240, 253, 244] as [number, number, number], textColor: [21, 128, 61] as [number, number, number] }
        },
        {
          content: `${isId ? "KELEMAHAN (WEAKNESSES)" : "WEAKNESSES"}\n${swot.weaknesses?.map((w) => `• ${cleanText(w)}`).join("\n") || "-"}`,
          styles: { fillColor: [255, 241, 242] as [number, number, number], textColor: [225, 29, 72] as [number, number, number] }
        }
      ],
      [
        {
          content: `${isId ? "PELUANG (OPPORTUNITIES)" : "OPPORTUNITIES"}\n${swot.opportunities?.map((o) => `• ${cleanText(o)}`).join("\n") || "-"}`,
          styles: { fillColor: [240, 249, 255] as [number, number, number], textColor: [2, 132, 199] as [number, number, number] }
        },
        {
          content: `${isId ? "ANCAMAN (THREATS)" : "THREATS"}\n${swot.threats?.map((t) => `• ${cleanText(t)}`).join("\n") || "-"}`,
          styles: { fillColor: [255, 251, 235] as [number, number, number], textColor: [217, 119, 6] as [number, number, number] }
        }
      ]
    ];

    autoTable(doc, {
      startY: currentY,
      body: swotRows,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.2,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        valign: "top",
      },
      columnStyles: {
        0: { cellWidth: (maxContentWidth) / 2 },
        1: { cellWidth: (maxContentWidth) / 2 },
      },
    });

    currentY = getLastAutoTableY(doc) + 7;
  });

  // =========================================================================
  // 6. STRATEGIC RECOMMENDATIONS
  // =========================================================================
  drawSectionHeader(
    "05",
    isId ? "Rekomendasi Strategis Berbasis Bukti" : "Evidence-Based Strategic Recommendations"
  );

  report.strategic_recommendations.forEach((rec, idx) => {
    ensureSpace(16);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, maxContentWidth, 12, 1.5, 1.5, "FD");

    // Number badge
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(marginX + 2.5, currentY + 2.5, 9, 7, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`0${idx + 1}`, marginX + 4.5, currentY + 7);

    // Recommendation body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const recLines = doc.splitTextToSize(cleanText(rec), maxContentWidth - 18);
    doc.text(recLines, marginX + 15, currentY + 6);

    const extraH = Math.max(12, recLines.length * 3.8 + 5);
    currentY += extraH + 2;
  });

  // =========================================================================
  // 7. VERIFIED CITATIONS & PROVENANCE
  // =========================================================================
  if (report.verified_citations && report.verified_citations.length > 0) {
    drawSectionHeader(
      "06",
      isId ? "Daftar Sumber Web Terverifikasi" : "Verified Citations & Grounding Data"
    );

    const sourceRows = report.verified_citations.slice(0, 25).map((c, i) => [
      String(i + 1),
      cleanText(c.competitor || "-"),
      cleanText(c.title || c.url),
      cleanText(c.source_engine || "web"),
      cleanText(c.dimension || "general")
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        "#",
        isId ? "Kompetitor" : "Competitor",
        isId ? "Judul Sumber & URL" : "Source Title & URL",
        isId ? "Engine" : "Engine",
        isId ? "Dimensi" : "Dimension"
      ]],
      body: sourceRows,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 28, fontStyle: "bold" },
        2: { cellWidth: 88 },
        3: { cellWidth: 26 },
        4: { cellWidth: 32 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    currentY = getLastAutoTableY(doc) + 6;
  }

  // =========================================================================
  // 8. GLOBAL FOOTER ON EVERY PAGE (Page X of Y & Provenance)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Subtle bottom divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      isId
        ? "StratAgent Multi-Agent RAG • Grounding Bukti Web Terverifikasi"
        : "StratAgent Autonomous Multi-Agent RAG • Grounded Intelligence",
      marginX,
      pageHeight - 6.5
    );

    const pageStr = isId
      ? `Halaman ${p} dari ${totalPages}`
      : `Page ${p} of ${totalPages}`;
    doc.text(pageStr, pageWidth - marginX, pageHeight - 6.5, { align: "right" });
  }

  // =========================================================================
  // 9. INSTANT TRIGGER DOWNLOAD (Directly saves file like export .md)
  // =========================================================================
  const cleanTitle = (report.title || "intelligence_report")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();
  const fileName = `${cleanTitle}_dossier.pdf`;

  try {
    doc.save(fileName);
  } catch {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
