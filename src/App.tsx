import { useState, useRef, useEffect, useMemo } from 'react';
import type { Session, FilterState, Closure, PreviewResult } from './types';
import { useStore } from './useStore';
import { FISIOTERAPEUTAS } from './data';
import { formatBRL, formatDate, formatDateTime, isEligible, calcNet, formatClosureCode } from './utils';
import { generatePDF } from './pdfGen';
import './index.css';

// ─── Icons (inline SVG helpers) ───────────────────────────────────────────────

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  treatment: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  sessions: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  fisio: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  plans: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  reports: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  financial: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  config: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  pdf: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  warn: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  sort: "M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  pencil: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  chevronL: "M15 18l-6-6 6-6",
  chevronR: "M9 18l6-6-6-6",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navItems = [
    { icon: Icons.home, label: 'Início' },
    { icon: Icons.users, label: 'Pacientes' },
    { icon: Icons.treatment, label: 'Tratamentos' },
    { icon: Icons.sessions, label: 'Sessões' },
    { icon: Icons.fisio, label: 'Fisioterapeutas' },
    { icon: Icons.plans, label: 'Planos' },
    { icon: Icons.reports, label: 'Relatórios', active: true },
    { icon: Icons.financial, label: 'Financeiro' },
    { icon: Icons.config, label: 'Configurações' },
  ];

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div
        className="sidebar-logo"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexDirection: collapsed ? 'column' : 'row',
          padding: collapsed ? '12px 6px' : '10px 10px 10px 12px',
          gap: collapsed ? 8 : 4,
        }}
      >
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
            <img
              src="/logo.png"
              alt="Harmonia Fisioterapia"
              style={{ width: 'auto', maxHeight: 85, maxWidth: 130, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <img
            src="/logo.png"
            alt="Harmonia Fisioterapia"
            style={{ width: 34, height: 34, objectFit: 'contain' }}
          />
        )}

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggle}
          id="toggle-sidebar-btn"
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          <Icon d={collapsed ? Icons.chevronR : Icons.chevronL} size={14} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.label}
            className={`nav-item${item.active ? ' nav-item--active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <Icon d={item.icon} size={18} />
            {!collapsed && <span>{item.label}</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar" title="Gabriela Souza · Gerente">GS</div>
          {!collapsed && (
            <div className="user-text">
              <div className="name">Gabriela Souza</div>
              <div className="role">Gerente</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="btn-icon" title="Sair">
            <Icon d={Icons.logout} size={16} />
          </button>
        )}
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

function FinancialBadge({ status, closureId }: { status: string; closureId?: string }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {status === 'disponivel' && (
        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Disponível</span>
      )}
      {status === 'paga' && (
        <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Fechada · paga</span>
      )}
      {status === 'reservada' && (
        <span className="badge" style={{ background: '#f3e8ff', color: '#7e22ce' }}>Reservada</span>
      )}
      {status !== 'disponivel' && status !== 'paga' && status !== 'reservada' && (
        <span className="badge badge-slate">{status}</span>
      )}
      {closureId && (
        <span
          style={{
            fontSize: '.68rem',
            color: 'var(--slate-400)',
            marginTop: 2,
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
            fontWeight: 500,
          }}
          title={`Vinculado ao fechamento ${formatClosureCode(closureId)}`}
        >
          {formatClosureCode(closureId)}
        </span>
      )}
    </div>
  );
}

function ClosureBadge({ status }: { status: string }) {
  if (status === 'pendente') return <span className="badge badge-amber">Pendente</span>;
  if (status === 'pago') return <span className="badge badge-green">Pago</span>;
  if (status === 'cancelado') return <span className="badge badge-slate">Cancelado</span>;
  return null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, children, footer, wide, xl, onClose }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  xl?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${xl ? ' modal--xl' : wide ? ' modal--wide' : ''}`}>
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

// ─── Edit Session Modal ───────────────────────────────────────────────────────

function EditSessionModal({
  session,
  onClose,
  onSave,
}: {
  session: Session;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Session>) => void;
}) {
  const [patient, setPatient] = useState(session.patient);
  const [guia, setGuia] = useState(session.guia);
  const [date, setDate] = useState(session.date);
  const [competenceDate, setCompetenceDate] = useState(session.competenceDate || '');
  const [valuePerSession, setValuePerSession] = useState(session.valuePerSession);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(session.id, {
      patient,
      guia,
      date,
      competenceDate: competenceDate || undefined,
      valuePerSession: Number(valuePerSession) || session.valuePerSession,
    });
    onClose();
  };

  return (
    <Modal
      title="Editar informações da sessão"
      subtitle={`Sessão ID: ${session.id}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="edit-session-form" className="btn btn-primary btn-sm">
            Salvar alterações
          </button>
        </>
      }
    >
      <form id="edit-session-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="filter-group">
          <label className="filter-label">Paciente</label>
          <input
            className="filter-input"
            value={patient}
            onChange={e => setPatient(e.target.value)}
            required
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Guia / Convênio</label>
          <input
            className="filter-input"
            value={guia}
            onChange={e => setGuia(e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="filter-group">
            <label className="filter-label">Data da sessão</label>
            <input
              type="date"
              className="filter-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Data de competência</label>
            <input
              type="date"
              className="filter-input"
              value={competenceDate}
              onChange={e => setCompetenceDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Valor por sessão (R$)</label>
          <input
            type="number"
            step="0.01"
            className="filter-input"
            value={valuePerSession}
            onChange={e => setValuePerSession(Number(e.target.value))}
            required
          />
        </div>
      </form>
    </Modal>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

function ActionMenu({
  session,
  onGlosa,
  onEditSession,
  trigger = 'dots',
}: {
  session: Session;
  onGlosa: (id: string, apply: boolean) => void;
  onEditSession?: (session: Session) => void;
  trigger?: 'dots' | 'pencil';
}) {
  const [open, setOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelowWindow = window.innerHeight - rect.bottom;
      const tableWrapper = ref.current.closest('.table-wrapper') || ref.current.closest('.section') || ref.current.closest('.modal-body');
      let spaceBelowWrapper = 999;
      if (tableWrapper) {
        const wrapperRect = tableWrapper.getBoundingClientRect();
        spaceBelowWrapper = wrapperRect.bottom - rect.bottom;
      }
      // Se houver menos de 150px de espaço abaixo (na janela ou na tabela), abre para cima!
      setOpenUpwards(spaceBelowWindow < 150 || spaceBelowWrapper < 150);
    }
    setOpen(o => !o);
  };

  const canGlosa = session.financialStatus === 'disponivel';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      {trigger === 'pencil' ? (
        <button
          className="btn-icon"
          onClick={handleToggle}
          id={`pencil-action-${session.id}`}
          title="Opções da sessão"
          style={{ width: 22, height: 22, color: 'var(--brand-600)', background: open ? 'var(--brand-50)' : undefined }}
        >
          <Icon d={Icons.pencil} size={13} />
        </button>
      ) : (
        <button
          className="action-menu-btn"
          onClick={handleToggle}
          id={`action-menu-${session.id}`}
          title="Ações"
        >
          ···
        </button>
      )}
      {open && (
        <div
          className={`dropdown ${openUpwards ? 'dropdown--up' : ''}`}
          style={{ right: 0, minWidth: 200, zIndex: 100 }}
        >
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

          <button
            className="dropdown-item"
            onClick={() => {
              setOpen(false);
              onEditSession?.(session);
            }}
          >
            <Icon d={Icons.pencil} size={14} /> Editar informações
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Filters Bar ─────────────────────────────────────────────────────────────

function FiltersBar({ filters, onChange, sessions }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  sessions?: Session[];
}) {
  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value });

  const availablePlans = useMemo(() => {
    const fromSessions = sessions ? sessions.map(s => s.plano) : [];
    const all = ['Unimed', 'Humana', 'CACI', 'IAPEP', ...fromSessions];
    return Array.from(new Set(all.filter(Boolean))).sort();
  }, [sessions]);

  const hasActiveFilters = Boolean(
    filters.fisioId ||
    filters.plano ||
    filters.glosa !== 'all' ||
    filters.financial !== 'all' ||
    filters.dateFrom !== '2025-01-01' ||
    filters.dateTo !== '2027-12-31'
  );

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
        <label className="filter-label">Plano de saúde</label>
        <select
          id="filter-plano"
          className="filter-select"
          value={filters.plano}
          onChange={e => set('plano', e.target.value)}
          style={{ minWidth: 150 }}
        >
          <option value="">Todos os planos</option>
          {availablePlans.map(p => (
            <option key={p} value={p}>{p}</option>
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
          style={{ minWidth: 150 }}
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
          style={{ minWidth: 180 }}
        >
          <option value="all">Todas</option>
          <option value="disponivel">Disponível para apuração</option>
          <option value="reservada">Reservada (fechamento pendente)</option>
          <option value="paga">Paga</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ height: 36, alignSelf: 'flex-end', marginLeft: 'auto' }}
          onClick={() => onChange({
            dateFrom: '2025-01-01',
            dateTo: '2027-12-31',
            fisioId: '',
            plano: '',
            glosa: 'all',
            financial: 'all',
          })}
          title="Restaurar filtros padrão"
        >
          <Icon d={Icons.refresh} size={13} /> Limpar filtros
        </button>
      )}
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

function SessionsTable({ sessions, allSessions, onGlosa, onUpdateSession }: {
  sessions: Session[];
  allSessions: Session[];
  onGlosa: (id: string, apply: boolean) => void;
  onUpdateSession?: (id: string, updates: Partial<Session>) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [pendingGlosa, setPendingGlosa] = useState<{ id: string; apply: boolean } | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(s =>
      !q ||
      s.patient.toLowerCase().includes(q) ||
      s.guia.toLowerCase().includes(q) ||
      (s.plano && s.plano.toLowerCase().includes(q)) ||
      FISIOTERAPEUTAS.find(f => f.id === s.fisioId)?.name.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      if (sortKey === 'patient') cmp = a.patient.localeCompare(b.patient);
      if (sortKey === 'fisio') cmp = (FISIOTERAPEUTAS.find(f => f.id === a.fisioId)?.name ?? '').localeCompare(FISIOTERAPEUTAS.find(f => f.id === b.fisioId)?.name ?? '');
      if (sortKey === 'value') cmp = a.valuePerSession - b.valuePerSession;
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
              onClick={() => generatePDF(null, FISIOTERAPEUTAS.map(f => f.id), allSessions, true)}
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
                    <td>
                      <div>{formatDate(s.date)}</div>
                      {s.competenceDate && (
                        <div style={{ fontSize: '.68rem', color: '#0d9488', marginTop: 2, fontWeight: 500 }}>
                          Competência {formatDate(s.competenceDate)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.patient}</td>
                    <td style={{ color: 'var(--slate-500)', fontSize: '.78rem' }}>{s.guia}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          className="fisio-avatar"
                          style={{ width: 24, height: 24, fontSize: '.6rem', background: fisio?.color ?? '#6b7280' }}
                        >
                          {fisio?.initials}
                        </div>
                        {fisio?.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--slate-500)', fontSize: '.8rem' }}>{s.registeredBy}</td>
                    <td style={{ fontWeight: 600 }}>{formatBRL(s.valuePerSession)}</td>
                    <td>
                      <GlosaBadge glosa={s.glosa} />
                      {s.regularizationDate && (
                        <div style={{ fontSize: '.68rem', color: 'var(--slate-400)', marginTop: 2 }}>
                          Regularizada {formatDate(s.regularizationDate)}
                        </div>
                      )}
                    </td>
                    <td><FinancialBadge status={s.financialStatus} closureId={s.closureId} /></td>
                    <td>
                      <ActionMenu
                        session={s}
                        onGlosa={handleGlosaRequest}
                        onEditSession={setEditingSession}
                      />
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
            {totalPages > 5 && <span style={{ padding: '0 4px', color: 'var(--slate-400)' }}>…</span>}
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
              <div style={{ marginTop: 14, fontSize: '.84rem', color: 'var(--slate-600)' }}>
                <strong>{s.patient}</strong> · {formatDate(s.date)} · {formatBRL(s.valuePerSession)}
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Edit session modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={(id, updates) => {
            onUpdateSession?.(id, updates);
            setEditingSession(null);
          }}
        />
      )}
    </>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

// ─── Apuração e Prévia Panel ──────────────────────────────────────────────────

// ─── Fisio Multi-Select Dropdown ──────────────────────────────────────────────

function FisioMultiSelectDropdown({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(FISIOTERAPEUTAS.map(f => f.id));
  };

  const handleDeselectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const toggleOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const labelText = useMemo(() => {
    if (selected.length === 0) return 'Nenhum profissional selecionado';
    if (selected.length === FISIOTERAPEUTAS.length) return `Todos selecionados (${FISIOTERAPEUTAS.length})`;
    if (selected.length === 1) {
      const f = FISIOTERAPEUTAS.find(x => x.id === selected[0]);
      return f?.name ?? '1 profissional';
    }
    return `${selected.length} profissionais selecionados`;
  }, [selected]);

  return (
    <div className="filter-group" ref={containerRef} style={{ position: 'relative' }}>
      <label className="filter-label">Fisioterapeutas</label>
      <button
        type="button"
        id="fisio-multiselect-dropdown-btn"
        className="filter-select"
        onClick={() => setOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: 240,
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '.75rem',
          height: 34,
          fontFamily: 'inherit',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Icon d={Icons.fisio} size={14} />
          <span style={{ fontWeight: selected.length > 0 ? 600 : 400, color: selected.length > 0 ? 'var(--slate-800)' : 'var(--slate-400)' }}>
            {labelText}
          </span>
        </div>
        <span style={{ fontSize: '.65rem', color: 'var(--slate-400)', marginLeft: 8 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          className="dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 300,
            zIndex: 100,
            background: '#fff',
            border: '1px solid var(--slate-200)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            padding: '6px 0',
          }}
        >
          {/* Quick Actions: Marcar todos e Desmarcar todos */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px 8px',
              borderBottom: '1px solid var(--slate-100)',
              background: 'var(--slate-50)',
            }}
          >
            <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--slate-600)' }}>
              {selected.length} de {FISIOTERAPEUTAS.length} selecionados
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                id="dropdown-select-all-btn"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '.68rem', padding: '2px 8px', height: 22, color: 'var(--brand-600)', borderColor: 'var(--brand-300)', fontWeight: 600 }}
                onClick={handleSelectAll}
                title="Marcar todos os profissionais"
              >
                Marcar todos
              </button>
              <button
                type="button"
                id="dropdown-deselect-all-btn"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '.68rem', padding: '2px 8px', height: 22, color: 'var(--red-600)', borderColor: 'var(--red-200)' }}
                onClick={handleDeselectAll}
                title="Desmarcar todos os profissionais"
              >
                Desmarcar todos
              </button>
            </div>
          </div>

          {/* List of professionals with checkboxes */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {FISIOTERAPEUTAS.map(f => {
              const isChecked = selected.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={e => toggleOne(f.id, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isChecked ? 'var(--brand-50)' : 'transparent',
                    borderLeft: isChecked ? '3px solid var(--brand-600)' : '3px solid transparent',
                    transition: 'background var(--transition)',
                    fontSize: '.75rem',
                  }}
                  onMouseEnter={e => {
                    if (!isChecked) e.currentTarget.style.background = 'var(--slate-100)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isChecked ? 'var(--brand-50)' : 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    id={`dropdown-fisio-${f.id}`}
                    checked={isChecked}
                    readOnly
                    style={{ pointerEvents: 'none', cursor: 'pointer', accentColor: 'var(--brand-600)' }}
                  />
                  <div
                    className="fisio-avatar"
                    style={{ width: 22, height: 22, fontSize: '.6rem', background: f.color }}
                  >
                    {f.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--slate-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '.68rem', color: 'var(--slate-400)' }}>
                      {f.crefito}
                    </div>
                  </div>
                  {isChecked && (
                    <span style={{ fontSize: '.65rem', color: 'var(--brand-600)', fontWeight: 600 }}>
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note in dropdown */}
          <div style={{ padding: '6px 12px 2px', borderTop: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '.7rem', padding: '2px 10px', height: 24 }}
              onClick={e => { e.stopPropagation(); setOpen(false); }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Apuração e Prévia Panel ──────────────────────────────────────────────────

function ApuracaoPreviewPanel({
  sessions,
  closures,
  onConclude,
  onGlosa,
  onUpdateSession,
}: {
  sessions: Session[];
  closures: Closure[];
  onConclude: (fisioIds: string[], taxPct: number, clinicPct: number) => void;
  onGlosa: (id: string, apply: boolean) => void;
  onUpdateSession?: (id: string, updates: Partial<Session>) => void;
}) {
  const [selectedFisios, setSelectedFisios] = useState<string[]>([]);
  const [taxPct, setTaxPct] = useState<number | string>(5);
  const [clinicPct, setClinicPct] = useState<number | string>(50);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [activeFisioId, setActiveFisioId] = useState<string>(FISIOTERAPEUTAS[0]?.id || 'all');
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [pendingGlosa, setPendingGlosa] = useState<{ id: string; apply: boolean } | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const confirmGlosa = () => {
    if (pendingGlosa) {
      onGlosa(pendingGlosa.id, pendingGlosa.apply);
      setPendingGlosa(null);
    }
  };

  const calculatePreview = (fisioIds: string[], tax: number | string, clinic: number | string) => {
    if (!fisioIds || fisioIds.length === 0) {
      setPreview(null);
      return;
    }

    try {
      const lastPaid = Array.isArray(closures)
        ? [...closures]
          .filter(c => c && c.status === 'pago')
          .sort((a, b) => ((b.createdAt || '').localeCompare(a.createdAt || '')))[0]
        : undefined;

      const periodStart = lastPaid?.createdAt ? lastPaid.createdAt.slice(0, 10) : '2025-01-01';
      const periodEnd = new Date().toISOString().slice(0, 10);

      const parsedTax = parseFloat(String(tax));
      const safeTax = Number.isFinite(parsedTax) && parsedTax >= 0 ? parsedTax : 5;
      const parsedClinic = parseFloat(String(clinic));
      const safeClinic = Number.isFinite(parsedClinic) && parsedClinic >= 0 ? parsedClinic : 50;

      const entries = fisioIds.map(fid => {
        const fisioSessions = (sessions || []).filter(s => s.fisioId === fid);
        const eligible = fisioSessions.filter(isEligible);
        const glossed = fisioSessions.filter(s => s.glosa === 'glosada');
        const gross = eligible.reduce((sum, s) => sum + (s.valuePerSession || 0), 0);
        const { taxValue, clinicValue, netValue } = calcNet(gross, safeTax, safeClinic);
        return {
          fisioId: fid,
          eligibleSessions: eligible.length,
          grossValue: gross,
          taxPercent: safeTax,
          taxValue,
          clinicPercent: safeClinic,
          clinicValue,
          netValue,
          glossedSessions: glossed.length,
        };
      });

      const newPreview: PreviewResult = {
        entries,
        totalGross: entries.reduce((s, e) => s + e.grossValue, 0),
        totalNet: entries.reduce((s, e) => s + e.netValue, 0),
        totalEligible: entries.reduce((s, e) => s + e.eligibleSessions, 0),
        totalGlossed: entries.reduce((s, e) => s + e.glossedSessions, 0),
        periodStart,
        periodEnd,
      };

      setPreview(newPreview);

      // Default to the first selected fisio so tables are immediately visible
      if (fisioIds.length > 0 && (!activeFisioId || !fisioIds.includes(activeFisioId))) {
        setActiveFisioId(fisioIds[0]);
      }
    } catch (err) {
      console.error('Error generating preview:', err);
    }
  };

  // Preview is generated automatically when professionals are selected

  const parsedTax = parseFloat(String(taxPct));
  const safeTaxPct = Number.isFinite(parsedTax) && parsedTax >= 0 ? parsedTax : 5;
  const parsedClinic = parseFloat(String(clinicPct));
  const safeClinicPct = Number.isFinite(parsedClinic) && parsedClinic >= 0 ? parsedClinic : 50;

  const totGross = preview?.totalGross ?? 0;
  const totTax = preview ? totGross * (safeTaxPct / 100) : 0;
  const totClinic = preview ? (totGross - totTax) * (safeClinicPct / 100) : 0;
  const totNet = preview?.totalNet ?? 0;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Apuração e Prévia</div>
          <div className="section-subtitle">
            Configure os percentuais, selecione os profissionais no dropbox e audite os demonstrativos idênticos ao PDF.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {preview && (
            <button
              id="export-preview-pdf-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => generatePDF(null, selectedFisios, sessions, true, undefined, safeTaxPct, safeClinicPct)}
              title="Exportar prévia em formato PDF com os parâmetros atuais"
            >
              <Icon d={Icons.pdf} size={15} /> Exportar prévia PDF
            </button>
          )}
        </div>
      </div>

      {/* Top Configuration Bar: Fisio Multi-select Dropdown + Percentage inputs + Action buttons */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--slate-50)',
        borderBottom: '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {/* Fisio Dropdown */}
        <FisioMultiSelectDropdown
          selected={selectedFisios}
          onChange={ids => {
            setSelectedFisios(ids);
            calculatePreview(ids, taxPct, clinicPct);
          }}
        />

        {/* Input Imposto */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="input-tax-pct">Imposto (%)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id="input-tax-pct"
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="filter-input"
              style={{ width: 75, height: 34, fontSize: '.75rem', fontWeight: 600 }}
              value={taxPct}
              onChange={e => {
                setTaxPct(e.target.value);
              }}
            />
            <span style={{ fontSize: '.75rem', color: 'var(--slate-500)' }}>%</span>
          </div>
        </div>

        {/* Input Clínica */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="input-clinic-pct">Clínica (%)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id="input-clinic-pct"
              type="number"
              min="0"
              max="100"
              step="1"
              className="filter-input"
              style={{ width: 75, height: 34, fontSize: '.75rem', fontWeight: 600 }}
              value={clinicPct}
              onChange={e => {
                setClinicPct(e.target.value);
              }}
            />
            <span style={{ fontSize: '.75rem', color: 'var(--slate-500)' }}>% s/ saldo</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <button
            type="button"
            id="conclude-closure-btn"
            className="btn btn-accent"
            style={{
              height: 34,
              fontWeight: 700,
              padding: '0 18px',
              fontSize: '.82rem',
              background: preview && selectedFisios.length > 0 && preview.totalEligible > 0
                ? 'var(--accent-500)'
                : undefined,
              boxShadow: preview && selectedFisios.length > 0 && preview.totalEligible > 0
                ? '0 2px 8px rgba(246, 135, 47, 0.35)'
                : undefined,
            }}
            disabled={!preview || selectedFisios.length === 0 || preview.totalEligible === 0}
            onClick={() => setShowConcludeModal(true)}
            title={!preview ? 'Selecione profissionais para gerar a prévia primeiro' : preview.totalEligible === 0 ? 'Nenhuma sessão elegível' : 'Concluir fechamento financeiro'}
          >
            🔒 Concluir fechamento
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div style={{ padding: '20px' }}>
        {!preview ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-400)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--slate-700)' }}>Selecione os profissionais</div>
            <p style={{ fontSize: '.78rem', maxWidth: 440, margin: '6px auto 0', color: 'var(--slate-500)' }}>
              Selecione os profissionais no campo acima e ajuste os percentuais de imposto e da clínica se desejar. A prévia será gerada automaticamente.
            </p>
          </div>
        ) : (
          <div>
            {/* Nav pills for inspecting each professional or overall */}
            <div className="fisio-pills">
              <button
                className={`fisio-pill-btn${activeFisioId === 'all' ? ' active' : ''}`}
                onClick={() => setActiveFisioId('all')}
              >
                <span>📋 Visão Geral ({preview.entries.length})</span>
              </button>
              {selectedFisios.map(fid => {
                const f = FISIOTERAPEUTAS.find(x => x.id === fid);
                return (
                  <button
                    key={fid}
                    className={`fisio-pill-btn${activeFisioId === fid ? ' active' : ''}`}
                    onClick={() => setActiveFisioId(fid)}
                  >
                    <div className="fisio-avatar" style={{ width: 18, height: 18, fontSize: '.55rem', background: f?.color }}>
                      {f?.initials}
                    </div>
                    <span>{f?.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Consolidated View (All selected fisios) */}
            {activeFisioId === 'all' && (
              <div>
                {/* Global Total Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="card-content">
                      <div className="label">Total Elegíveis</div>
                      <div className="value" style={{ fontSize: '1.2rem' }}>{preview.totalEligible} sessões</div>
                      <div className="sub">{preview.totalGlossed} glosadas</div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="card-content">
                      <div className="label">Valor Bruto Total</div>
                      <div className="value" style={{ fontSize: '1.2rem' }}>{formatBRL(totGross)}</div>
                      <div className="sub">Base de cálculo</div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="card-content">
                      <div className="label">Deduções Totais</div>
                      <div className="value" style={{ fontSize: '1.2rem', color: 'var(--red-600)' }}>
                        - {formatBRL(totTax + totClinic)}
                      </div>
                      <div className="sub">Imposto ({taxPct}%) + Clínica ({clinicPct}%)</div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 12, background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
                    <div className="card-content">
                      <div className="label">Valor Líquido Total</div>
                      <div className="value" style={{ fontSize: '1.2rem', color: 'var(--brand-700)', fontWeight: 700 }}>
                        {formatBRL(totNet)}
                      </div>
                      <div className="sub">Repasse aos profissionais</div>
                    </div>
                  </div>
                </div>

                {/* Per-Fisio Summary Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {preview.entries.map(e => {
                    const f = FISIOTERAPEUTAS.find(x => x.id === e.fisioId);
                    return (
                      <div key={e.fisioId} className="card" style={{ flexDirection: 'column', gap: 12, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="fisio-avatar" style={{ width: 28, height: 28, fontSize: '.7rem', background: f?.color }}>
                              {f?.initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '.84rem', color: 'var(--slate-800)' }}>{f?.name}</div>
                              <div style={{ fontSize: '.7rem', color: 'var(--slate-400)' }}>{f?.crefito}</div>
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '.72rem', padding: '3px 8px' }}
                            onClick={() => setActiveFisioId(e.fisioId)}
                          >
                            Ver demonstrativo →
                          </button>
                        </div>

                        <div style={{ width: '100%', fontSize: '.75rem', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--slate-50)', padding: 10, borderRadius: 'var(--radius)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--slate-600)' }}>Sessões elegíveis:</span>
                            <span style={{ fontWeight: 600 }}>{e.eligibleSessions}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--slate-600)' }}>Sessões glosadas:</span>
                            <span style={{ color: 'var(--red-600)' }}>{e.glossedSessions}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--slate-600)' }}>Valor bruto:</span>
                            <span style={{ fontWeight: 600 }}>{formatBRL(e.grossValue)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--slate-600)' }}>Imposto ({safeTaxPct}%):</span>
                            <span style={{ color: 'var(--red-600)' }}>- {formatBRL(e.taxValue)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--slate-600)' }}>Parcela clínica ({safeClinicPct}% s/ saldo):</span>
                            <span style={{ color: 'var(--red-600)' }}>- {formatBRL(e.clinicValue)}</span>
                          </div>
                          <div className="divider" style={{ margin: '4px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>Valor líquido:</span>
                            <span style={{ fontWeight: 700, color: 'var(--green-700)' }}>{formatBRL(e.netValue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Professional View (Matches exact PDF layout) */}
            {activeFisioId !== 'all' && (() => {
              const fid = activeFisioId;
              const f = FISIOTERAPEUTAS.find(x => x.id === fid);
              const fisioSessions = sessions.filter(s => s.fisioId === fid);
              const eligibleSessions = fisioSessions.filter(isEligible);
              const glossedSessions = fisioSessions.filter(s => s.glosa === 'glosada');
              const reservedSessions = fisioSessions.filter(s => s.financialStatus === 'reservada' && s.glosa !== 'glosada');
              const nonCountedSessions = [...glossedSessions, ...reservedSessions];

              const gross = eligibleSessions.reduce((sum, s) => sum + s.valuePerSession, 0);
              const { taxValue, clinicValue, netValue } = calcNet(gross, safeTaxPct, safeClinicPct);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Fisio Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--slate-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="fisio-avatar" style={{ width: 36, height: 36, fontSize: '.9rem', background: f?.color }}>
                        {f?.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--slate-900)' }}>{f?.name}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--slate-500)' }}>{f?.crefito}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-amber" style={{ fontSize: '.7rem' }}>PRÉVIA — NÃO CONFIRMADO</span>
                      <div style={{ fontSize: '.72rem', color: 'var(--slate-400)', marginTop: 2 }}>
                        Período: {formatDate(preview.periodStart)} a {formatDate(preview.periodEnd)}
                      </div>
                    </div>
                  </div>

                  {/* Resumo Financeiro Box (Identical to PDF structure) */}
                  <div style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', background: '#fff', padding: 18 }}>
                    <div style={{ fontSize: '.84rem', fontWeight: 700, color: 'var(--green-800)', marginBottom: 12 }}>
                      Resumo Financeiro (Demonstrativo do Profissional)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 24px', fontSize: '.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Sessões elegíveis (contabilizadas)</span>
                        <strong style={{ color: 'var(--slate-800)' }}>{eligibleSessions.length}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Valor bruto apurado</span>
                        <strong style={{ color: 'var(--slate-800)' }}>{formatBRL(gross)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Sessões glosadas (não contabilizadas)</span>
                        <strong style={{ color: 'var(--red-600)' }}>{glossedSessions.length}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Imposto ({safeTaxPct}%)</span>
                        <strong style={{ color: 'var(--red-600)' }}>- {formatBRL(taxValue)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Sessões reservadas (não contabilizadas)</span>
                        <strong style={{ color: 'var(--amber-600)' }}>{reservedSessions.length}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Parcela da clínica ({safeClinicPct}% s/ saldo)</span>
                        <strong style={{ color: 'var(--red-600)' }}>- {formatBRL(clinicValue)}</strong>
                      </div>
                    </div>

                    <div className="divider" style={{ margin: '12px 0' }} />

                    {/* Total em negrito direto, sem faixa verde (exatamente como pedido para o PDF) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                        Valor líquido (profissional):
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                        {formatBRL(netValue)}
                      </span>
                    </div>

                    {/* Memória de cálculo */}
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--slate-50)', borderRadius: 'var(--radius)', fontSize: '.72rem', color: 'var(--slate-500)' }}>
                      <strong>Memória de cálculo:</strong> Bruto {formatBRL(gross)} − Imposto {safeTaxPct}% ({formatBRL(taxValue)}) = {formatBRL(gross - taxValue)} − Parcela clínica {safeClinicPct}% ({formatBRL(clinicValue)}) = Líquido <strong>{formatBRL(netValue)}</strong>
                    </div>
                  </div>

                  {/* Tabela 1: Sessões Elegíveis */}
                  <div className="section" style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius)' }}>
                    <div className="section-header" style={{ padding: '10px 16px', background: 'var(--slate-50)' }}>
                      <div>
                        <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--green-800)' }}>
                          Sessões Elegíveis (Contabilizadas na Produção) — Total: {eligibleSessions.length}
                        </div>
                      </div>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Paciente</th>
                            <th>Guia / Plano</th>
                            <th>Valor/sessão</th>
                            <th style={{ textAlign: 'right' }}>Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eligibleSessions.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '18px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                                Nenhuma sessão elegível para este profissional no período.
                              </td>
                            </tr>
                          ) : (
                            eligibleSessions.map(s => (
                              <tr key={s.id}>
                                <td>{formatDate(s.date)}</td>
                                <td>{s.patient}</td>
                                <td>{s.guia}</td>
                                <td style={{ fontWeight: 600 }}>{formatBRL(s.valuePerSession)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className="badge badge-green">Elegível</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabela 2: Sessões Não Contabilizadas (Glosadas e Reservadas) */}
                  <div className="section" style={{ border: '1px solid var(--amber-200)', borderRadius: 'var(--radius)' }}>
                    <div className="section-header" style={{ padding: '10px 16px', background: 'var(--amber-50)' }}>
                      <div>
                        <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#9a3412' }}>
                          Sessões Não Contabilizadas — Glosadas e Reservadas (Apenas Visualização) — Total: {nonCountedSessions.length}
                        </div>
                        <div style={{ fontSize: '.72rem', color: '#b45309' }}>
                          Apenas informativo: estas sessões NÃO entram no cálculo. Use o ✏️ para retirar glosa de sessões já regularizadas.
                        </div>
                      </div>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Paciente</th>
                            <th>Guia / Plano</th>
                            <th>Valor/sessão</th>
                            <th style={{ textAlign: 'right' }}>Motivo / Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nonCountedSessions.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '18px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                                Nenhuma sessão glosada ou reservada para este profissional.
                              </td>
                            </tr>
                          ) : (
                            nonCountedSessions.map(s => (
                              <tr key={s.id} style={{ opacity: 0.88 }}>
                                <td>
                                  <div>{formatDate(s.date)}</div>
                                  {s.competenceDate && (
                                    <div style={{ fontSize: '.68rem', color: '#0d9488', marginTop: 2, fontWeight: 500 }}>
                                      Competência {formatDate(s.competenceDate)}
                                    </div>
                                  )}
                                </td>
                                <td>{s.patient}</td>
                                <td style={{ fontSize: '.75rem', color: 'var(--slate-500)' }}>{s.guia}</td>
                                <td style={{ color: 'var(--slate-500)' }}>{formatBRL(s.valuePerSession)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    {s.glosa === 'glosada' ? (
                                      <span className="badge badge-red">Glosada</span>
                                    ) : (
                                      <span className="badge badge-amber">Reservada</span>
                                    )}
                                    {s.glosa === 'glosada' && s.financialStatus === 'disponivel' && (
                                      <ActionMenu
                                        session={s}
                                        trigger="pencil"
                                        onGlosa={(id, apply) => setPendingGlosa({ id, apply })}
                                        onEditSession={setEditingSession}
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Conclude Closure Modal */}
      {showConcludeModal && preview && (
        <Modal
          title="Concluir fechamento financeiro"
          subtitle="Confirme antes de prosseguir. As sessões elegíveis serão reservadas."
          onClose={() => setShowConcludeModal(false)}
          footer={
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConcludeModal(false)}>
                Cancelar
              </button>
              <button
                id="confirm-conclude-btn"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onConclude(selectedFisios, safeTaxPct, safeClinicPct);
                  setShowConcludeModal(false);
                  setPreview(null);
                }}
              >
                Confirmar fechamento ({formatBRL(preview.totalNet)})
              </button>
            </>
          }
        >
          <div className="alert-box alert-box--amber" style={{ marginBottom: 14 }}>
            <Icon d={Icons.warn} size={16} />
            As {preview.totalEligible} sessões elegíveis serão reservadas e não poderão ser incluídas em outro fechamento até que este seja cancelado.
          </div>
          <div style={{ fontSize: '.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-500)' }}>Profissionais</span>
              <span style={{ fontWeight: 600 }}>{selectedFisios.map(id => FISIOTERAPEUTAS.find(f => f.id === id)?.name).join(', ')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-500)' }}>Parâmetros aplicados</span>
              <span style={{ fontWeight: 600 }}>Imposto {safeTaxPct}% · Clínica {safeClinicPct}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-500)' }}>Sessões elegíveis</span>
              <span style={{ fontWeight: 600 }}>{preview.totalEligible}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-500)' }}>Valor bruto</span>
              <span style={{ fontWeight: 600 }}>{formatBRL(preview.totalGross)}</span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>Valor líquido total</span>
              <span style={{ fontWeight: 700, color: 'var(--green-700)', fontSize: '.95rem' }}>{formatBRL(preview.totalNet)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Glosa confirmation modal */}
      {pendingGlosa && (() => {
        const s = sessions.find(x => x.id === pendingGlosa.id);
        return (
          <Modal
            title={pendingGlosa.apply ? 'Marcar sessão como glosada' : 'Retirar glosa da sessão'}
            subtitle="Confirme a alteração antes de prosseguir."
            onClose={() => setPendingGlosa(null)}
            footer={
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setPendingGlosa(null)}>Cancelar</button>
                <button
                  id="confirm-preview-glosa-btn"
                  className={pendingGlosa.apply ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'}
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
              <div style={{ marginTop: 12, fontSize: '.75rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
                <div><strong>Paciente:</strong> {s.patient}</div>
                <div><strong>Guia:</strong> {s.guia}</div>
                <div><strong>Data da sessão:</strong> {formatDate(s.date)}</div>
                <div><strong>Valor:</strong> {formatBRL(s.valuePerSession)}</div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Edit session modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={(id, updates) => {
            onUpdateSession?.(id, updates);
            setEditingSession(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Closure Detail Modal (Visualização da Prévia do PDF em Tela) ────────────

function ClosureDetailModal({
  closure,
  sessions,
  onClose,
}: {
  closure: Closure;
  sessions: Session[];
  onClose: () => void;
}) {
  const [activeFisioId, setActiveFisioId] = useState<string>(
    closure.fisioIds.length === 1 ? closure.fisioIds[0] : (closure.fisioIds[0] || 'all')
  );

  const activeFisio = FISIOTERAPEUTAS.find(x => x.id === activeFisioId);
  const entry = closure.perFisio.find(e => e.fisioId === activeFisioId);

  // Filter sessions for active fisio
  const fisioSessions = sessions.filter(s => s.fisioId === activeFisioId);
  const eligibleSessions = closure.sessions
    .map(cs => {
      const s = sessions.find(x => x.id === cs.sessionId && x.fisioId === activeFisioId);
      return s ? s : undefined;
    })
    .filter((s): s is Session => !!s);

  const glossedSessions = fisioSessions.filter(s => s.glosa === 'glosada');
  const reservedSessions = fisioSessions.filter(s =>
    s.financialStatus === 'reservada' &&
    s.glosa !== 'glosada' &&
    !closure.sessions.some(cs => cs.sessionId === s.id)
  );
  const nonCountedSessions = [...glossedSessions, ...reservedSessions];

  const gross = entry ? entry.grossValue : eligibleSessions.reduce((sum, s) => sum + s.valuePerSession, 0);
  const taxPct = closure.taxPercent;
  const clinicPct = closure.clinicPercent;
  const taxValue = entry ? entry.taxValue : gross * (taxPct / 100);
  const clinicValue = entry ? entry.clinicValue : (gross - taxValue) * (clinicPct / 100);
  const netValue = entry ? entry.netValue : gross - taxValue - clinicValue;

  return (
    <Modal
      title="Visualização da Prévia do Relatório (PDF)"
      subtitle={`Fechamento ${closure.id} · Período: ${formatDate(closure.periodStart)} a ${formatDate(closure.periodEnd)}`}
      xl
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '.78rem', color: 'var(--slate-500)' }}>
            Valor Líquido Total:{' '}
            <strong style={{ color: 'var(--green-800)', fontSize: '.92rem' }}>
              {formatBRL(closure.netValue)}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Fechar
            </button>
            <button
              id={`modal-download-pdf-${closure.id}`}
              className="btn btn-primary btn-sm"
              onClick={() => generatePDF(closure, closure.fisioIds, sessions, false, `fechamento-${closure.id}`)}
              title="Baixar este relatório em formato PDF"
            >
              <Icon d={Icons.pdf} size={14} /> Baixar PDF
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* PDF Simulated Header Banner */}
        <div style={{
          background: 'var(--brand-600)',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 'var(--radius)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <img
              src="/logo.png"
              alt="Harmonia Fisioterapia"
              style={{ height: 40, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
            <div style={{ fontSize: '.74rem', opacity: 0.9, marginTop: 2 }}>Relatório de Produção e Fechamento</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <ClosureBadge status={closure.status} />
            <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>
              ID: {closure.id}
            </div>
          </div>
        </div>

        {/* Info Meta Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8,
          background: 'var(--slate-50)',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          fontSize: '.75rem',
          border: '1px solid var(--slate-200)',
        }}>
          <div>
            <span style={{ color: 'var(--slate-400)' }}>Período do Fechamento:</span>
            <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
              {formatDate(closure.periodStart)} a {formatDate(closure.periodEnd)}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--slate-400)' }}>Data de Fechamento:</span>
            <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
              {formatDateTime(closure.createdAt)}
            </div>
          </div>
          {closure.paidAt && (
            <div>
              <span style={{ color: 'var(--slate-400)' }}>Data do Pagamento:</span>
              <div style={{ fontWeight: 600, color: 'var(--green-700)' }}>
                {formatDateTime(closure.paidAt)}
              </div>
            </div>
          )}
          <div>
            <span style={{ color: 'var(--slate-400)' }}>Parâmetros Aplicados:</span>
            <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
              Imposto: {taxPct}% · Clínica: {clinicPct}%
            </div>
          </div>
        </div>

        {/* Fisio switcher if multiple */}
        {closure.fisioIds.length > 1 && (
          <div className="fisio-pills">
            <button
              className={`fisio-pill-btn${activeFisioId === 'all' ? ' active' : ''}`}
              onClick={() => setActiveFisioId('all')}
            >
              <span>📋 Resumo Consolidado ({closure.fisioIds.length})</span>
            </button>
            {closure.fisioIds.map(fid => {
              const f = FISIOTERAPEUTAS.find(x => x.id === fid);
              return (
                <button
                  key={fid}
                  className={`fisio-pill-btn${activeFisioId === fid ? ' active' : ''}`}
                  onClick={() => setActiveFisioId(fid)}
                >
                  <div className="fisio-avatar" style={{ width: 18, height: 18, fontSize: '.55rem', background: f?.color }}>
                    {f?.initials}
                  </div>
                  <span>{f?.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* View Mode: Consolidado Geral */}
        {activeFisioId === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div className="card" style={{ padding: 10 }}>
                <div className="card-content">
                  <div className="label">Total Elegíveis</div>
                  <div className="value" style={{ fontSize: '1.15rem' }}>{closure.sessions.length}</div>
                  <div className="sub">sessões no fechamento</div>
                </div>
              </div>
              <div className="card" style={{ padding: 10 }}>
                <div className="card-content">
                  <div className="label">Valor Bruto</div>
                  <div className="value" style={{ fontSize: '1.15rem' }}>{formatBRL(closure.grossValue)}</div>
                  <div className="sub">Base de cálculo</div>
                </div>
              </div>
              <div className="card" style={{ padding: 10 }}>
                <div className="card-content">
                  <div className="label">Deduções Totais</div>
                  <div className="value" style={{ fontSize: '1.15rem', color: 'var(--red-600)' }}>
                    - {formatBRL(closure.taxValue + closure.clinicValue)}
                  </div>
                  <div className="sub">Imposto + Clínica</div>
                </div>
              </div>
              <div className="card" style={{ padding: 10, background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
                <div className="card-content">
                  <div className="label">Valor Líquido Total</div>
                  <div className="value" style={{ fontSize: '1.15rem', color: 'var(--brand-700)', fontWeight: 700 }}>
                    {formatBRL(closure.netValue)}
                  </div>
                  <div className="sub">Repasse aos profissionais</div>
                </div>
              </div>
            </div>

            {/* List of per-fisio cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {closure.perFisio.map(e => {
                const f = FISIOTERAPEUTAS.find(x => x.id === e.fisioId);
                return (
                  <div key={e.fisioId} className="card" style={{ flexDirection: 'column', gap: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="fisio-avatar" style={{ width: 26, height: 26, fontSize: '.65rem', background: f?.color }}>
                          {f?.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{f?.name}</div>
                          <div style={{ fontSize: '.68rem', color: 'var(--slate-400)' }}>{f?.crefito}</div>
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '.7rem', padding: '2px 8px' }}
                        onClick={() => setActiveFisioId(e.fisioId)}
                      >
                        Ver detalhes →
                      </button>
                    </div>

                    <div style={{ width: '100%', fontSize: '.73rem', display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--slate-50)', padding: 8, borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Sessões contabilizadas:</span>
                        <span style={{ fontWeight: 600 }}>{e.sessionCount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Valor bruto:</span>
                        <span style={{ fontWeight: 600 }}>{formatBRL(e.grossValue)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Imposto ({taxPct}%):</span>
                        <span style={{ color: 'var(--red-600)' }}>- {formatBRL(e.taxValue)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Parcela clínica ({clinicPct}%):</span>
                        <span style={{ color: 'var(--red-600)' }}>- {formatBRL(e.clinicValue)}</span>
                      </div>
                      <div className="divider" style={{ margin: '3px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Líquido:</span>
                        <span style={{ color: 'var(--green-700)' }}>{formatBRL(e.netValue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: Demonstrativo do Profissional selecionado (idêntico ao PDF) */}
        {activeFisioId !== 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Fisio Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--slate-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="fisio-avatar" style={{ width: 34, height: 34, fontSize: '.85rem', background: activeFisio?.color }}>
                  {activeFisio?.initials}
                </div>
                <div>
                  <div style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--slate-900)' }}>{activeFisio?.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--slate-500)' }}>{activeFisio?.crefito}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--slate-500)' }}>
                  Período: <strong>{formatDate(closure.periodStart)} a {formatDate(closure.periodEnd)}</strong>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro (Demonstrativo do Profissional idêntico ao PDF) */}
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', background: '#fff', padding: 16 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--green-800)', marginBottom: 10 }}>
                Resumo Financeiro (Demonstrativo do Profissional)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 20px', fontSize: '.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Sessões elegíveis (contabilizadas)</span>
                  <strong style={{ color: 'var(--slate-800)' }}>{eligibleSessions.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Valor bruto apurado</span>
                  <strong style={{ color: 'var(--slate-800)' }}>{formatBRL(gross)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Sessões glosadas (não contabilizadas)</span>
                  <strong style={{ color: 'var(--red-600)' }}>{glossedSessions.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Imposto ({taxPct}%):</span>
                  <strong style={{ color: 'var(--red-600)' }}>- {formatBRL(taxValue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Sessões reservadas (não contabilizadas)</span>
                  <strong style={{ color: 'var(--amber-600)' }}>{reservedSessions.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ color: 'var(--slate-600)' }}>Parcela da clínica ({clinicPct}% s/ saldo)</span>
                  <strong style={{ color: 'var(--red-600)' }}>- {formatBRL(clinicValue)}</strong>
                </div>
              </div>

              <div className="divider" style={{ margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.86rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Valor líquido (profissional):
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {formatBRL(netValue)}
                </span>
              </div>

              <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--slate-50)', borderRadius: 'var(--radius)', fontSize: '.7rem', color: 'var(--slate-500)' }}>
                <strong>Memória de cálculo:</strong> Bruto {formatBRL(gross)} − Imposto {taxPct}% ({formatBRL(taxValue)}) = {formatBRL(gross - taxValue)} − Parcela clínica {clinicPct}% ({formatBRL(clinicValue)}) = Líquido <strong>{formatBRL(netValue)}</strong>
              </div>
            </div>

            {/* Tabela 1: Sessões Elegíveis */}
            <div className="section" style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius)' }}>
              <div className="section-header" style={{ padding: '8px 14px', background: 'var(--slate-50)' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--green-800)' }}>
                  Sessões Elegíveis (Contabilizadas no Fechamento) — Total: {eligibleSessions.length}
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Paciente</th>
                      <th>Guia / Plano</th>
                      <th>Valor/sessão</th>
                      <th style={{ textAlign: 'right' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleSessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '14px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                          Nenhuma sessão elegível vinculada a este profissional neste fechamento.
                        </td>
                      </tr>
                    ) : (
                      eligibleSessions.map(s => (
                        <tr key={s.id}>
                          <td>{formatDate(s.date)}</td>
                          <td>{s.patient}</td>
                          <td>{s.guia}</td>
                          <td style={{ fontWeight: 600 }}>{formatBRL(s.valuePerSession)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-green">Elegível</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela 2: Sessões Não Contabilizadas */}
            {nonCountedSessions.length > 0 && (
              <div className="section" style={{ border: '1px solid var(--amber-200)', borderRadius: 'var(--radius)' }}>
                <div className="section-header" style={{ padding: '8px 14px', background: 'var(--amber-50)' }}>
                  <div>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#9a3412' }}>
                      Sessões Não Contabilizadas — Glosadas e Reservadas (Apenas Informativo) — Total: {nonCountedSessions.length}
                    </div>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Paciente</th>
                        <th>Guia / Plano</th>
                        <th>Valor/sessão</th>
                        <th style={{ textAlign: 'right' }}>Motivo / Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonCountedSessions.map(s => (
                        <tr key={s.id} style={{ opacity: 0.85 }}>
                          <td>{formatDate(s.date)}</td>
                          <td>{s.patient}</td>
                          <td>{s.guia}</td>
                          <td style={{ color: 'var(--slate-500)' }}>{formatBRL(s.valuePerSession)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {s.glosa === 'glosada' ? (
                              <span className="badge badge-red">Glosada</span>
                            ) : (
                              <span className="badge badge-amber">Reservada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Closures Panel ───────────────────────────────────────────────────────────

function ClosuresPanelFull({ closures, sessions, onCancel, onConfirmPayment }: {
  closures: Closure[];
  sessions: Session[];
  onCancel: (id: string) => void;
  onConfirmPayment: (id: string) => void;
}) {
  const [tab, setTab] = useState<'pendente' | 'pago' | 'all'>('pendente');
  const [pendingAction, setPendingAction] = useState<{ type: 'cancel' | 'pay'; id: string } | null>(null);
  const [viewingClosure, setViewingClosure] = useState<Closure | null>(null);

  const shown = closures.filter(c => {
    if (tab === 'all') return true;
    return c.status === tab;
  });

  const pending = closures.filter(c => c.status === 'pendente').length;
  const paid = closures.filter(c => c.status === 'pago').length;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Fechamentos</div>
          <div className="section-subtitle">Consulte e gerencie os fechamentos de pagamento.</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'pendente' ? ' active' : ''}`} onClick={() => setTab('pendente')}>
          Pendentes <span className="count-bubble">{pending}</span>
        </button>
        <button className={`tab-btn${tab === 'pago' ? ' active' : ''}`} onClick={() => setTab('pago')}>
          Pagos <span className="count-bubble">{paid}</span>
        </button>
        <button className={`tab-btn${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClosureBadge status={c.status} />
                    <span className="closure-id">{c.id}</span>
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--slate-400)', marginTop: 2 }}>
                    Criado em {formatDateTime(c.createdAt)}
                    {c.paidAt && <> · Pago em {formatDateTime(c.paidAt)}</>}
                    {c.cancelledAt && <> · Cancelado em {formatDateTime(c.cancelledAt)}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    id={`view-closure-details-${c.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() => setViewingClosure(c)}
                    title="Visualizar detalhes da prévia do PDF em tela (sem baixar)"
                  >
                    <Icon d={Icons.eye} size={14} /> Visualizar detalhes
                  </button>
                  <button
                    id={`export-closure-pdf-${c.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() => generatePDF(c, c.fisioIds, sessions, false, `fechamento-${c.id}`)}
                    title="Baixar arquivo PDF"
                  >
                    <Icon d={Icons.pdf} size={14} /> PDF
                  </button>
                  {c.status === 'pendente' && (
                    <>
                      <button
                        id={`cancel-closure-${c.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => setPendingAction({ type: 'cancel', id: c.id })}
                      >
                        Cancelar
                      </button>
                      <button
                        id={`confirm-payment-${c.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => setPendingAction({ type: 'pay', id: c.id })}
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
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.fisioIds.map(fid => {
                        const f = FISIOTERAPEUTAS.find(x => x.id === fid);
                        return (
                          <div key={fid} className="fisio-avatar" style={{ width: 24, height: 24, fontSize: '.6rem', background: f?.color }}>
                            {f?.initials}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      {c.fisioIds.map(fid => FISIOTERAPEUTAS.find(f => f.id === fid)?.name).join(', ')}
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
                  <div className="ci-value" style={{ color: 'var(--green-700)', fontSize: '1rem' }}>{formatBRL(c.netValue)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm cancel */}
      {pendingAction?.type === 'cancel' && (() => {
        const c = closures.find(x => x.id === pendingAction.id);
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
            <div className="alert-box alert-box--red" style={{ marginBottom: 14 }}>
              <Icon d={Icons.warn} size={16} />
              As sessões reservadas neste fechamento voltarão a ficar disponíveis para nova apuração.
            </div>
            {c && (
              <div style={{ fontSize: '.84rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Identificador</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '.78rem' }}>{c.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Sessões que serão liberadas</span>
                  <span style={{ fontWeight: 600 }}>{c.sessions.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Valor que deixará de ser reservado</span>
                  <span style={{ fontWeight: 600 }}>{formatBRL(c.grossValue)}</span>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Confirm payment */}
      {pendingAction?.type === 'pay' && (() => {
        const c = closures.find(x => x.id === pendingAction.id);
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
            <div className="alert-box alert-box--green" style={{ marginBottom: 14 }}>
              <Icon d={Icons.check} size={16} />
              O fechamento será marcado como pago. As sessões vinculadas não poderão ser reutilizadas.
            </div>
            {c && (
              <div style={{ fontSize: '.84rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Profissionais</span>
                  <span style={{ fontWeight: 600 }}>{c.fisioIds.map(id => FISIOTERAPEUTAS.find(f => f.id === id)?.name).join(', ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Período</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(c.periodStart)} — {formatDate(c.periodEnd)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Sessões</span>
                  <span style={{ fontWeight: 600 }}>{c.sessions.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Valor bruto</span>
                  <span style={{ fontWeight: 600 }}>{formatBRL(c.grossValue)}</span>
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>Valor líquido a pagar</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-700)', fontSize: '1rem' }}>{formatBRL(c.netValue)}</span>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}
      {/* Detail / PDF Preview Modal */}
      {viewingClosure && (
        <ClosureDetailModal
          closure={viewingClosure}
          sessions={sessions}
          onClose={() => setViewingClosure(null)}
        />
      )}
    </div>
  );
}

// ─── Calc Details ─────────────────────────────────────────────────────────────

function CalcDetails({ sessions }: { sessions: Session[] }) {
  const gross = sessions.filter(isEligible).reduce((s, x) => s + x.valuePerSession, 0);
  const tax = gross * 0.05;
  const clinic = (gross - tax) * 0.50; // default 50%
  const net = gross - tax - clinic;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Detalhamento do cálculo</div>
          <div className="section-subtitle">Como os valores são obtidos (parâmetros demonstrativos, sujeitos à validação).</div>
        </div>
      </div>
      <div className="section-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--slate-600)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Fórmula geral
            </div>
            {[
              ['1. Valor bruto', 'Soma dos valores de todas as sessões elegíveis (não glosadas + disponíveis).', formatBRL(gross)],
              ['2. Imposto (5%)', 'Percentual aplicado sobre o valor bruto.', `- ${formatBRL(tax)}`],
              ['3. Saldo após imposto', 'Bruto descontado o imposto.', formatBRL(gross - tax)],
              ['4. Parcela da clínica (50%)', 'Percentual aplicado sobre o saldo após imposto.', `- ${formatBRL(clinic)}`],
              ['5. Valor líquido', 'Valor final a ser pago ao profissional.', formatBRL(net)],
            ].map(([step, desc, val]) => (
              <div key={step} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--slate-100)', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--slate-800)' }}>{step}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--slate-500)', marginTop: 1 }}>{desc}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--slate-800)', whiteSpace: 'nowrap', fontSize: '.86rem' }}>{val}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--slate-600)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Memória de cálculo atual
            </div>
            <div className="alert-box alert-box--amber">
              <Icon d={Icons.info} size={16} />
              <span>
                Bruto {formatBRL(gross)} → − Imposto 5% ({formatBRL(tax)}) = {formatBRL(gross - tax)} → − Parcela clínica 50% ({formatBRL(clinic)}) = Líquido <strong>{formatBRL(net)}</strong>
              </span>
            </div>
            <div style={{ marginTop: 16, fontSize: '.78rem', color: 'var(--slate-500)', lineHeight: 1.7 }}>
              <p><strong>Observação:</strong> Os percentuais padrão são 5% de imposto e 50% de repasse à clínica sobre o saldo líquido pós-imposto. É possível ajustar esses valores na aba <strong>Apuração e Prévia</strong> para simulações dinâmicas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  dateFrom: '2025-01-01',
  dateTo: '2027-12-31',
  fisioId: '',
  plano: '',
  glosa: 'all',
  financial: 'all',
};

export default function App() {
  const store = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessoes' | 'fechamento'>('sessoes');
  const [closureSubTab, setClosureSubTab] = useState<'apuracao' | 'fechamentos'>('apuracao');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showReset, setShowReset] = useState(false);

  const filteredSessions = store.getFilteredSessions(filters);
  const indicators = store.getIndicators(filteredSessions);
  const pendingClosuresCount = store.closures.filter(c => c.status === 'pendente').length;

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <main className={`main-content${sidebarCollapsed ? ' main-content--expanded' : ''}`}>
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed(c => !c)}
              id="header-toggle-sidebar-btn"
              title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              style={{ marginRight: 8, display: 'none' }}
            >
              <Icon d={sidebarCollapsed ? Icons.chevronR : Icons.chevronL} size={14} />
            </button>
            <div className="page-header-icon">
              <Icon d={Icons.reports} size={22} />
            </div>
            <div>
              <h1>Relatório de Produção e Pagamento</h1>
              <p>Consulte a produção dos fisioterapeutas, filtre sessões, gere prévias demonstrativas e conclua fechamentos com segurança.</p>
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

        {/* Navigation Tabs */}
        <div className="page-tabs-bar">
          <button
            id="tab-sessoes-btn"
            className={`page-tab-btn${activeTab === 'sessoes' ? ' active' : ''}`}
            onClick={() => setActiveTab('sessoes')}
          >
            <Icon d={Icons.sessions} size={17} />
            <span>Sessões e Produção</span>
            <span className="count-bubble">{filteredSessions.length}</span>
          </button>
          <button
            id="tab-fechamento-btn"
            className={`page-tab-btn${activeTab === 'fechamento' ? ' active' : ''}`}
            onClick={() => setActiveTab('fechamento')}
          >
            <Icon d={Icons.financial} size={17} />
            <span>Prévias e Fechamento</span>
            {pendingClosuresCount > 0 ? (
              <span className="badge badge-amber" style={{ fontSize: '.7rem', padding: '1px 7px' }}>
                {pendingClosuresCount} pendente{pendingClosuresCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="count-bubble">{store.closures.length}</span>
            )}
          </button>
        </div>

        <div className="page-body">
          {activeTab === 'sessoes' ? (
            <>
              {/* Filters */}
              <FiltersBar filters={filters} onChange={setFilters} sessions={store.sessions} />

              {/* Indicator cards */}
              <IndicatorCards indicators={indicators} />

              {/* Sessions table */}
              <SessionsTable
                sessions={filteredSessions}
                allSessions={store.sessions}
                onGlosa={(id, apply) => apply ? store.applyGlosa(id) : store.removeGlosa(id)}
                onUpdateSession={store.updateSession}
              />

              {/* Calc details */}
              <CalcDetails sessions={store.sessions} />
            </>
          ) : (
            <>
              {/* Subtabs: Apuração e prévia vs Fechamento */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="subtabs-bar">
                  <button
                    id="subtab-apuracao-btn"
                    className={`subtab-btn${closureSubTab === 'apuracao' ? ' active' : ''}`}
                    onClick={() => setClosureSubTab('apuracao')}
                  >
                    <Icon d={Icons.treatment} size={15} />
                    <span>Apuração e prévia</span>
                  </button>
                  <button
                    id="subtab-fechamentos-btn"
                    className={`subtab-btn${closureSubTab === 'fechamentos' ? ' active' : ''}`}
                    onClick={() => setClosureSubTab('fechamentos')}
                  >
                    <Icon d={Icons.financial} size={15} />
                    <span>Fechamento</span>
                    {pendingClosuresCount > 0 ? (
                      <span className="badge badge-amber" style={{ fontSize: '.7rem', padding: '1px 6px' }}>
                        {pendingClosuresCount} pendente{pendingClosuresCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="count-bubble">{store.closures.length}</span>
                    )}
                  </button>
                </div>
              </div>

              {closureSubTab === 'apuracao' ? (
                <ApuracaoPreviewPanel
                  sessions={store.sessions}
                  closures={store.closures}
                  onConclude={(fisioIds, tax, clinic) => store.concludeClosure(fisioIds, tax, clinic)}
                  onGlosa={(id, apply) => apply ? store.applyGlosa(id) : store.removeGlosa(id)}
                  onUpdateSession={store.updateSession}
                />
              ) : (
                <ClosuresPanelFull
                  closures={store.closures}
                  sessions={store.sessions}
                  onCancel={store.cancelClosure}
                  onConfirmPayment={store.confirmPayment}
                />
              )}
            </>
          )}
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
