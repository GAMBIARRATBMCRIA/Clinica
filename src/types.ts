// ─── Domain Types ──────────────────────────────────────────────────────────────

export type GlosaStatus = 'nao_glosada' | 'glosada';

export type FinancialStatus =
  | 'disponivel'
  | 'reservada'
  | 'paga';

export interface Session {
  id: string;
  date: string;              // ISO yyyy-mm-dd
  patient: string;
  guia: string;              // guia + plano string
  plano: string;
  fisioId: string;
  registeredBy: string;
  valuePerSession: number;
  glosa: GlosaStatus;
  glosaDate?: string;        // when glosa was applied
  regularizationDate?: string; // when glosa was lifted
  financialStatus: FinancialStatus;
  closureId?: string;        // which closure this session is linked to
  paymentDate?: string;
}

export interface Fisioterapeuta {
  id: string;
  name: string;
  crefito: string;
  initials: string;
  color: string;
}

export type ClosureStatus = 'pendente' | 'pago' | 'cancelado';

export interface ClosureSession {
  sessionId: string;
  value: number;
}

export interface Closure {
  id: string;
  createdAt: string;         // ISO datetime
  paidAt?: string;
  cancelledAt?: string;
  status: ClosureStatus;
  fisioIds: string[];
  sessions: ClosureSession[];
  periodStart: string;
  periodEnd: string;
  grossValue: number;
  taxPercent: number;
  clinicPercent: number;
  taxValue: number;
  clinicValue: number;
  netValue: number;
  perFisio: ClosureFisioEntry[];
}

export interface ClosureFisioEntry {
  fisioId: string;
  sessionCount: number;
  grossValue: number;
  taxValue: number;
  clinicValue: number;
  netValue: number;
}

// ─── Preview Types ─────────────────────────────────────────────────────────────

export interface PreviewFisioEntry {
  fisioId: string;
  eligibleSessions: number;
  glossedSessions: number;
  grossValue: number;
  taxPercent: number;
  taxValue: number;
  clinicPercent: number;
  clinicValue: number;
  netValue: number;
}

export interface PreviewResult {
  entries: PreviewFisioEntry[];
  totalGross: number;
  totalNet: number;
  totalEligible: number;
  totalGlossed: number;
  periodStart: string;
  periodEnd: string;
}

// ─── Filter State ──────────────────────────────────────────────────────────────

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  fisioId: string;      // '' = all
  glosa: 'all' | 'glosada' | 'nao_glosada';
  financial: 'all' | 'disponivel' | 'reservada' | 'paga';
}
