import { jsPDF } from 'jspdf';
import type { Closure, Session } from './types';
import { getFisioName, getFisioCrefito, formatBRL, formatDate, formatDateTime } from './utils';

function renderTableColumnsHeader(
  doc: jsPDF,
  y: number,
  bgColor: [number, number, number] = [241, 245, 249],
): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...bgColor);
  doc.rect(14, y, W - 28, 6.5, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Data', 16, y + 4.5);
  doc.text('Paciente', 38, y + 4.5);
  doc.text('Guia / Plano', 96, y + 4.5);
  doc.text('Valor', 152, y + 4.5);
  doc.text('Situação', W - 18, y + 4.5, { align: 'right' });
  return y + 6.5;
}

function renderTableHeader(
  doc: jsPDF,
  y: number,
  title: string,
  titleColor: [number, number, number],
  subtitle?: string,
  bgColor: [number, number, number] = [241, 245, 249],
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...titleColor);
  doc.text(title, 14, y);
  let curY = y + 4;
  if (subtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, curY);
    curY += 4.5;
  }
  return renderTableColumnsHeader(doc, curY, bgColor);
}

function buildFisioPages(
  doc: jsPDF,
  closure: Closure | null,
  fisioId: string,
  sessions: Session[],
  isPreview: boolean,
  isFirstFisio: boolean,
): void {
  if (!isFirstFisio) doc.addPage();

  const W = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header bar
  doc.setFillColor(22, 101, 52); // green-800
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Harmonia Fisioterapia', 14, 11);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Produção e Fechamento', 14, 19);

  if (isPreview) {
    doc.setFillColor(234, 179, 8); // yellow
    doc.rect(W - 60, 4, 52, 11, 'F');
    doc.setTextColor(92, 64, 0);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PRÉVIA — NÃO CONFIRMADO', W - 57, 11);
  } else if (closure?.status === 'pendente') {
    doc.setFillColor(245, 158, 11);
    doc.rect(W - 60, 4, 52, 11, 'F');
    doc.setTextColor(92, 46, 0);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGAMENTO PENDENTE', W - 54, 11);
  } else if (closure?.status === 'pago') {
    doc.setFillColor(16, 185, 129);
    doc.rect(W - 60, 4, 52, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGAMENTO CONFIRMADO', W - 56, 11);
  }

  // Fisio info
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(getFisioName(fisioId), 14, 36);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(getFisioCrefito(fisioId), 14, 43);

  // Period & closure info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8.5);
  const periodText = closure
    ? `Período: ${formatDate(closure.periodStart)} a ${formatDate(closure.periodEnd)}`
    : 'Período: Prévia atual';
  doc.text(periodText, 14, 51);

  let metaY = 57;
  if (closure) {
    doc.text(`Fechamento: ${formatDateTime(closure.createdAt)} | ID: ${closure.id}`, 14, metaY);
    metaY += 6;
    if (closure.paidAt) {
      doc.text(`Pagamento confirmado em: ${formatDateTime(closure.paidAt)}`, 14, metaY);
      metaY += 6;
    }
  }

  // Find per-fisio entry if closure is present
  const entry = closure
    ? closure.perFisio.find(e => e.fisioId === fisioId)
    : null;

  const fisioSessions = sessions.filter(s => s.fisioId === fisioId);

  // 1. Eligible sessions (contabilizadas)
  const eligibleSessions: Session[] = closure
    ? closure.sessions
        .map(cs => fisioSessions.find(s => s.id === cs.sessionId))
        .filter((s): s is Session => !!s)
    : fisioSessions.filter(s => s.glosa === 'nao_glosada' && s.financialStatus === 'disponivel');

  // 2. Glosadas sessions (não contabilizadas)
  const glossedSessions = fisioSessions.filter(s => s.glosa === 'glosada');

  // 3. Reservadas sessions (não contabilizadas - exclui as que pertencem a este fechamento)
  const reservedSessions = fisioSessions.filter(s =>
    s.financialStatus === 'reservada' &&
    s.glosa !== 'glosada' &&
    (closure ? !closure.sessions.some(cs => cs.sessionId === s.id) : true)
  );

  // Calculation values
  const gross = entry
    ? entry.grossValue
    : eligibleSessions.reduce((sum, s) => sum + s.valuePerSession, 0);
  const taxValue = entry ? entry.taxValue : gross * 0.05;
  const clinicValue = entry ? entry.clinicValue : (gross - taxValue) * 0.2;
  const netValue = entry ? entry.netValue : gross - taxValue - clinicValue;

  // Summary box
  const boxY = metaY + 2;
  const boxHeight = 74;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, boxY, W - 28, boxHeight, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, W - 28, boxHeight, 2.5, 2.5, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('Resumo Financeiro', 20, boxY + 8);

  const rows: [string, string][] = [
    ['Sessões elegíveis (contabilizadas)', `${eligibleSessions.length}`],
    ['Sessões glosadas (não contabilizadas)', `${glossedSessions.length}`],
    ['Sessões reservadas (não contabilizadas)', `${reservedSessions.length}`],
    ['Valor bruto apurado', formatBRL(gross)],
    ['Imposto (5%)', `- ${formatBRL(taxValue)}`],
    ['Parcela da clínica (20% s/ saldo)', `- ${formatBRL(clinicValue)}`],
  ];

  let ry = boxY + 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  for (const [label, val] of rows) {
    doc.setTextColor(71, 85, 105);
    doc.text(label, 20, ry);
    doc.setTextColor(30, 41, 59);
    doc.text(val, W - 20, ry, { align: 'right' });
    ry += 6.5;
  }

  // Divisor sutil antes do total (SEM faixa verde)
  doc.setDrawColor(203, 213, 225);
  doc.line(20, ry + 1, W - 20, ry + 1);

  // Total líquido em negrito direto, sem faixa verde
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Valor líquido (profissional):', 20, ry + 8.5);
  doc.text(formatBRL(netValue), W - 20, ry + 8.5, { align: 'right' });

  // Memória de cálculo
  const memY = boxY + boxHeight + 5;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Memória de cálculo:', 14, memY);
  doc.text(
    `Bruto ${formatBRL(gross)} − Imposto 5% (${formatBRL(taxValue)}) = ${formatBRL(gross - taxValue)} − Parcela clínica 20% (${formatBRL(clinicValue)}) = Líquido ${formatBRL(netValue)}`,
    14,
    memY + 4.5,
  );

  let curY = memY + 13;

  const checkPageBreak = (neededHeight: number) => {
    if (curY + neededHeight > pageHeight - 16) {
      doc.addPage();
      doc.setFillColor(22, 101, 52);
      doc.rect(0, 0, W, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Harmonia Fisioterapia — ${getFisioName(fisioId)} (continuação)`, 14, 7);
      curY = 16;
      return true;
    }
    return false;
  };

  // ─── Tabela 1: Sessões Elegíveis (Contabilizadas) ───
  curY = renderTableHeader(
    doc,
    curY,
    `Sessões Elegíveis (Contabilizadas na Produção) — Total: ${eligibleSessions.length}`,
    [22, 101, 52],
    undefined,
    [241, 245, 249],
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (eligibleSessions.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhuma sessão elegível para este profissional no período.', 16, curY + 4.5);
    curY += 8;
  } else {
    for (const s of eligibleSessions) {
      if (checkPageBreak(6)) {
        curY = renderTableColumnsHeader(doc, curY, [241, 245, 249]);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(formatDate(s.date), 16, curY + 4);
      doc.text(s.patient.length > 25 ? s.patient.substring(0, 24) + '…' : s.patient, 38, curY + 4);
      doc.text(s.guia.length > 27 ? s.guia.substring(0, 26) + '…' : s.guia, 96, curY + 4);
      doc.text(formatBRL(s.valuePerSession), 152, curY + 4);
      doc.setTextColor(22, 101, 52);
      doc.text('Elegível', W - 18, curY + 4, { align: 'right' });
      curY += 5.5;
    }
  }

  curY += 6;

  // ─── Tabela 2: Sessões Não Contabilizadas (Glosadas e Reservadas) ───
  const nonCountedSessions = [...glossedSessions, ...reservedSessions];

  checkPageBreak(25);

  curY = renderTableHeader(
    doc,
    curY,
    `Sessões Não Contabilizadas — Glosadas e Reservadas (Apenas Visualização) — Total: ${nonCountedSessions.length}`,
    [180, 83, 9],
    'Apenas informativo: estas sessões NÃO entram no cálculo do valor bruto nem nos repasses.',
    [254, 243, 199], // light amber header
  );

  if (nonCountedSessions.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('Nenhuma sessão glosada ou reservada para este profissional.', 16, curY + 4.5);
    curY += 8;
  } else {
    for (const s of nonCountedSessions) {
      if (checkPageBreak(6)) {
        curY = renderTableColumnsHeader(doc, curY, [254, 243, 199]);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(formatDate(s.date), 16, curY + 4);
      doc.text(s.patient.length > 25 ? s.patient.substring(0, 24) + '…' : s.patient, 38, curY + 4);
      doc.text(s.guia.length > 27 ? s.guia.substring(0, 26) + '…' : s.guia, 96, curY + 4);
      doc.text(formatBRL(s.valuePerSession), 152, curY + 4);

      if (s.glosa === 'glosada') {
        doc.setTextColor(220, 38, 38); // red
        doc.text('Glosada', W - 18, curY + 4, { align: 'right' });
      } else {
        doc.setTextColor(217, 119, 6); // amber
        doc.text('Reservada', W - 18, curY + 4, { align: 'right' });
      }
      curY += 5.5;
    }
  }
}

export function generatePDF(
  closure: Closure | null,
  fisioIds: string[],
  sessions: Session[],
  isPreview = false,
  filename?: string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  fisioIds.forEach((fid, idx) => {
    buildFisioPages(doc, closure, fid, sessions, isPreview, idx === 0);
  });

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 8;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Emitido em: ${new Date().toLocaleString('pt-BR')} · Valores demonstrativos sujeitos a validação`,
      14,
      footerY,
    );
    doc.text(`Página ${p} de ${totalPages}`, W - 14, footerY, { align: 'right' });
  }

  const name = filename ?? (closure ? `fechamento-${closure.id}` : 'previa-apuracao');
  doc.save(`${name}.pdf`);
}
