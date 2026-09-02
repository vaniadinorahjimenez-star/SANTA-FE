import { ShiftCutRecord, Settings } from '../types';
import { EscPosEncoder } from './thermalPrinter';

/**
 * Genera el paquete binario ESC/POS completo del Ticket de Corte de Caja / Turno para impresora térmica (58mm / 80mm)
 */
export function buildShiftCutEscPosBytes(cut: ShiftCutRecord, settings: Settings, width = 32): Uint8Array {
  const encoder = new EscPosEncoder();

  encoder
    .init()
    .openCashDrawer() // Abrir cajón de dinero al realizar el corte
    .align('center')
    .bold(true)
    .size('large')
    .line(settings.bakeryName || 'Panaderia Santa Fé el refugio')
    .size('normal')
    .bold(true)
    .line(settings.slogan || 'Pan calientito y tradicional.')
    .line(settings.address || '7:00 am a 10:00 pm')
    .line(settings.phone || '442 816 3291')
    .separator(width, '=')
    .bold(true)
    .size('large')
    .line('CORTE DE CAJA / TURNO')
    .size('normal')
    .bold(true)
    .separator(width, '=')
    .align('left')
    .twoColumns(`FOLIO: ${cut.folio}`, cut.time, width)
    .twoColumns(`FECHA: ${cut.date}`, `CAJA: 1`, width)
    .line(`CAJERO(A): ${cut.cashierName}`)
    .line(`TURNO: ${cut.shiftName}`)
    .separator(width, '-')
    .bold(true)
    .line('RESUMEN DE VENTAS:')
    .separator(width, '-')
    .twoColumns('VENTAS BRUTO:', `$${cut.totalGrossSales}.00`, width)
    .twoColumns('VENTAS EN EFECTIVO:', `$${cut.totalCashSales}.00`, width)
    .twoColumns('VENTAS CON TARJETA:', `$${cut.totalCardSales}.00${cut.isCardManualOverride ? ' *' : ''}`, width);

  if (cut.totalBreadSales !== undefined || cut.totalNonBreadSales !== undefined) {
    encoder
      .separator(width, '.')
      .line('DESGLOSE PAN VS OTROS:')
      .twoColumns('VENTA DE PAN:', `$${cut.totalBreadSales || 0}.00 (${cut.breadPieces || 0} pz)`, width)
      .twoColumns('OTROS (NO PAN):', `$${cut.totalNonBreadSales || 0}.00 (${cut.nonBreadPieces || 0} art)`, width);

    if (cut.nonBreadItems && cut.nonBreadItems.length > 0) {
      encoder.line('DETALLE NO PAN (REGISTRADOS):');
      cut.nonBreadItems.forEach(item => {
        encoder.twoColumns(` • ${item.name} (${item.quantity} pz)`, `$${item.total}.00`, width);
      });
    }

    encoder.separator(width, '.');
  }

  encoder
    .twoColumns('TOTAL PIEZAS:', `${cut.totalPieces} pzs`, width)
    .twoColumns('TICKETS COBRADOS:', `${cut.ticketsCount}`, width)
    .separator(width, '-')
    .bold(true)
    .line('SALIDAS / PAGOS PROVEEDOR:')
    .separator(width, '-');

  // Detalle de salidas desglosadas
  if (!cut.outflows || cut.outflows.length === 0) {
    encoder.line('  (Sin salidas registradas)');
  } else {
    cut.outflows.forEach((outflow, idx) => {
      const leftText = `${idx + 1}. ${outflow.concept}`;
      const amountText = `-$${outflow.amount}.00`;
      encoder.bold(true).twoColumns(leftText, amountText, width);
      
      const extraDetails: string[] = [];
      if (outflow.time) extraDetails.push(`Hora: ${outflow.time}`);
      if (outflow.recipient) extraDetails.push(`Recibió: ${outflow.recipient}`);
      if (outflow.notes) extraDetails.push(`Nota: ${outflow.notes}`);

      if (extraDetails.length > 0) {
        encoder.line(`   ${extraDetails.join(' | ').slice(0, width - 4)}`);
      }
    });
  }

  encoder
    .separator(width, '-')
    .bold(true)
    .twoColumns('TOTAL SALIDAS:', `-$${cut.totalOutflows}.00`, width)
    .separator(width, '=')
    .bold(true)
    .line('BALANCE FINAL DE CAJA:')
    .separator(width, '-')
    .twoColumns('(+) FONDO INICIAL:', `$${cut.initialCash}.00`, width)
    .twoColumns('(+) EFECTIVO COBRADO:', `+$${cut.totalCashSales}.00`, width)
    .twoColumns('(-) TOTAL SALIDAS:', `-$${cut.totalOutflows}.00`, width)
    .separator(width, '-')
    .twoColumns('(=) TOTAL EN CAJON:', `$${cut.expectedCashInDrawer}.00`, width);

  if (cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) {
    encoder.twoColumns('(-) FONDO SIG. TURNO:', `-$${cut.nextShiftCash}.00`, width);
  }

  const deliverCashEscPos = cut.cashToDeliver !== undefined 
    ? cut.cashToDeliver 
    : (cut.nextShiftCash ? Math.max(0, cut.expectedCashInDrawer - cut.nextShiftCash) : cut.expectedCashInDrawer);

  encoder
    .separator(width, '=')
    .bold(true)
    .size('large')
    .twoColumns('A ENTREGAR:', `$${deliverCashEscPos}.00`, width)
    .size('normal')
    .bold(true);

  if (cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) {
    encoder.line(`(Quedan $${cut.nextShiftCash}.00 en caja para sig. turno)`);
  }

  if (cut.actualCashInDrawer !== undefined) {
    encoder.twoColumns('EFECTIVO CONTADO:', `$${cut.actualCashInDrawer}.00`, width);
    if (cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) {
      encoder.twoColumns('REAL A RETIRAR:', `$${Math.max(0, cut.actualCashInDrawer - cut.nextShiftCash)}.00`, width);
    }
    if (cut.difference !== undefined && cut.difference !== 0) {
      const diffLabel = cut.difference > 0 ? 'SOBRANTE:' : 'FALTANTE:';
      encoder.twoColumns(diffLabel, `$${Math.abs(cut.difference)}.00`, width);
    }
  }

  if (cut.notes) {
    encoder.separator(width, '-');
    encoder.line(`NOTAS: ${cut.notes}`);
  }

  encoder
    .separator(width, '=')
    .feed(2)
    .align('center')
    .line('___________________________')
    .line('Firma del Cajero(a)')
    .feed(2)
    .line('___________________________')
    .line('Firma de Recibido (Admin)')
    .feed(1)
    .line(settings.ticketFooter || '¡Gracias por su preferencia!')
    .feed(3)
    .cut();

  return encoder.encode();
}

/**
 * Imprime directamente el ticket de corte en formato térmico (58mm/80mm) usando iframe aislado
 */
export function printShiftCutDirectToPrinter(cut: ShiftCutRecord, settings: Settings): boolean {
  try {
    const is80 = settings.ticketPaperWidth === '80mm';
    const bodyWidth = is80 ? '76mm' : '68mm';
    const baseFontSize = is80 ? '12px' : '11.5px';
    const titleFontSize = is80 ? '15px' : '14px';
    const subTitleFontSize = is80 ? '11px' : '10px';
    const totalFontSize = is80 ? '15px' : '14px';

    const outflowsHtml = (!cut.outflows || cut.outflows.length === 0)
      ? '<div style="font-size: 11px; padding: 2px 0;">(Sin salidas registradas)</div>'
      : cut.outflows.map((o, idx) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; margin-bottom: 2px;">
          <span>${idx + 1}. ${o.concept}</span>
          <span style="font-weight: 900;">-$${o.amount}.00</span>
        </div>
        ${o.time || o.recipient ? `
          <div style="font-size: 9.5px; color: #333; padding-left: 8px;">
            ${[o.time ? `Hora: ${o.time}` : '', o.recipient ? `Recibió: ${o.recipient}` : ''].filter(Boolean).join(' | ')}
          </div>
        ` : ''}
      `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Corte de Caja - ${cut.folio}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 1.5mm 1.5mm 4mm 1.5mm;
            width: ${bodyWidth};
            max-width: ${bodyWidth};
            font-family: 'Courier New', Courier, monospace, system-ui;
            font-size: ${baseFontSize};
            font-weight: 900;
            color: #000000;
            line-height: 1.25;
            background: #ffffff;
            overflow-x: hidden;
            word-break: break-word;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .divider { border-top: 1.5px dashed #000; margin: 5px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .title { font-size: ${titleFontSize}; font-weight: 900; line-height: 1.2; }
          .subtitle { font-size: ${subTitleFontSize}; font-weight: 800; }
          .total-row { font-size: ${totalFontSize}; font-weight: 900; padding: 4px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">${settings.bakeryName || 'Panaderia Santa Fé el refugio'}</div>
          <div class="subtitle">${settings.slogan || 'Pan calientito y tradicional.'}</div>
          <div class="subtitle">${settings.address || '7:00 am a 10:00 pm'}</div>
          <div class="subtitle">TEL: ${settings.phone || '442 816 3291'}</div>
        </div>

        <div class="double-divider"></div>

        <div class="center">
          <div style="font-size: 14px; font-weight: 900;">CORTE DE CAJA / TURNO</div>
        </div>

        <div class="divider"></div>

        <div class="row"><span>FOLIO: ${cut.folio}</span><span>${cut.time}</span></div>
        <div class="row"><span>FECHA: ${cut.date}</span><span>CAJA: 1</span></div>
        <div class="row"><span>CAJERO(A):</span><span>${cut.cashierName}</span></div>
        <div class="row"><span>TURNO:</span><span>${cut.shiftName}</span></div>

        <div class="divider"></div>
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase;">RESUMEN DE VENTAS:</div>
        <div class="divider"></div>

        <div class="row"><span>VENTAS BRUTO:</span><span>$${cut.totalGrossSales}.00</span></div>
        <div class="row"><span>VENTAS EFECTIVO:</span><span>$${cut.totalCashSales}.00</span></div>
        <div class="row"><span>VENTAS TARJETA:</span><span>$${cut.totalCardSales}.00${cut.isCardManualOverride ? ' *' : ''}</span></div>
        
        ${(cut.totalBreadSales !== undefined || cut.totalNonBreadSales !== undefined) ? `
          <div style="border-top: 1px dotted #000; border-bottom: 1px dotted #000; padding: 2px 0; margin: 3px 0; font-size: 10.5px;">
            <div style="font-weight: 900; font-size: 10px;">DESGLOSE PAN VS OTROS:</div>
            <div class="row"><span>🍞 Venta de Pan (${cut.breadPieces || 0} pz):</span><span>$${cut.totalBreadSales || 0}.00</span></div>
            <div class="row"><span>🥛 Otros / No Pan (${cut.nonBreadPieces || 0} art):</span><span>$${cut.totalNonBreadSales || 0}.00</span></div>
            ${cut.nonBreadItems && cut.nonBreadItems.length > 0 ? `
              <div style="font-weight: 900; font-size: 9.5px; margin-top: 2px; border-top: 1px dashed #000; padding-top: 2px;">
                DETALLE NO PAN (SOLO REGISTRADOS):
              </div>
              ${cut.nonBreadItems.map(item => `
                <div class="row" style="font-size: 9.5px; padding-left: 4px;">
                  <span>• ${item.name} (${item.quantity} pz):</span>
                  <span>$${item.total}.00</span>
                </div>
              `).join('')}
            ` : ''}
          </div>
        ` : ''}

        <div class="row"><span>TOTAL PIEZAS:</span><span>${cut.totalPieces} pzs</span></div>
        <div class="row"><span>TICKETS COBRADOS:</span><span>${cut.ticketsCount}</span></div>

        <div class="divider"></div>
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase;">SALIDAS / PAGOS:</div>
        <div class="divider"></div>

        ${outflowsHtml}

        <div class="divider"></div>
        <div class="row"><span>TOTAL SALIDAS:</span><span>-$${cut.totalOutflows}.00</span></div>

        <div class="double-divider"></div>
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase;">BALANCE FINAL DE CAJA:</div>
        <div class="divider"></div>

        <div class="row"><span>(+) FONDO INICIAL:</span><span>$${cut.initialCash}.00</span></div>
        <div class="row"><span>(+) EFECTIVO COBRADO:</span><span>+$${cut.totalCashSales}.00</span></div>
        <div class="row"><span>(-) TOTAL SALIDAS:</span><span>-$${cut.totalOutflows}.00</span></div>
        <div class="row" style="border-top: 1px dotted #000; padding-top: 2px;">
          <span>(=) TOTAL EN CAJÓN:</span><span>$${cut.expectedCashInDrawer}.00</span>
        </div>
        ${(cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) ? `
          <div class="row"><span>(-) FONDO SIG. TURNO:</span><span>-$${cut.nextShiftCash}.00</span></div>
        ` : ''}

        <div class="double-divider"></div>
        <div class="row total-row">
          <span>A ENTREGAR:</span>
          <span>$${cut.cashToDeliver !== undefined ? cut.cashToDeliver : (cut.nextShiftCash ? Math.max(0, cut.expectedCashInDrawer - cut.nextShiftCash) : cut.expectedCashInDrawer)}.00</span>
        </div>
        ${(cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) ? `
          <div style="font-size: 9.5px; text-align: center; margin-top: 2px;">
            (Se quedan $${cut.nextShiftCash}.00 en caja para sig. turno)
          </div>
        ` : ''}
        <div class="double-divider"></div>

        ${cut.actualCashInDrawer !== undefined ? `
          <div class="row"><span>EFECTIVO CONTADO:</span><span>$${cut.actualCashInDrawer}.00</span></div>
          ${(cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) ? `
            <div class="row"><span>REAL A RETIRAR:</span><span>$${Math.max(0, cut.actualCashInDrawer - cut.nextShiftCash)}.00</span></div>
          ` : ''}
          ${cut.difference !== undefined && cut.difference !== 0 ? `
            <div class="row">
              <span>${cut.difference > 0 ? 'SOBRANTE:' : 'FALTANTE:'}</span>
              <span>$${Math.abs(cut.difference)}.00</span>
            </div>
          ` : ''}
        ` : ''}

        ${cut.notes ? `<div style="font-size: 10px; margin: 4px 0;">NOTA: ${cut.notes}</div>` : ''}

        <div style="margin-top: 25px; text-align: center;">
          <div>___________________________</div>
          <div style="font-size: 10px;">Firma del Cajero(a)</div>
        </div>

        <div style="margin-top: 20px; text-align: center;">
          <div>___________________________</div>
          <div style="font-size: 10px;">Firma de Recibido (Admin)</div>
        </div>

        <div class="divider"></div>
        <div class="center" style="font-size: 10px;">
          ${settings.ticketFooter || '¡Gracias por su preferencia!'}
        </div>
      </body>
      </html>
    `;

    const iframeId = 'shift-cut-print-direct-frame';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.style.zIndex = '-9999';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('Iframe print failed, falling back to window.print():', printErr);
          window.print();
        }
      }, 150);
      return true;
    } else {
      window.print();
      return true;
    }
  } catch (e) {
    console.error('Error in printShiftCutDirectToPrinter:', e);
    window.print();
    return false;
  }
}
