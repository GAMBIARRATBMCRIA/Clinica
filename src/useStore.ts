import { useState, useCallback } from 'react';
import type { Session, Closure, FilterState } from './types';
import { INITIAL_SESSIONS, INITIAL_CLOSURES, FISIOTERAPEUTAS, TAX_PERCENT, CLINIC_PERCENT } from './data';
import { isEligible, buildPreview, buildClosureFisioEntries, calcNet } from './utils';
import type { PreviewResult } from './types';

const STORAGE_KEY_SESSIONS = 'harmonia_sessions_v4';
const STORAGE_KEY_CLOSURES = 'harmonia_closures_v4';

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS) || localStorage.getItem('harmonia_sessions_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: any) => ({
          ...s,
          glosa: (s.glosa === 'glosada' || s.glosa === true) ? 'glosada' : 'nao_glosada',
          financialStatus: s.financialStatus || (s.closureId ? 'reservada' : 'disponivel'),
        }));
      }
    }
  } catch { /* ignore */ }
  return INITIAL_SESSIONS;
}

function loadClosures(): Closure[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOSURES) || localStorage.getItem('harmonia_closures_v3');
    if (raw) return JSON.parse(raw) as Closure[];
  } catch { /* ignore */ }
  return INITIAL_CLOSURES;
}

function saveSessions(s: Session[]) {
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(s));
}

function saveClosures(c: Closure[]) {
  localStorage.setItem(STORAGE_KEY_CLOSURES, JSON.stringify(c));
}

export function useStore() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [closures, setClosures] = useState<Closure[]>(loadClosures);

  const updateSessions = useCallback((updated: Session[]) => {
    setSessions(updated);
    saveSessions(updated);
  }, []);

  const updateClosures = useCallback((updated: Closure[]) => {
    setClosures(updated);
    saveClosures(updated);
  }, []);

  // ── Glosa actions ────────────────────────────────────────────────────────

  const applyGlosa = useCallback((sessionId: string) => {
    const updated = sessions.map(s => {
      if (s.id !== sessionId) return s;
      // Can't glosa if reserved or paid
      if (s.financialStatus !== 'disponivel') return s;
      return { ...s, glosa: 'glosada' as const, glosaDate: new Date().toISOString().slice(0, 10) };
    });
    updateSessions(updated);
  }, [sessions, updateSessions]);

  const removeGlosa = useCallback((sessionId: string) => {
    const updated = sessions.map(s => {
      if (s.id !== sessionId) return s;
      if (s.financialStatus !== 'disponivel') return s;
      return { ...s, glosa: 'nao_glosada' as const, regularizationDate: new Date().toISOString().slice(0, 10) };
    });
    updateSessions(updated);
  }, [sessions, updateSessions]);

  const updateSession = useCallback((sessionId: string, changes: Partial<Session>) => {
    const updated = sessions.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, ...changes };
    });
    updateSessions(updated);
  }, [sessions, updateSessions]);

  // ── Preview ──────────────────────────────────────────────────────────────

  const getPreview = useCallback((
    fisioIds: string[],
    taxPct: number = TAX_PERCENT,
    clinicPct: number = CLINIC_PERCENT,
  ): PreviewResult => {
    const lastPaid = [...closures]
      .filter(c => c.status === 'pago')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return buildPreview(sessions, fisioIds, lastPaid, taxPct, clinicPct);
  }, [sessions, closures]);

  // ── Conclude closure ─────────────────────────────────────────────────────

  const concludeClosure = useCallback((
    fisioIds: string[],
    taxPct: number = TAX_PERCENT,
    clinicPct: number = CLINIC_PERCENT,
  ): Closure | null => {
    const lastPaid = [...closures]
      .filter(c => c.status === 'pago')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    const eligibleSessions = sessions.filter(s =>
      fisioIds.includes(s.fisioId) && isEligible(s)
    );

    if (eligibleSessions.length === 0) return null;

    const gross = eligibleSessions.reduce((sum, s) => sum + s.valuePerSession, 0);
    const { taxValue, clinicValue, netValue } = calcNet(gross, taxPct, clinicPct);
    const perFisio = buildClosureFisioEntries(eligibleSessions, fisioIds, taxPct, clinicPct);
    const now = new Date().toISOString();
    const nextNum = closures.length + 1;
    const closureYear = new Date().getFullYear();
    const formattedId = `FCH-${closureYear}-${String(nextNum).padStart(3, '0')}`;

    const closure: Closure = {
      id: formattedId,
      createdAt: now,
      status: 'pendente',
      fisioIds,
      sessions: eligibleSessions.map(s => ({ sessionId: s.id, value: s.valuePerSession })),
      periodStart: lastPaid ? lastPaid.createdAt.slice(0, 10) : '2025-01-01',
      periodEnd: now.slice(0, 10),
      grossValue: gross,
      taxPercent: taxPct,
      clinicPercent: clinicPct,
      taxValue,
      clinicValue,
      netValue,
      perFisio,
    };

    // Reserve sessions
    const updatedSessions = sessions.map(s => {
      if (eligibleSessions.some(es => es.id === s.id)) {
        return { ...s, financialStatus: 'reservada' as const, closureId: closure.id };
      }
      return s;
    });

    const updatedClosures = [...closures, closure];
    updateSessions(updatedSessions);
    updateClosures(updatedClosures);
    return closure;
  }, [sessions, closures, updateSessions, updateClosures]);

  // ── Cancel closure ───────────────────────────────────────────────────────

  const cancelClosure = useCallback((closureId: string) => {
    const closure = closures.find(c => c.id === closureId);
    if (!closure || closure.status !== 'pendente') return;

    const sessionIds = new Set(closure.sessions.map(cs => cs.sessionId));

    const updatedSessions = sessions.map(s => {
      if (sessionIds.has(s.id)) {
        return { ...s, financialStatus: 'disponivel' as const, closureId: undefined };
      }
      return s;
    });

    const updatedClosures = closures.map(c =>
      c.id === closureId
        ? { ...c, status: 'cancelado' as const, cancelledAt: new Date().toISOString() }
        : c
    );

    updateSessions(updatedSessions);
    updateClosures(updatedClosures);
  }, [sessions, closures, updateSessions, updateClosures]);

  // ── Confirm payment ──────────────────────────────────────────────────────

  const confirmPayment = useCallback((closureId: string) => {
    const closure = closures.find(c => c.id === closureId);
    if (!closure || closure.status !== 'pendente') return;

    const sessionIds = new Set(closure.sessions.map(cs => cs.sessionId));
    const now = new Date().toISOString();

    const updatedSessions = sessions.map(s => {
      if (sessionIds.has(s.id)) {
        return { ...s, financialStatus: 'paga' as const, paymentDate: now.slice(0, 10) };
      }
      return s;
    });

    const updatedClosures = closures.map(c =>
      c.id === closureId
        ? { ...c, status: 'pago' as const, paidAt: now }
        : c
    );

    updateSessions(updatedSessions);
    updateClosures(updatedClosures);
  }, [sessions, closures, updateSessions, updateClosures]);

  // ── Reset ────────────────────────────────────────────────────────────────

  const resetDemo = useCallback(() => {
    updateSessions(INITIAL_SESSIONS);
    updateClosures(INITIAL_CLOSURES);
  }, [updateSessions, updateClosures]);

  // ── Filtered sessions ────────────────────────────────────────────────────

  const getFilteredSessions = useCallback((filters: FilterState): Session[] => {
    return sessions.filter(s => {
      if (filters.dateFrom && s.date < filters.dateFrom) return false;
      if (filters.dateTo   && s.date > filters.dateTo)   return false;
      if (filters.fisioId  && s.fisioId !== filters.fisioId) return false;
      if (filters.plano    && filters.plano !== 'all' && s.plano !== filters.plano) return false;
      if (filters.glosa && filters.glosa !== 'all') {
        const isGlosada = s.glosa === 'glosada' || (s as any).glosa === true;
        if (filters.glosa === 'glosada' && !isGlosada) return false;
        if (filters.glosa === 'nao_glosada' && isGlosada) return false;
      }
      if (filters.financial && filters.financial !== 'all') {
        const currentFinancial = s.financialStatus || (s.closureId ? 'reservada' : 'disponivel');
        if (currentFinancial !== filters.financial) return false;
      }
      return true;
    });
  }, [sessions]);

  // ── Summary indicators ───────────────────────────────────────────────────

  const getIndicators = useCallback((filtered: Session[]) => {
    const eligible = filtered.filter(isEligible);
    const glossed  = filtered.filter(s => s.glosa === 'glosada');
    const gross    = eligible.reduce((sum, s) => sum + s.valuePerSession, 0);
    const { taxValue, clinicValue, netValue } = calcNet(gross);
    return {
      total: filtered.length,
      eligible: eligible.length,
      glossed: glossed.length,
      gross,
      taxValue,
      clinicValue,
      net: netValue,
    };
  }, []);

  return {
    sessions,
    closures,
    FISIOTERAPEUTAS,
    applyGlosa,
    removeGlosa,
    updateSession,
    getPreview,
    concludeClosure,
    cancelClosure,
    confirmPayment,
    resetDemo,
    getFilteredSessions,
    getIndicators,
  };
}
