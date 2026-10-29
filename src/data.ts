import type { Session, Fisioterapeuta, Closure } from './types';

export const FISIOTERAPEUTAS: Fisioterapeuta[] = [
  { id: 'f1', name: 'Carla Mendes',    crefito: 'CREFITO 123456 – SP', initials: 'CM', color: '#3b82f6' },
  { id: 'f2', name: 'Rafael Costa',    crefito: 'CREFITO 789012 – SP', initials: 'RC', color: '#8b5cf6' },
  { id: 'f3', name: 'Fernanda Rocha',  crefito: 'CREFITO 345678 – SP', initials: 'FR', color: '#ec4899' },
];

export const TAX_PERCENT    = 5;   // %
export const CLINIC_PERCENT = 50;  // % sobre saldo após imposto (padrão 50%)

export const INITIAL_SESSIONS: Session[] = [
  // ── Sessões de Exemplo 2026 (conforme captura de tela) ───────────────
  { id: 's_demo1', date:'2026-08-08', competenceDate:'2026-09-15', patient:'Ana Lima',         guia:'456789123 – CACI',   plano:'CACI',    fisioId:'f1', registeredBy:'Ana Silva',      valuePerSession:90, glosa:'nao_glosada', financialStatus:'disponivel', regularizationDate:'2026-09-15' },
  { id: 's_demo2', date:'2026-08-08', patient:'Beatriz Oliveira',                             guia:'123654789 – CACI',   plano:'CACI',    fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:75, glosa:'nao_glosada', financialStatus:'paga',       closureId:'FCH-2026-001' },
  { id: 's_demo3', date:'2026-08-08', patient:'Helena Duarte',                                guia:'741852963 – CACI',   plano:'CACI',    fisioId:'f2', registeredBy:'Ana Silva',      valuePerSession:80, glosa:'nao_glosada', financialStatus:'reservada',  closureId:'FCH-2026-003' },

  // ── Jan 2025 (período anterior, glosas regularizadas) ─────────────────
  { id: 's01', date:'2025-01-08', competenceDate:'2025-01-31', patient:'Maria Souza',      guia:'123456789 – Unimed',  plano:'Unimed',  fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:85, glosa:'nao_glosada', financialStatus:'paga',       closureId:'FCH-2026-001' },
  { id: 's02', date:'2025-01-10', patient:'João Pereira',     guia:'987654321 – Humana',  plano:'Humana',  fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:75, glosa:'glosada',     glosaDate:'2025-01-12', financialStatus:'disponivel', regularizationDate:'2025-02-03' },
  { id: 's03', date:'2025-01-15', competenceDate:'2025-01-31', patient:'Ana Lima',         guia:'456789123 – CACI',    plano:'CACI',    fisioId:'f1', registeredBy:'Ana Silva',       valuePerSession:90, glosa:'nao_glosada', financialStatus:'paga',       closureId:'FCH-2026-001' },
  { id: 's04', date:'2025-01-20', competenceDate:'2025-01-31', patient:'Carlos Alves',     guia:'321654987 – Unimed',  plano:'Unimed',  fisioId:'f3', registeredBy:'Fernanda Rocha',  valuePerSession:80, glosa:'nao_glosada', financialStatus:'paga',       closureId:'FCH-2026-001' },
  // ── Feb 2025 ──────────────────────────────────────────────────────────
  { id: 's05', date:'2025-02-03', competenceDate:'2025-02-28', patient:'Juliana Costa',    guia:'789456123 – IAPEP',   plano:'IAPEP',   fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:75, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's06', date:'2025-02-04', patient:'Roberto Almeida',  guia:'654987321 – Humana',  plano:'Humana',  fisioId:'f3', registeredBy:'Ana Silva',       valuePerSession:85, glosa:'glosada',     glosaDate:'2025-02-10', financialStatus:'disponivel' },
  { id: 's07', date:'2025-02-05', competenceDate:'2025-02-28', patient:'Beatriz Oliveira', guia:'123654789 – CACI',    plano:'CACI',    fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:90, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's08', date:'2025-02-06', patient:'Lucas Ferreira',   guia:'987321654 – Unimed',  plano:'Unimed',  fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:80, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's09', date:'2025-02-10', competenceDate:'2025-02-28', patient:'Fernanda Martins', guia:'456123789 – Humana',  plano:'Humana',  fisioId:'f3', registeredBy:'Ana Silva',       valuePerSession:85, glosa:'nao_glosada', financialStatus:'reservada',  closureId:'FCH-2026-003' },
  { id: 's10', date:'2025-02-11', patient:'Paulo Santos',     guia:'321789654 – IAPEP',   plano:'IAPEP',   fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:75, glosa:'glosada',     glosaDate:'2025-02-14', financialStatus:'disponivel' },
  { id: 's11', date:'2025-02-12', competenceDate:'2025-02-28', patient:'Mariana Lima',     guia:'654321987 – Unimed',  plano:'Unimed',  fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:80, glosa:'nao_glosada', financialStatus:'reservada',  closureId:'FCH-2026-003' },
  { id: 's12', date:'2025-02-13', patient:'Pedro Carvalho',   guia:'789123456 – CACI',    plano:'CACI',    fisioId:'f1', registeredBy:'Ana Silva',       valuePerSession:90, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's13', date:'2025-02-14', patient:'Larissa Nunes',    guia:'123987456 – Humana',  plano:'Humana',  fisioId:'f3', registeredBy:'Fernanda Rocha',  valuePerSession:85, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's14', date:'2025-02-17', patient:'Thiago Ramos',     guia:'456654321 – Unimed',  plano:'Unimed',  fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:75, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's15', date:'2025-02-18', patient:'Camila Freitas',   guia:'987456123 – IAPEP',   plano:'IAPEP',   fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:90, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's16', date:'2025-02-19', patient:'Felipe Gomes',     guia:'321123654 – CACI',    plano:'CACI',    fisioId:'f3', registeredBy:'Ana Silva',       valuePerSession:80, glosa:'glosada',     glosaDate:'2025-02-21', financialStatus:'disponivel' },
  { id: 's17', date:'2025-02-20', patient:'Aline Barbosa',    guia:'654789123 – Unimed',  plano:'Unimed',  fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:85, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's18', date:'2025-02-21', patient:'Rodrigo Pinto',    guia:'789654321 – Humana',  plano:'Humana',  fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:75, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's19', date:'2025-02-24', patient:'Tatiane Moura',    guia:'123321456 – IAPEP',   plano:'IAPEP',   fisioId:'f3', registeredBy:'Fernanda Rocha',  valuePerSession:90, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's20', date:'2025-02-25', patient:'Bruno Dias',       guia:'456987123 – CACI',    plano:'CACI',    fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:80, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's21', date:'2025-02-26', patient:'Vanessa Cruz',     guia:'987123654 – Unimed',  plano:'Unimed',  fisioId:'f1', registeredBy:'Ana Silva',       valuePerSession:85, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's22', date:'2025-02-27', patient:'Gabriel Silva',    guia:'321456789 – Humana',  plano:'Humana',  fisioId:'f3', registeredBy:'Fernanda Rocha',  valuePerSession:75, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's23', date:'2025-02-28', patient:'Isabela Torres',   guia:'654123987 – IAPEP',   plano:'IAPEP',   fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:90, glosa:'nao_glosada', financialStatus:'disponivel' },
  // ── Mar 2025 ──────────────────────────────────────────────────────────
  { id: 's24', date:'2025-03-03', patient:'Gustavo Melo',     guia:'789321123 – Unimed',  plano:'Unimed',  fisioId:'f1', registeredBy:'Carla Mendes',   valuePerSession:80, glosa:'nao_glosada', financialStatus:'disponivel' },
  { id: 's25', date:'2025-03-04', patient:'Patricia Vieira',  guia:'123654987 – CACI',    plano:'CACI',    fisioId:'f3', registeredBy:'Ana Silva',       valuePerSession:85, glosa:'nao_glosada', financialStatus:'disponivel' },
  // jan session regularized in feb
  { id: 's02b', date:'2025-01-10', competenceDate:'2025-01-31', patient:'João Pereira',    guia:'987654321 – Humana',  plano:'Humana',  fisioId:'f2', registeredBy:'Rafael Costa',   valuePerSession:75, glosa:'nao_glosada', financialStatus:'disponivel', regularizationDate:'2025-02-03' },
];

// Remove the duplicate from INITIAL_SESSIONS — s02b is the regularized version so s02 keeps glosa
// Actually we keep both as different records to demo the concept.
// s02 = original glosada, s02b = regularized after. We'll handle in app.

export const INITIAL_CLOSURES: Closure[] = [
  // Fechamento pago (FCH-2026-001)
  {
    id: 'FCH-2026-001',
    createdAt: '2026-08-20T10:00:00',
    paidAt: '2026-08-25T14:00:00',
    status: 'pago',
    fisioIds: ['f1', 'f2', 'f3'],
    sessions: [
      { sessionId: 's_demo2', value: 75 },
      { sessionId: 's01', value: 85 },
      { sessionId: 's03', value: 90 },
      { sessionId: 's04', value: 80 },
    ],
    periodStart: '2025-01-01',
    periodEnd: '2026-08-20',
    grossValue: 330,
    taxPercent: TAX_PERCENT,
    clinicPercent: CLINIC_PERCENT,
    taxValue: 16.5,
    clinicValue: 62.7,
    netValue: 250.8,
    perFisio: [
      { fisioId:'f1', sessionCount:3, grossValue:250, taxValue:12.5, clinicValue:47.5, netValue:190 },
      { fisioId:'f2', sessionCount:0, grossValue:0,   taxValue:0,    clinicValue:0,    netValue:0 },
      { fisioId:'f3', sessionCount:1, grossValue:80,  taxValue:4,    clinicValue:15.2, netValue:60.8 },
    ],
  },
  // Fechamento pendente (FCH-2026-003)
  {
    id: 'FCH-2026-003',
    createdAt: '2026-08-22T09:00:00',
    status: 'pendente',
    fisioIds: ['f2', 'f3'],
    sessions: [
      { sessionId: 's_demo3', value: 80 },
      { sessionId: 's09', value: 85 },
      { sessionId: 's11', value: 80 },
    ],
    periodStart: '2025-02-01',
    periodEnd: '2026-08-22',
    grossValue: 245,
    taxPercent: TAX_PERCENT,
    clinicPercent: CLINIC_PERCENT,
    taxValue: 12.25,
    clinicValue: 46.55,
    netValue: 186.20,
    perFisio: [
      { fisioId:'f2', sessionCount:2, grossValue:160, taxValue:8,    clinicValue:30.4,  netValue:121.6 },
      { fisioId:'f3', sessionCount:1, grossValue:85,  taxValue:4.25, clinicValue:16.15, netValue:64.6 },
    ],
  },
];
