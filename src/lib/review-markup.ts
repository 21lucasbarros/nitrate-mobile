/**
 * Formatação das reviews, a mesma do Nitrate web: um markdown mínimo que continua legível cru.
 *   **negrito**   _itálico_   > citação (no começo da linha)   [texto](https://link)
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] };

export type Block = { type: 'paragraph' | 'quote'; lines: Inline[][] };

/** só links da web: nada de javascript:, data: etc. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  return /^https?:\/\/[^\s]+$/i.test(withScheme) ? withScheme : null;
}

// letras (com acento), números e _: o itálico com _ só vale fora de palavras,
// para nomes_com_sublinhado não virarem itálico
const WORD_CHAR = /[0-9A-Za-z_À-ɏ]/;

// a ordem importa: link primeiro (o texto dele pode ter _ ou **), depois negrito, depois itálico
const INLINE = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|_([^\s_](?:.*?[^\s])?)_/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  let consumed = ''; // o que já foi lido, para checar a letra antes do _
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      pushText(out, rest);
      break;
    }
    const [whole, linkText, linkUrl, bold, italic] = match;
    const before = rest.slice(0, match.index);
    const prevChar = (consumed + before).slice(-1);
    const nextChar = rest.charAt(match.index + whole.length);

    // _ grudado em palavra não é itálico: trata o _ como texto e segue
    if (italic !== undefined && (WORD_CHAR.test(prevChar) || WORD_CHAR.test(nextChar))) {
      pushText(out, before + '_');
      consumed += before + '_';
      rest = rest.slice(match.index + 1);
      continue;
    }

    if (before) pushText(out, before);
    if (linkText !== undefined) {
      const href = normalizeUrl(linkUrl);
      if (href) out.push({ type: 'link', href, children: parseInline(linkText) });
      else pushText(out, whole); // endereço inválido: mostra como texto
    } else if (bold !== undefined) {
      out.push({ type: 'bold', children: parseInline(bold) });
    } else {
      out.push({ type: 'italic', children: parseInline(italic) });
    }
    consumed += before + whole;
    rest = rest.slice(match.index + whole.length);
  }
  return out;
}

// junta pedaços de texto vizinhos
function pushText(out: Inline[], text: string) {
  const last = out[out.length - 1];
  if (last?.type === 'text') last.text += text;
  else out.push({ type: 'text', text });
}

/** linhas com "> " viram citação; as outras, parágrafos (linhas em branco separam parágrafos) */
export function parseReview(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const isQuote = /^>/.test(line);
    const content = isQuote ? line.replace(/^> ?/, '') : line;
    const last = blocks[blocks.length - 1];
    if (!isQuote && line.trim() === '') {
      // linha em branco fecha o bloco atual
      if (last && !(last.type === 'paragraph' && last.lines.length === 0)) blocks.push({ type: 'paragraph', lines: [] });
      continue;
    }
    const type = isQuote ? 'quote' : 'paragraph';
    if (last && last.type === type) last.lines.push(parseInline(content));
    else blocks.push({ type, lines: [parseInline(content)] });
  }
  return blocks.filter((b) => b.lines.length > 0);
}

// ---------- barra do editor (as mesmas transformações do web) ----------

export interface TextState {
  text: string;
  start: number; // seleção
  end: number;
}

/** envolve a seleção com o marcador (ou tira, se já estiver envolvida) */
function toggleWrap({ text, start, end }: TextState, marker: string, placeholder: string): TextState {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);
  const m = marker.length;

  // marcadores logo fora da seleção: **[texto]**
  if (before.endsWith(marker) && after.startsWith(marker)) {
    return { text: before.slice(0, -m) + selected + after.slice(m), start: start - m, end: end - m };
  }
  // marcadores dentro da seleção: [**texto**]
  if (selected.length >= m * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(m, -m);
    return { text: before + inner + after, start, end: start + inner.length };
  }
  // espaços nas pontas ficam fora do marcador: "**texto** " e não "**texto **"
  const lead = selected.length - selected.trimStart().length;
  const trail = selected.length - selected.trimEnd().length;
  const core = selected.trim() || placeholder;
  const head = before + selected.slice(0, lead) + marker;
  return {
    text: head + core + marker + selected.slice(selected.length - trail) + after,
    start: head.length,
    end: head.length + core.length,
  };
}

export const toggleBold = (s: TextState) => toggleWrap(s, '**', 'negrito');
export const toggleItalic = (s: TextState) => toggleWrap(s, '_', 'itálico');

/** põe (ou tira) "> " no começo de cada linha tocada pela seleção */
export function toggleQuote({ text, start, end }: TextState): TextState {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const quoted = lines.every((l) => l.startsWith('>') || l.trim() === '');
  const changed = quoted ? lines.map((l) => l.replace(/^> ?/, '')) : lines.map((l) => (l.trim() === '' ? l : '> ' + l));
  const block = changed.join('\n');
  return { text: text.slice(0, lineStart) + block + text.slice(lineEnd), start: lineStart, end: lineStart + block.length };
}

/** texto sem marcações (para prévias) */
export function stripMarkup(text: string): string {
  const flat = (nodes: Inline[]): string => nodes.map((n) => (n.type === 'text' ? n.text : flat(n.children))).join('');
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => flat(parseInline(line.replace(/^> ?/, ''))))
    .join('\n');
}
