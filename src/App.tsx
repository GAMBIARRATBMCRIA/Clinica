import { useState, useRef, useEffect, useMemo } from 'react';
import type { Session, FilterState, Closure, PreviewResult } from './types';
import { useStore } from './useStore';
import { FISIOTERAPEUTAS } from './data';
import { formatBRL, formatDate, formatDateTime, isEligible, getFisioColor } from './utils';
import { generatePDF } from './pdfGen';
import './index.css';

// ─── Icons (inline SVG helpers) ───────────────────────────────────────────────

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  home:      "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  users:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  treatment: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  sessions:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  fisio:     "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  plans:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  reports:   "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  financial: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  config:    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  pdf:       "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  check:     "M20 6L9 17l-5-5",
  x:         "M18 6L6 18M6 6l12 12",
  warn:      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  info:      "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  refresh:   "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  sort:      "M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4",
  chevronL:  "M15 18l-6-6 6-6",
  chevronR:  "M9 18l6-6-6-6",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const navItems = [
    { icon: Icons.home,      label: 'Início' },
    { icon: Icons.users,     label: 'Pacientes' },
    { icon: Icons.treatment, label: 'Tratamentos' },
    { icon: Icons.sessions,  label: 'Sessões' },
    { icon: Icons.fisio,     label: 'Fisioterapeutas' },
    { icon: Icons.plans,     label: 'Planos' },
    { icon: Icons.reports,   label: 'Relatórios', active: true },
    { icon: Icons.financial, label: 'Financeiro' },
    { icon: Icons.config,    label: 'Configurações' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🌿</div>
        <div className="sidebar-logo-text">
          <h2>Harmonia</h2>
          <span>Fisioterapia</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div key={item.label} className={`nav-item${item.active ? ' nav-item--active' : ''}`}>
            <Icon d={item.icon} size={18} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">GS</div>
          <div className="user-text">
            <div className="name">Gabriela Souza</div>
            <div className="role">Gerente</div>
          </div>
        </div>
        <button className="btn-icon" title="Sair">
          <Icon d={Icons.logout} size={16} />
        </button>
      </div>
    </aside>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function GlosaBadge({ glosa }: { glosa: string }) {
  return glosa === 'glosada'
    ? <span className="badge badge-red">Sim</span>
    : <span className="badge badge-green">Não</span>;
}

function FinancialBadge({ status }: { status: string }) {
  if (status === 'disponivel')  return <span className="badge badge-green">Disponível</span>;
  if (status === 'reservada')   return <span className="badge badge-amber">Reservada</span>;
  if (status === 'paga')        return <span className="badge badge-blue">Paga</span>;
  return <span className="badge badge-slate">{status}</span>;
}

function ClosureBadge({ status }: { status: string }) {
  if (status === 'pendente')  return <span className="badge badge-amber">Pendente</span>;
  if (status === 'pago')      return <span className="badge badge-green">Pago</span>;
  if (status === 'cancelado') return <span className="badge badge-slate">Cancelado</span>;
  return null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, children, footer, wide, onClose }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' modal--wide' : ''}`}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="btn-icon" onClick={onClose} id="modal-close-btn">
            <Icon d={Icons.x} size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

function ActionMenu({ session, onGlosa }: {
  session: Session;
  onGlosa: (id: string, apply: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canGlosa = session.financialStatus === 'disponivel';

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="action-menu-btn"
        onClick={() => setOpen(o => !o)}
        id={`action-menu-${session.id}`}
        title="Ações"
      >
        ···
      </button>
      {open && (
        <div className="dropdown">
          {session.glosa === 'nao_glosada' ? (
            <button
              className="dropdown-item dropdown-item--danger"
              disabled={!canGlosa}
              onClick={() => { onGlosa(session.id, true); setOpen(false); }}
            >
              <Icon d={Icons.x} size={14} /> Marcar como glosada
            </button>
          ) : (
            <button
              className="dropdown-item"
              disabled={!canGlosa}
              onClick={() => { onGlosa(session.id, false); setOpen(false); }}
            >
              <Icon d={Icons.check} size={14} /> Retirar glosa
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filters Bar ─────────────────────────────────────────────────────────────

function FiltersBar({ filters, onChange }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label className="filter-label">Período da sessão</label>
        <div className="filter-date-range">
          <input
            id="filter-date-from"
            type="date"
            className="filter-input"
            value={filters.dateFrom}
            onChange={e => set('dateFrom', e.target.value)}
          />
          <span>—</span>
          <input
            id="filter-date-to"
            type="date"
            className="filter-input"
            value={filters.dateTo}
            onChange={e => set('dateTo', e.target.value)}
          />
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">Fisioterapeuta</label>
        <select
          id="filter-fisio"
          className="filter-select"
          value={filters.fisioId}
          onChange={e => set('fisioId', e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Todos</option>
          {FISIOTERAPEUTAS.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Situação da glosa</label>
        <select
          id="filter-glosa"
          className="filter-select"
          value={filters.glosa}
          onChange={e => set('glosa', e.target.value as FilterState['glosa'])}
          style={{ minWidth: 160 }}
        >
          <option value="all">Todas</option>
          <option value="nao_glosada">Não glosadas</option>
          <option value="glosada">Glosadas</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Situação financeira</label>
        <select
          id="filter-financial"
          className="filter-select"
          value={filters.financial}
          onChange={e => set('financial', e.target.value as FilterState['financial'])}
          style={{ minWidth: 190 }}
        >
          <option value="all">Todas</option>
          <option value="disponivel">Disponível para apuração</option>
          <option value="reservada">Reservada (fechamento pendente)</option>
          <option value="paga">Paga</option>
        </select>
      </div>
    </div>
  );
}

// ─── Indicator Cards ──────────────────────────────────────────────────────────

function IndicatorCards({ indicators }: {
  indicators: {
    total: number; eligible: number; glossed: number; gross: number; net: number;
  };
}) {
  return (
    <div className="cards-row">
      <div className="card">
        <div className="card-icon card-icon--total">📋</div>
        <div className="card-content">
          <div className="label">Total de sessões</div>
          <div className="value">{indicators.total}</div>
          <div className="sub">no período consultado</div>
        </div>
      </div>
      <div className="card">
        <div className="card-icon card-icon--eligible">✅</div>
        <div className="card-content">
          <div className="label">Sessões elegíveis</div>
          <div className="value">{indicators.eligible}</div>
          <div className="sub">para pagamento</div>
        </div>
      </div>
      <div className="card">
        <div className="card-icon card-icon--glossed">⚠️</div>
        <div className="card-content">
          <div className="label">Sessões glosadas</div>
          <div className="value">{indicators.glossed}</div>
          <div className="sub">não contabilizadas</div>
        </div>
      </div>
      <div className="card">
        <div className="card-icon card-icon--gross">💰</div>
        <div className="card-content">
          <div className="label">Valor bruto (previsto)</div>
          <div className="value" style={{ fontSize: '1.05rem' }}>{formatBRL(indicators.gross)}</div>
          <div className="sub">das sessões elegíveis</div>
        </div>
      </div>
      <div className="card">
        <div className="card-icon card-icon--net">💎</div>
        <div className="card-content">
          <div className="label">Valor líquido (previsto)</div>
          <div className="value" style={{ fontSize: '1.05rem', color: 'var(--green-700)' }}>{formatBRL(indicators.net)}</div>
          <div className="sub">após impostos e % da clínica</div>
        </div>
      </div>
    </div>
  );
}

// ─── Sessions Table ───────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type SortKey = 'date' | 'patient' | 'fisio' | 'value';
type SortDir = 'asc' | 'desc';

function SessionsTable({ sessions, allSessions, onGlosa }: {
  sessions: Session[];
  allSessions: Session[];
  onGlosa: (id: string, apply: boolean) => void;
}) {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [pendingGlosa, setPendingGlosa] = useState<{ id: string; apply: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(s =>
      !q ||
      s.patient.toLowerCase().includes(q) ||
      s.guia.toLowerCase().includes(q) ||
      FISIOTERAPEUTAS.find(f => f.id === s.fisioId)?.name.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date')    cmp = a.date.localeCompare(b.date);
      if (sortKey === 'patient') cmp = a.patient.localeCompare(b.patient);
      if (sortKey === 'fisio')   cmp = (FISIOTERAPEUTAS.find(f=>f.id===a.fisioId)?.name??'').localeCompare(FISIOTERAPEUTAS.find(f=>f.id===b.fisioId)?.name??'');
      if (sortKey === 'value')   cmp = a.valuePerSession - b.valuePerSession;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleGlosaRequest = (id: string, apply: boolean) => {
    setPendingGlosa({ id, apply });
  };

  const confirmGlosa = () => {
    if (pendingGlosa) {
      onGlosa(pendingGlosa.id, pendingGlosa.apply);
      setPendingGlosa(null);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span style={{ color: 'var(--green-600)', fontSize: '.7rem' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span style={{ opacity: .3, fontSize: '.7rem' }}>↕</span>;

  return (
    <>
      <div className="section">
        <div className="section-header">
          <div>
            <div className="section-title">Sessões</div>
            <div className="section-subtitle">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} registros
            </div>
          </div>
          <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
            <div className="search-input-wrapper">
              <Icon d={Icons.search} size={15} />
              <input
                id="sessions-search"
                className="filter-input search-input"
                placeholder="Buscar paciente, guia, fisioterapeuta…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <button
              id="export-pdf-table-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => generatePDF(null, FISIOTERAPEUTAS.map(f=>f.id), allSessions, true)}
            >
              <Icon d={Icons.pdf} size={15} /> Exportar PDF
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('date')}>
                  Data <SortIcon k="date" />
                </th>
                <th className="sortable" onClick={() => handleSort('patient')}>
                  Paciente <SortIcon k="patient" />
                </th>
                <th>Guia / Plano</th>
                <th className="sortable" onClick={() => handleSort('fisio')}>
                  Fisioterapeuta <SortIcon k="fisio" />
                </th>
                <th>Registrado por</th>
                <th className="sortable" onClick={() => handleSort('value')}>
                  Valor/sessão <SortIcon k="value" />
                </th>
                <th>Glosa</th>
                <th>Situação financeira</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="table-empty">
                      <div>📭</div>
                      Nenhuma sessão encontrada para os filtros aplicados.
                    </div>
                  </td>
                </tr>
              )}
              {paged.map(s => {
                const fisio = FISIOTERAPEUTAS.find(f => f.id === s.fisioId);
                return (
                  <tr key={s.id}>
                    <td>{formatDate(s.date)}</td>
                    <td style={{ fontWeight: 500 }}>{s.patient}</td>
                    <td style={{ color: 'var(--slate-500)', fontSize: '.78rem' }}>{s.guia}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                        <div
                          className="fisio-avatar"
                          style={{ width:24, height:24, fontSize:'.6rem', background: fisio?.color ?? '#6b7280' }}
                        >
                          {fisio?.initials}
                        </div>
                        {fisio?.name}
                      </div>
                    </td>
                    <td style={{ color:'var(--slate-500)', fontSize:'.8rem' }}>{s.registeredBy}</td>
                    <td style={{ fontWeight: 600 }}>{formatBRL(s.valuePerSession)}</td>
                    <td>
                      <GlosaBadge glosa={s.glosa} />
                      {s.regularizationDate && (
                        <div style={{ fontSize:'.68rem', color:'var(--slate-400)', marginTop:2 }}>
                          Regularizada {formatDate(s.regularizationDate)}
                        </div>
                      )}
                    </td>
                    <td><FinancialBadge status={s.financialStatus} /></td>
                    <td>
                      <ActionMenu session={s} onGlosa={handleGlosaRequest} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>{sorted.length} registro{sorted.length !== 1 ? 's' : ''}</span>
          <div className="pagination-pages">
            <button
              className="page-btn"
              id="page-prev-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <Icon d={Icons.chevronL} size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  id={`page-btn-${p}`}
                  className={`page-btn${page === p ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            {totalPages > 5 && <span style={{ padding: '0 4px', color:'var(--slate-400)' }}>…</span>}
            <button
              className="page-btn"
              id="page-next-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <Icon d={Icons.chevronR} size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Glosa confirmation modal */}
      {pendingGlosa && (() => {
        const s = allSessions.find(x => x.id === pendingGlosa.id);
        return (
          <Modal
            title={pendingGlosa.apply ? 'Marcar sessão como glosada' : 'Retirar glosa da sessão'}
            subtitle="Confirme a alteração antes de prosseguir."
            onClose={() => setPendingGlosa(null)}
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setPendingGlosa(null)}>Cancelar</button>
                <button
                  id="confirm-glosa-btn"
                  className={pendingGlosa.apply ? 'btn btn-danger' : 'btn btn-primary'}
                  onClick={confirmGlosa}
                >
                  {pendingGlosa.apply ? 'Marcar como glosada' : 'Retirar glosa'}
                </button>
              </>
            }
          >
            <div className={`alert-box ${pendingGlosa.apply ? 'alert-box--red' : 'alert-box--green'}`}>
              <Icon d={Icons.warn} size={16} />
              <div>
                {pendingGlosa.apply
                  ? 'A sessão será excluída do cálculo elegível. Esta ação pode ser desfeita retirando a glosa posteriormente.'
                  : 'A sessão voltará a ser elegível para apuração. A data de regularização será registrada.'}
              </div>
            </div>
            {s && (
              <div style={{ marginTop: 14, fontSize: '.84rem', color:'var(--slate-600)' }}>
                <strong>{s.patient}</strong> · {formatDate(s.date)} · {formatBRL(s.valuePerSession)}
              </div>
            )}
          </Modal>
        );
      })()}
    </>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({ sessions, closures, onConclude }: {
  sessions: Session[];
  closures: Closure[];
  onConclude: (fisioIds: string[]) => void;
}) {
  const [selectedFisios, setSelectedFisios] = useState<string[]>(['f1', 'f2']);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showConcludeModal, setShowConcludeModal] = useState(false);

  const lastPaid = useMemo(() =>
    [...closures].filter(c=>c.status==='pago').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]
  , [closures]);

  const toggleFisio = (id: string) => {
    setSelectedFisios(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setPreview(null);
  };

  const selectAll = () => {
    setSelectedFisios(FISIOTERAPEUTAS.map(f => f.id));
    setPreview(null);
  };

  const handlePreview = () => {
    const lastPaid = closures.filter(c=>c.status==='pago').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    const periodStart = lastPaid ? lastPaid.createdAt.slice(0, 10) : '2025-01-01';
    const periodEnd   = new Date().toISOString().slice(0, 10);

    const entries = selectedFisios.map(fid => {
      const fisioSessions = sessions.filter(s => s.fisioId === fid);
      const eligible = fisioSessions.filter(s => isEligible(s));
      const glossed  = fisioSessions.filter(s => s.glosa === 'glosada');
      const gross = eligible.reduce((sum, s) => sum + s.valuePerSession, 0);
      const taxValue    = gross * 0.05;
      const clinicValue = (gross - taxValue) * 0.20;
      const netValue    = gross - taxValue - clinicValue;
      return { fisioId: fid, eligibleSessions: eligible.length, grossValue: gross, taxPercent:5, taxValue, clinicPercent:20, clinicValue, netValue, glossedSessions: glossed.length };
    });

    setPreview({
      entries,
      totalGross: entries.reduce((s,e)=>s+e.grossValue,0),
      totalNet: entries.reduce((s,e)=>s+e.netValue,0),
      totalEligible: entries.reduce((s,e)=>s+e.eligibleSessions,0),
      totalGlossed: entries.reduce((s,e)=>s+e.glossedSessions,0),
      periodStart,
      periodEnd,
    });
  };

  const totGross = preview?.totalGross ?? 0;
  const totTax   = preview ? totGross * 0.05 : 0;
  const totClinic= preview ? (totGross - totTax) * 0.20 : 0;
  const totNet   = preview?.totalNet ?? 0;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Apuração e prévia</div>
          <div className="section-subtitle">
            Selecione os profissionais, visualize a prévia e conclua o fechamento.
          </div>
        </div>
      </div>

      <div className="preview-layout">
        {/* Column 1: fisio selection */}
        <div className="preview-fisios">
          <div className="preview-fisios-title">Profissionais</div>
          <div className="fisio-check-item" style={{ paddingBottom: 8 }}>
            <input
              type="checkbox"
              id="check-all-fisios"
              checked={selectedFisios.length === FISIOTERAPEUTAS.length}
              onChange={selectAll}
            />
            <label htmlFor="check-all-fisios" style={{ fontSize:'.82rem', color:'var(--slate-600)', cursor:'pointer' }}>
              Selecionar todos
            </label>
          </div>
          {FISIOTERAPEUTAS.map(f => (
            <div className="fisio-check-item" key={f.id}>
              <input
                type="checkbox"
                id={`fisio-check-${f.id}`}
                checked={selectedFisios.includes(f.id)}
                onChange={() => toggleFisio(f.id)}
              />
              <div className="fisio-avatar" style={{ background: f.color }}>{f.initials}</div>
              <div className="fisio-info">
                <div className="fname">{f.name}</div>
                <div className="fcrefito">{f.crefito}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Column 2: params */}
        <div className="preview-params">
          <div className="preview-params-title">
            Parâmetros de cálculo
            <span className="badge badge-amber" style={{ fontSize:'.68rem' }}>demonstrativos</span>
          </div>
          <div className="param-row">
            <span className="param-label">Imposto (ex.: 5%)</span>
            <span className="param-value">5,00%</span>
          </div>
          <div className="param-row">
            <span className="param-label">Percentual da clínica (sobre o saldo)</span>
            <span className="param-value">20,00%</span>
          </div>
          <div className="preview-disclaimer">
            <Icon d={Icons.info} size={14} />
            Os valores e percentuais são apenas demonstrativos e podem ser ajustados posteriormente.
          </div>

          {preview && (
            <>
              <div className="divider" />
              <div style={{ fontSize:'.78rem', fontWeight:600, color:'var(--slate-600)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.04em' }}>
                Por profissional
              </div>
              {preview.entries.map(e => {
                const f = FISIOTERAPEUTAS.find(x=>x.id===e.fisioId);
                return (
                  <div key={e.fisioId} style={{ marginBottom:10, padding:'8px 10px', background:'var(--slate-50)', borderRadius:'var(--radius)', fontSize:'.8rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <div className="fisio-avatar" style={{ width:22,height:22,fontSize:'.58rem', background:f?.color }}>{f?.initials}</div>
                      <strong style={{ color:'var(--slate-800)' }}>{f?.name}</strong>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 8px', color:'var(--slate-600)' }}>
                      <span>Sessões elegíveis:</span><span style={{ fontWeight:600, color:'var(--slate-800)' }}>{e.eligibleSessions}</span>
                      <span>Bruto:</span><span style={{ fontWeight:600 }}>{formatBRL(e.grossValue)}</span>
                      <span>Imposto (5%):</span><span style={{ color:'var(--red-600)' }}>-{formatBRL(e.taxValue)}</span>
                      <span>Clínica (20%):</span><span style={{ color:'var(--red-600)' }}>-{formatBRL(e.clinicValue)}</span>
                      <span style={{ fontWeight:600, color:'var(--slate-800)' }}>Líquido:</span>
                      <span style={{ fontWeight:700, color:'var(--green-700)' }}>{formatBRL(e.netValue)}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Column 3: summary */}
        <div className="preview-summary">
          <div className="preview-summary-title">Resumo da prévia</div>
          {!preview ? (
            <div style={{ color:'var(--slate-400)', fontSize:'.83rem', marginTop:20 }}>
              Clique em "Gerar prévia" para visualizar os valores calculados.
            </div>
          ) : (
            <>
              <div className="summary-row">
                <span className="s-label">Sessões elegíveis</span>
                <span className="s-value">{preview.totalEligible}</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Sessões glosadas</span>
                <span className="s-value">{preview.totalGlossed}</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Valor bruto</span>
                <span className="s-value">{formatBRL(totGross)}</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Impostos (5%)</span>
                <span className="s-value s-value--deduction">- {formatBRL(totTax)}</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Parcela da clínica (20%)</span>
                <span className="s-value s-value--deduction">- {formatBRL(totClinic)}</span>
              </div>
              <div className="divider" style={{ margin:'8px 0' }} />
              <div className="summary-row summary-row--net">
                <span className="s-label">Valor líquido (previsto)</span>
                <span className="s-value">{formatBRL(totNet)}</span>
              </div>
              <div style={{ marginTop:10, fontSize:'.72rem', color:'var(--slate-400)' }}>
                Período: {formatDate(preview.periodStart)} a {formatDate(preview.periodEnd)}
              </div>

              <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
                <button
                  id="export-preview-pdf-btn"
                  className="btn btn-ghost btn-sm"
                  onClick={() => generatePDF(null, selectedFisios, sessions, true)}
                >
                  <Icon d={Icons.pdf} size={14} /> Exportar prévia PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="preview-actions">
        <div style={{ fontSize:'.78rem', color:'var(--slate-500)' }}>
          {selectedFisios.length === 0
            ? 'Selecione ao menos um profissional'
            : `${selectedFisios.length} profissional(is) selecionado(s)`}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {preview && (
            <button className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>
              Limpar seleção
            </button>
          )}
          <button
            id="generate-preview-btn"
            className="btn btn-secondary"
            disabled={selectedFisios.length === 0}
            onClick={handlePreview}
          >
            📊 Gerar prévia
          </button>
          <button
            id="conclude-closure-btn"
            className="btn btn-primary"
            disabled={!preview || selectedFisios.length === 0}
            onClick={() => setShowConcludeModal(true)}
          >
            🔒 Concluir fechamento
          </button>
        </div>
      </div>

      {showConcludeModal && preview && (
        <Modal
          title="Concluir fechamento"
          subtitle="Confirme antes de prosseguir. As sessões elegíveis serão reservadas."
          onClose={() => setShowConcludeModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowConcludeModal(false)}>Cancelar</button>
              <button
                id="confirm-conclude-btn"
                className="btn btn-primary"
                onClick={() => {
                  onConclude(selectedFisios);
                  setShowConcludeModal(false);
                  setPreview(null);
                }}
              >
                Confirmar fechamento
              </button>
            </>
          }
        >
          <div className="alert-box alert-box--amber" style={{ marginBottom:14 }}>
            <Icon d={Icons.warn} size={16} />
            As sessões elegíveis serão reservadas e não poderão ser incluídas em outro fechamento até que este seja cancelado.
          </div>
          <div style={{ fontSize:'.84rem', display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'var(--slate-500)' }}>Profissionais</span>
              <span style={{ fontWeight:600 }}>{selectedFisios.map(id=>FISIOTERAPEUTAS.find(f=>f.id===id)?.name).join(', ')}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'var(--slate-500)' }}>Sessões elegíveis</span>
              <span style={{ fontWeight:600 }}>{preview.totalEligible}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'var(--slate-500)' }}>Valor bruto</span>
              <span style={{ fontWeight:600 }}>{formatBRL(preview.totalGross)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'var(--slate-500)' }}>Valor líquido</span>
              <span style={{ fontWeight:700, color:'var(--green-700)' }}>{formatBRL(preview.totalNet)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Closures Panel ───────────────────────────────────────────────────────────

function ClosuresPanel({ closures, sessions }: {
  closures: Closure[];
  sessions: Session[];
  onCancel: (id: string) => void;
  onConfirmPayment: (id: string) => void;
}) {
  return <></>;
}

function ClosuresPanelFull({ closures, sessions, onCancel, onConfirmPayment }: {
  closures: Closure[];
  sessions: Session[];
  onCancel: (id: string) => void;
  onConfirmPayment: (id: string) => void;
}) {
  const [tab, setTab] = useState<'pendente' | 'pago' | 'all'>('pendente');
  const [pendingAction, setPendingAction] = useState<{ type: 'cancel' | 'pay'; id: string } | null>(null);

  const shown = closures.filter(c => {
    if (tab === 'all') return true;
    return c.status === tab;
  });

  const pending = closures.filter(c => c.status === 'pendente').length;
  const paid    = closures.filter(c => c.status === 'pago').length;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Fechamentos</div>
          <div className="section-subtitle">Consulte e gerencie os fechamentos de pagamento.</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab==='pendente' ? ' active' : ''}`} onClick={() => setTab('pendente')}>
          Pendentes <span className="count-bubble">{pending}</span>
        </button>
        <button className={`tab-btn${tab==='pago' ? ' active' : ''}`} onClick={() => setTab('pago')}>
          Pagos <span className="count-bubble">{paid}</span>
        </button>
        <button className={`tab-btn${tab==='all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          Todos <span className="count-bubble">{closures.length}</span>
        </button>
      </div>

      <div className="section-body">
        {shown.length === 0 && (
          <div className="table-empty">
            <div>📂</div>
            Nenhum fechamento {tab === 'pendente' ? 'pendente' : tab === 'pago' ? 'pago' : ''} encontrado.
          </div>
        )}
        <div className="closure-list">
          {shown.map(c => (
            <div key={c.id} className="closure-card">
              <div className="closure-card-header">
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <ClosureBadge status={c.status} />
                    <span className="closure-id">{c.id}</span>
                  </div>
                  <div style={{ fontSize:'.75rem', color:'var(--slate-400)', marginTop:2 }}>
                    Criado em {formatDateTime(c.createdAt)}
                    {c.paidAt && <> · Pago em {formatDateTime(c.paidAt)}</>}
                    {c.cancelledAt && <> · Cancelado em {formatDateTime(c.cancelledAt)}</>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button
                    id={`export-closure-pdf-${c.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() => generatePDF(c, c.fisioIds, sessions, false, `fechamento-${c.id}`)}
                  >
                    <Icon d={Icons.pdf} size={14} /> PDF
                  </button>
                  {c.status === 'pendente' && (
                    <>
                      <button
                        id={`cancel-closure-${c.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => setPendingAction({ type:'cancel', id:c.id })}
                      >
                        Cancelar
                      </button>
                      <button
                        id={`confirm-payment-${c.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => setPendingAction({ type:'pay', id:c.id })}
                      >
                        <Icon d={Icons.check} size={14} /> Confirmar pagamento
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="closure-card-body">
                <div className="closure-info-item">
                  <div className="ci-label">Profissionais</div>
                  <div className="ci-value">
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {c.fisioIds.map(fid => {
                        const f = FISIOTERAPEUTAS.find(x=>x.id===fid);
                        return (
                          <div key={fid} className="fisio-avatar" style={{ width:24,height:24,fontSize:'.6rem', background:f?.color }}>
                            {f?.initials}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize:'.78rem', color:'var(--slate-500)', marginTop:2 }}>
                      {c.fisioIds.map(fid=>FISIOTERAPEUTAS.find(f=>f.id===fid)?.name).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="closure-info-item">
                  <div className="ci-label">Período</div>
                  <div className="ci-value">{formatDate(c.periodStart)} — {formatDate(c.periodEnd)}</div>
                </div>
                <div className="closure-info-item">
                  <div className="ci-label">Sessões · Bruto</div>
                  <div className="ci-value">{c.sessions.length} sessões · {formatBRL(c.grossValue)}</div>
                </div>
                <div className="closure-info-item">
                  <div className="ci-label">Valor líquido</div>
                  <div className="ci-value" style={{ color:'var(--green-700)', fontSize:'1rem' }}>{formatBRL(c.netValue)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm cancel */}
      {pendingAction?.type === 'cancel' && (() => {
        const c = closures.find(x=>x.id===pendingAction.id);
        return (
          <Modal
            title="Cancelar fechamento"
            subtitle="Esta ação liberará todas as sessões reservadas."
            onClose={() => setPendingAction(null)}
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setPendingAction(null)}>Voltar</button>
                <button
                  id="confirm-cancel-closure-btn"
                  className="btn btn-danger"
                  onClick={() => { onCancel(pendingAction.id); setPendingAction(null); }}
                >
                  Cancelar fechamento
                </button>
              </>
            }
          >
            <div className="alert-box alert-box--red" style={{ marginBottom:14 }}>
              <Icon d={Icons.warn} size={16} />
              As sessões reservadas neste fechamento voltarão a ficar disponíveis para nova apuração.
            </div>
            {c && (
              <div style={{ fontSize:'.84rem', display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Identificador</span>
                  <span style={{ fontWeight:600, fontFamily:'monospace', fontSize:'.78rem' }}>{c.id}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Sessões que serão liberadas</span>
                  <span style={{ fontWeight:600 }}>{c.sessions.length}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Valor que deixará de ser reservado</span>
                  <span style={{ fontWeight:600 }}>{formatBRL(c.grossValue)}</span>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Confirm payment */}
      {pendingAction?.type === 'pay' && (() => {
        const c = closures.find(x=>x.id===pendingAction.id);
        return (
          <Modal
            title="Confirmar pagamento"
            subtitle="Após confirmação, as sessões serão marcadas como pagas."
            onClose={() => setPendingAction(null)}
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setPendingAction(null)}>Voltar</button>
                <button
                  id="confirm-payment-modal-btn"
                  className="btn btn-primary"
                  onClick={() => { onConfirmPayment(pendingAction.id); setPendingAction(null); }}
                >
                  <Icon d={Icons.check} size={14} /> Confirmar pagamento
                </button>
              </>
            }
          >
            <div className="alert-box alert-box--green" style={{ marginBottom:14 }}>
              <Icon d={Icons.check} size={16} />
              O fechamento será marcado como pago. As sessões vinculadas não poderão ser reutilizadas.
            </div>
            {c && (
              <div style={{ fontSize:'.84rem', display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Profissionais</span>
                  <span style={{ fontWeight:600 }}>{c.fisioIds.map(id=>FISIOTERAPEUTAS.find(f=>f.id===id)?.name).join(', ')}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Período</span>
                  <span style={{ fontWeight:600 }}>{formatDate(c.periodStart)} — {formatDate(c.periodEnd)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Sessões</span>
                  <span style={{ fontWeight:600 }}>{c.sessions.length}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--slate-500)' }}>Valor bruto</span>
                  <span style={{ fontWeight:600 }}>{formatBRL(c.grossValue)}</span>
                </div>
                <div className="divider" style={{ margin:'4px 0' }} />
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:700, color:'var(--slate-800)' }}>Valor líquido a pagar</span>
                  <span style={{ fontWeight:700, color:'var(--green-700)', fontSize:'1rem' }}>{formatBRL(c.netValue)}</span>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}

// ─── Calc Details ─────────────────────────────────────────────────────────────

function CalcDetails({ sessions }: { sessions: Session[] }) {
  const gross = sessions.filter(isEligible).reduce((s,x)=>s+x.valuePerSession,0);
  const tax   = gross * 0.05;
  const clinic= (gross - tax) * 0.20;
  const net   = gross - tax - clinic;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Detalhamento do cálculo</div>
          <div className="section-subtitle">Como os valores são obtidos (parâmetros demonstrativos, sujeitos à validação).</div>
        </div>
      </div>
      <div className="section-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div>
            <div style={{ fontSize:'.78rem', fontWeight:600, color:'var(--slate-600)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.04em' }}>
              Fórmula geral
            </div>
            {[
              ['1. Valor bruto', 'Soma dos valores de todas as sessões elegíveis (não glosadas + disponíveis).', formatBRL(gross)],
              ['2. Imposto (5%)', 'Percentual aplicado sobre o valor bruto.', `- ${formatBRL(tax)}`],
              ['3. Saldo após imposto', 'Bruto descontado o imposto.', formatBRL(gross - tax)],
              ['4. Parcela da clínica (20%)', 'Percentual aplicado sobre o saldo após imposto.', `- ${formatBRL(clinic)}`],
              ['5. Valor líquido', 'Valor final a ser pago ao profissional.', formatBRL(net)],
            ].map(([step, desc, val]) => (
              <div key={step} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid var(--slate-100)', gap:8 }}>
                <div>
                  <div style={{ fontSize:'.83rem', fontWeight:600, color:'var(--slate-800)' }}>{step}</div>
                  <div style={{ fontSize:'.75rem', color:'var(--slate-500)', marginTop:1 }}>{desc}</div>
                </div>
                <div style={{ fontWeight:700, color:'var(--slate-800)', whiteSpace:'nowrap', fontSize:'.86rem' }}>{val}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:'.78rem', fontWeight:600, color:'var(--slate-600)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.04em' }}>
              Memória de cálculo atual
            </div>
            <div className="alert-box alert-box--amber">
              <Icon d={Icons.info} size={16} />
              <span>
                Bruto {formatBRL(gross)} → − Imposto 5% ({formatBRL(tax)}) = {formatBRL(gross-tax)} → − Parcela clínica 20% ({formatBRL(clinic)}) = Líquido <strong>{formatBRL(net)}</strong>
              </span>
            </div>
            <div style={{ marginTop:16, fontSize:'.78rem', color:'var(--slate-500)', lineHeight:1.7 }}>
              <p><strong>Observação:</strong> Estes percentuais são demonstrativos e ainda precisam ser validados com a cliente. Regras por convênio ou configurações avançadas por profissional poderão ser implementadas na versão definitiva do sistema.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  dateFrom: '2025-02-01',
  dateTo:   '2025-03-31',
  fisioId:  '',
  glosa:    'all',
  financial:'all',
};

export default function App() {
  const store = useStore();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showReset, setShowReset] = useState(false);

  const filteredSessions = store.getFilteredSessions(filters);
  const indicators       = store.getIndicators(filteredSessions);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-header-icon">
              <Icon d={Icons.reports} size={22} />
            </div>
            <div>
              <h1>Relatório de Produção e Pagamento</h1>
              <p>Consulte a produção dos fisioterapeutas, gere uma prévia, conclua o fechamento e confirme o pagamento.</p>
            </div>
          </div>
          <div className="page-header-actions">
            <button
              id="restore-demo-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowReset(true)}
              title="Restaurar dados da demonstração"
            >
              <Icon d={Icons.refresh} size={15} /> Restaurar demonstração
            </button>
          </div>
        </div>

        <div className="page-body">
          {/* Filters */}
          <FiltersBar filters={filters} onChange={setFilters} />

          {/* Indicator cards */}
          <IndicatorCards indicators={indicators} />

          {/* Sessions table */}
          <SessionsTable
            sessions={filteredSessions}
            allSessions={store.sessions}
            onGlosa={(id, apply) => apply ? store.applyGlosa(id) : store.removeGlosa(id)}
          />

          {/* Preview & conclude */}
          <PreviewPanel
            sessions={store.sessions}
            closures={store.closures}
            onConclude={fisioIds => store.concludeClosure(fisioIds)}
          />

          {/* Closures management */}
          <ClosuresPanelFull
            closures={store.closures}
            sessions={store.sessions}
            onCancel={store.cancelClosure}
            onConfirmPayment={store.confirmPayment}
          />

          {/* Calc details */}
          <CalcDetails sessions={store.sessions} />
        </div>
      </main>

      {/* Reset modal */}
      {showReset && (
        <Modal
          title="Restaurar dados da demonstração"
          subtitle="Todos os estados serão redefinidos para o cenário inicial."
          onClose={() => setShowReset(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancelar</button>
              <button
                id="confirm-reset-btn"
                className="btn btn-danger"
                onClick={() => { store.resetDemo(); setShowReset(false); }}
              >
                <Icon d={Icons.refresh} size={14} /> Restaurar
              </button>
            </>
          }
        >
          <div className="alert-box alert-box--amber">
            <Icon d={Icons.warn} size={16} />
            Esta ação redefine todos os fechamentos, glosas e situações financeiras para o estado inicial da demonstração.
          </div>
        </Modal>
      )}
    </div>
  );
}
