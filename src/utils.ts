import type { Session, Closure, PreviewResult, PreviewFisioEntry, ClosureFisioEntry } from './types';
import { FISIOTERAPEUTAS, TAX_PERCENT, CLINIC_PERCENT } from './data';

// ─── Formatting ────────────────────────────────────────────────────────────────

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ─── Business Rules ────────────────────────────────────────────────────────────

/** A session is eligible when: not glosada AND financialStatus === 'disponivel' */
export function isEligible(session: Session): boolean {
  return session.glosa === 'nao_glosada' && session.financialStatus === 'disponivel';
}

/** Calculate net value from gross */
export function calcNet(gross: number, taxPct: number = TAX_PERCENT, clinicPct: number = CLINIC_PERCENT): {
  taxValue: number; clinicValue: number; netValue: number;
} {
  const taxValue    = gross * (taxPct / 100);
  const afterTax    = gross - taxValue;
  const clinicValue = afterTax * (clinicPct / 100);
  const netValue    = afterTax - clinicValue;
  return { taxValue, clinicValue, netValue };
}

/** Build a preview result for the given fisio IDs from the session list */
export function buildPreview(
  sessions: Session[],
  fisioIds: string[],
  lastPaidClosure: Closure | undefined,
  taxPct: number = TAX_PERCENT,
  clinicPct: number = CLINIC_PERCENT,
): PreviewResult {
  const periodStart = lastPaidClosure ? lastPaidClosure.createdAt.slice(0, 10) : '2025-01-01';
  const periodEnd   = new Date().toISOString().slice(0, 10);

  const entries: PreviewFisioEntry[] = fisioIds.map(fid => {
    const fisioSessions = sessions.filter(s => s.fisioId === fid);
    const eligible = fisioSessions.filter(s => isEligible(s));
    const glossed  = fisioSessions.filter(s => s.glosa === 'glosada');
    const gross    = eligible.reduce((sum, s) => sum + s.valuePerSession, 0);
    const { taxValue, clinicValue, netValue } = calcNet(gross, taxPct, clinicPct);
    return {
      fisioId: fid,
      eligibleSessions: eligible.length,
      grossValue: gross,
      taxPercent: taxPct,
      taxValue,
      clinicPercent: clinicPct,
      clinicValue,
      netValue,
      glossedSessions: glossed.length,
    };
  });

  return {
    entries,
    totalGross:    entries.reduce((s, e) => s + e.grossValue, 0),
    totalNet:      entries.reduce((s, e) => s + e.netValue, 0),
    totalEligible: entries.reduce((s, e) => s + e.eligibleSessions, 0),
    totalGlossed:  entries.reduce((s, e) => s + e.glossedSessions, 0),
    periodStart,
    periodEnd,
  };
}

/** Build per-fisio entries for a closure */
export function buildClosureFisioEntries(
  sessions: Session[],
  fisioIds: string[],
  taxPct: number = TAX_PERCENT,
  clinicPct: number = CLINIC_PERCENT,
): ClosureFisioEntry[] {
  return fisioIds.map(fid => {
    const fisioSessions = sessions.filter(s => s.fisioId === fid && isEligible(s));
    const gross = fisioSessions.reduce((sum, s) => sum + s.valuePerSession, 0);
    const { taxValue, clinicValue, netValue } = calcNet(gross, taxPct, clinicPct);
    return {
      fisioId: fid,
      sessionCount: fisioSessions.length,
      grossValue: gross,
      taxValue,
      clinicValue,
      netValue,
    };
  });
}

export function getFisioName(id: string): string {
  return FISIOTERAPEUTAS.find(f => f.id === id)?.name ?? id;
}

export function getFisioCrefito(id: string): string {
  return FISIOTERAPEUTAS.find(f => f.id === id)?.crefito ?? '';
}

export function getFisioInitials(id: string): string {
  return FISIOTERAPEUTAS.find(f => f.id === id)?.initials ?? '??';
}

export function getFisioColor(id: string): string {
  return FISIOTERAPEUTAS.find(f => f.id === id)?.color ?? '#6b7280';
}

/** Formats closure IDs into standardized FCH-YYYY-XXX format */
export function formatClosureCode(closureId?: string): string {
  if (!closureId) return '';
  if (closureId.startsWith('FCH-')) return closureId;
  if (closureId === 'c_hist') return 'FCH-2026-001';
  if (closureId === 'c01') return 'FCH-2026-003';
  if (closureId === 'c02') return 'FCH-2026-002';
  if (closureId.startsWith('c_')) {
    const raw = closureId.replace('c_', '');
    const num = raw.length > 3 ? raw.slice(-3) : raw.padStart(3, '0');
    return `FCH-${new Date().getFullYear()}-${num}`;
  }
  return `FCH-${new Date().getFullYear()}-${closureId.padStart(3, '0')}`;
}
