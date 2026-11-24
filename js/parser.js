/**
 * FCPS Medicine Vault - High Performance Text Question Parser
 * Parses Davidson/FCPS/BCPS/Genesis/MHS exam text files into structured questions.
 */

// Helper to decode HTML entities
export function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .replace(/&harr;/g, '↔')
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&ne;/g, '≠')
    .replace(/&plusmn;/g, '±')
    .replace(/&deg;/g, '°')
    .replace(/&micro;/g, 'µ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Clean Python dict option string: e.g. {'label': 'A', 'raw': 'a) ...', 'clean': '...'}
export function cleanOptionText(rawText) {
  if (!rawText) return '';
  let str = rawText.trim();

  // Match 'clean': '...' or "clean": "..."
  const cleanMatch = str.match(/['"]clean['"]\s*:\s*(['"])(.*?)\1/s);
  if (cleanMatch) {
    str = cleanMatch[2];
  } else if (str.startsWith('{') && str.endsWith('}')) {
    // Fallback: match raw
    const rawMatch = str.match(/['"]raw['"]\s*:\s*(['"])(.*?)\1/s);
    if (rawMatch) {
      str = rawMatch[2].replace(/^[a-eA-E][).]\s*/, '');
    }
  } else {
    // Only strip leading letter if explicitly followed by ')' or '.' like "a) " or "A. "
    str = str.replace(/^[a-eA-E][).]\s*/, '');
  }

  // Remove python escapes like \r\n, \n, \\'
  str = str.replace(/\\r\\n/g, ' ')
           .replace(/\\n/g, ' ')
           .replace(/\\'/g, "'")
           .replace(/\\"/g, '"');

  return decodeHtmlEntities(str.trim());
}

/**
 * Parse a single .txt question bank file
 * @param {string} content - Raw file text content
 * @param {string} fileName - File name for fallback detection
 * @returns {Object} { bank, format, questions, topics }
 */
export function parseQuestionFile(content, fileName = '') {
  if (!content) return { bank: 'UNKNOWN', format: 'MCQ', questions: [], topics: [] };

  // 1. Identify Bank Name
  let bank = 'UNKNOWN';
  const bankMatch = content.slice(0, 500).match(/\[([A-Z_]+)\]/);
  if (bankMatch) {
    bank = bankMatch[1];
  } else if (fileName.includes('GENESIS')) {
    bank = 'GENESIS';
  } else if (fileName.includes('BCPS') || fileName.includes('FCPS')) {
    bank = 'BCPS_FCPS';
  } else if (fileName.includes('MHS')) {
    bank = 'MHS';
  }

  // 2. Identify Format
  let format = 'MCQ';
  const formatMatch = content.slice(0, 1200).match(/Format:\s*(.+)/i);
  if (formatMatch && /single\s*best|sba/i.test(formatMatch[1])) {
    format = 'SBA';
  } else if (fileName.includes('_SBA_') || fileName.includes('SBA')) {
    format = 'SBA';
  } else if (fileName.includes('_MCQ_') || fileName.includes('MCQ')) {
    format = 'MCQ';
  }

  const questions = [];
  const topicMap = new Map();

  // 3. Split content into chapter sections: ================================================================================\n01 - Topic Name
  // We use regex to find section headers
  const sectionSplits = content.split(/={40,}\r?\n(?=\s*\d{1,2}\s*-\s*[^\n]+)/);

  for (let sIdx = 1; sIdx < sectionSplits.length; sIdx++) {
    const secText = sectionSplits[sIdx];
    const lines = secText.split(/\r?\n/);
    const headerLine = lines[0].trim();

    const titleMatch = headerLine.match(/^(\d{1,2})\s*-\s*(.+)$/);
    if (!titleMatch) continue;

    const topicNum = titleMatch[1].padStart(2, '0');
    const topicTitle = titleMatch[2].trim();

    if (!topicMap.has(topicNum)) {
      topicMap.set(topicNum, {
        num: topicNum,
        title: topicTitle,
        count: 0,
        bankCounts: {},
        formatCounts: {}
      });
    }
    const topicInfo = topicMap.get(topicNum);

    // 4. Split Questions within Section
    // Standard divider is: --- Question <N> ---
    const qBlocks = secText.split(/--- Question \d+ ---/i);

    for (let qIdx = 1; qIdx < qBlocks.length; qIdx++) {
      let qRaw = qBlocks[qIdx].trim();
      if (!qRaw) continue;

      // Cut off bottom divider (--------------------------------------------------------------------------------)
      const dividerIdx = qRaw.search(/-{30,}/);
      if (dividerIdx !== -1) {
        qRaw = qRaw.slice(0, dividerIdx).trim();
      }

      // Find where options start (first occurrence of [A])
      const optStartMatch = qRaw.search(/\n\s*\[[A-E]\]/);
      let stem = '';
      let rest = '';

      if (optStartMatch !== -1) {
        stem = qRaw.slice(0, optStartMatch).trim();
        rest = qRaw.slice(optStartMatch);
      } else {
        stem = qRaw;
        rest = '';
      }

      // Extract options: [A] text, [B] text, etc.
      const options = [];
      const optRegex = /\[([A-E])\]\s*([\s\S]*?)(?=\n\s*\[[A-E]\]|\n\s*(?:Official Keys:|Correct Option:|Clinical Explanation|Explanation:|Provenance:|Ref:|-{30,}|\Z))/gi;
      let optMatch;

      while ((optMatch = optRegex.exec(rest)) !== null) {
        const letter = optMatch[1].toUpperCase();
        let optText = optMatch[2].trim();

        // Extract [True] or [False] if present
        let val = null;
        const tfMatch = optText.match(/\[(True|False)\]/i);
        if (tfMatch) {
          val = tfMatch[1].toLowerCase() === 'true' ? 'True' : 'False';
          optText = optText.replace(/\[(True|False)\]/gi, '').trim();
        }

        // Clean dict formatting
        optText = cleanOptionText(optText);

        options.push({ letter, text: optText, val });
      }

      // Extract Official Keys (e.g. Official Keys: A: False, B: True...)
      let officialKeys = null;
      const keysMatch = rest.match(/Official Keys:\s*([^\r\n]+)/i);
      if (keysMatch) {
        officialKeys = keysMatch[1].trim();
      } else if (format === 'MCQ' && options.some(o => o.val !== null)) {
        // Construct from options if official keys line missing
        officialKeys = options
          .filter(o => o.val !== null)
          .map(o => `${o.letter}: ${o.val}`)
          .join(', ');
      }

      // Extract Correct Option (for SBA: Correct Option: [A] or Correct Option: [Verified Key])
      let correctOption = null;
      const corrMatch = rest.match(/Correct Option:\s*\[?([A-E]|Verified Key)\]?/i);
      if (corrMatch) {
        correctOption = corrMatch[1].trim();
      }

      // Extract Explanation
      let explanation = null;
      const expMatch = rest.match(/(?:Clinical Explanation & Rationale:|Explanation:)\s*([\s\S]*?)(?=\n\s*Provenance:|\Z)/i);
      if (expMatch) {
        explanation = decodeHtmlEntities(expMatch[1].trim());
      }

      // Extract Provenance
      let provenance = null;
      const provMatch = rest.match(/Provenance:\s*([^\r\n]+)/i);
      if (provMatch) {
        provenance = decodeHtmlEntities(provMatch[1].trim());
      }

      // Clean stem
      stem = decodeHtmlEntities(stem);

      const qId = `${bank}_${format}_${topicNum}_q${qIdx}_${questions.length + 1}`;

      const questionObj = {
        id: qId,
        topicNum,
        topicTitle,
        bank,
        format,
        fileName,
        qNum: qIdx,
        stem,
        options,
        correctOption,
        officialKeys,
        explanation,
        provenance
      };

      questions.push(questionObj);

      // Accumulate topic stats
      topicInfo.count++;
      topicInfo.bankCounts[bank] = (topicInfo.bankCounts[bank] || 0) + 1;
      topicInfo.formatCounts[format] = (topicInfo.formatCounts[format] || 0) + 1;
    }
  }

  return {
    bank,
    format,
    questions,
    topics: Array.from(topicMap.values())
  };
}

/**
 * Merge multiple parsed topic summaries together
 */
export function mergeTopics(existingTopics, newTopics) {
  const map = new Map();
  for (const t of existingTopics) {
    map.set(t.num, { ...t, bankCounts: { ...t.bankCounts }, formatCounts: { ...t.formatCounts } });
  }

  for (const t of newTopics) {
    if (!map.has(t.num)) {
      map.set(t.num, {
        num: t.num,
        title: t.title,
        count: t.count,
        bankCounts: { ...t.bankCounts },
        formatCounts: { ...t.formatCounts }
      });
    } else {
      const cur = map.get(t.num);
      cur.count += t.count;
      for (const [b, c] of Object.entries(t.bankCounts)) {
        cur.bankCounts[b] = (cur.bankCounts[b] || 0) + c;
      }
      for (const [f, c] of Object.entries(t.formatCounts)) {
        cur.formatCounts[f] = (cur.formatCounts[f] || 0) + c;
      }
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => parseInt(a.num, 10) - parseInt(b.num, 10));
  return result;
}
