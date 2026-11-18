// o Hermes não tem Intl.RelativeTimeFormat: o "há 2 dias" é montado aqui
const UNITS: [string, string, number][] = [
  ['ano', 'anos', 365 * 24 * 60 * 60],
  ['mês', 'meses', 30 * 24 * 60 * 60],
  ['semana', 'semanas', 7 * 24 * 60 * 60],
  ['dia', 'dias', 24 * 60 * 60],
  ['hora', 'horas', 60 * 60],
  ['minuto', 'minutos', 60],
];

/** "há 2 dias", "ontem", "agora" */
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  for (const [singular, pluralForm, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      const n = Math.round(Math.abs(seconds) / size);
      if (singular === 'dia' && n === 1) return seconds > 0 ? 'ontem' : 'amanhã';
      const label = `${n} ${n === 1 ? singular : pluralForm}`;
      return seconds > 0 ? `há ${label}` : `em ${label}`;
    }
  }
  return 'agora';
}

/** "outubro de 2026" */
export function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** "31 out. 2026" a partir de "2026-10-31" (sem converter fuso, é só uma data) */
export function shortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** data local no formato yyyy-mm-dd, deslocada `deltaDays` dias a partir de hoje */
export function isoDay(deltaDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayIso = () => isoDay(0);

/** "2026-10-31" + 1 -> "2026-11-01" */
export function shiftDay(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + delta);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 3.5 -> "3,5" */
export function formatScore(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** nota arredondada para meias estrelas, entre 0 e 5 */
export function toRating(value: number): number {
  const clamped = Math.min(5, Math.max(0, value));
  return Math.round(clamped * 2) / 2;
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : pluralForm}`;
}

/** saudação pela hora do dia */
export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
