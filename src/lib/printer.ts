export class ThermalPrinter {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  // ESC/POS Commands
  private CMD = {
    INIT: new Uint8Array([0x1B, 0x40]),
    CUT: new Uint8Array([0x1D, 0x56, 0x41, 0x10]), // Full cut
    NEWLINE: new Uint8Array([0x0A]),
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
    TXT_NORMAL: new Uint8Array([0x1B, 0x21, 0x00]),
    TXT_BOLD: new Uint8Array([0x1B, 0x45, 0x01]),
    TXT_BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
    TXT_DOUBLE_WIDTH: new Uint8Array([0x1B, 0x21, 0x20]),
    TXT_DOUBLE_HEIGHT: new Uint8Array([0x1B, 0x21, 0x10]),
  };

  /** Conectar y solicitar permiso para la impresora USB serial */
  async connect(): Promise<boolean> {
    if (!('serial' in navigator)) {
      console.error("Web Serial API no está soportada en este navegador.");
      return false;
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      this.writer = this.port.writable?.getWriter() || null;
      if (!this.writer) return false;
      
      await this.send(this.CMD.INIT);
      return true;
    } catch (e) {
      console.error("Error conectando a impresora:", e);
      return false;
    }
  }

  async disconnect() {
    if (this.writer) {
      await this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  /** Enviar bytes raw */
  private async send(data: Uint8Array) {
    if (this.writer) {
      await this.writer.write(data);
    }
  }

  /** Imprimir linea de texto normal y salto de linea */
  async printLine(text: string) {
    const encoder = new TextEncoder();
    // Reemplaza caracteres complejos o acentos al formato utf-8 simplificado
    const cleanedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    await this.send(encoder.encode(cleanedText));
    await this.send(this.CMD.NEWLINE);
  }

  /** Configurable helper para el título y tamaño */
  async setBold(enable: boolean) {
    await this.send(enable ? this.CMD.TXT_BOLD : this.CMD.TXT_BOLD_OFF);
  }
  
  async setAlignCenter() { await this.send(this.CMD.ALIGN_CENTER); }
  async setAlignLeft() { await this.send(this.CMD.ALIGN_LEFT); }

  async feedLines(lines: number = 3) {
    for (let i = 0; i < lines; i++) {
        await this.send(this.CMD.NEWLINE);
    }
  }

  /** Cortar papel */
  async cutPaper() {
    await this.send(this.CMD.CUT);
  }

  /** Wrapper simplificado para imprimir un Recibo Genérico */
  async printReceipt(commerceName: string, items: {name: string, price: number, qty: number}[], total: number) {
    await this.setAlignCenter();
    await this.setBold(true);
    await this.printLine(`--- ${commerceName.toUpperCase()} ---`);
    await this.setBold(false);
    await this.printLine("TICKET DE VENTA");
    await this.printLine(`Fecha: ${new Date().toLocaleString()}`);
    await this.send(this.CMD.NEWLINE);
    
    await this.setAlignLeft();
    await this.printLine("CANT   DESCRIPCION         SUBTOTAL");
    await this.printLine("--------------------------------");
    items.forEach(async item => {
       const qty = String(item.qty).padEnd(6, ' ');
       const name = item.name.substring(0, 15).padEnd(16, ' ');
       const price = `$${(item.price * item.qty).toFixed(2)}`.padStart(10, ' ');
       await this.printLine(`${qty}${name}${price}`);
    });
    await this.printLine("--------------------------------");
    
    await this.setAlignCenter();
    await this.setBold(true);
    await this.printLine(`TOTAL: $${total.toFixed(2)}`);
    await this.setBold(false);
    
    await this.feedLines(4);
    await this.cutPaper();
  }

  /** Reporte Z - Cierre Fiscal DIAN */
  async printZReport(data: {
    venue: string,
    type: 'X' | 'Z',
    timestamp: string,
    invoiceRange: string,
    totalGross: number,
    totalTax: number,
    totalNet: number,
    invoiceCount: number,
    breakdown: { cash: number, card: number, digital: number }
  }) {
    await this.setAlignCenter();
    await this.setBold(true);
    await this.printLine("--------------------------------");
    await this.printLine("     AURORA OPERATING SYSTEM    ");
    await this.printLine("--------------------------------");
    await this.setBold(false);
    await this.printLine(data.venue.toUpperCase());
    await this.printLine(`CIERRE FISCAL: REPORTE ${data.type}`);
    await this.printLine(`FECHA: ${new Date(data.timestamp).toLocaleString()}`);
    await this.send(this.CMD.NEWLINE);

    await this.setAlignLeft();
    await this.printLine(`RANGO FACTURAS: ${data.invoiceRange}`);
    await this.printLine(`NUMERO DE TICKETS: ${data.invoiceCount}`);
    await this.printLine("--------------------------------");
    
    await this.printLine("DESGLOSE DE VENTAS:");
    await this.printLine(`EFECTIVO:      $${data.breakdown.cash.toLocaleString()}`);
    await this.printLine(`DATAFONO:      $${data.breakdown.card.toLocaleString()}`);
    await this.printLine(`NEQUI/TRANSF:  $${data.breakdown.digital.toLocaleString()}`);
    await this.printLine("--------------------------------");
    
    await this.printLine(`BASE IMPONIBLE:  $${data.totalNet.toLocaleString()}`);
    await this.printLine(`IMPUESTOS (15%): $${data.totalTax.toLocaleString()}`);
    await this.send(this.CMD.NEWLINE);

    await this.setBold(true);
    await this.setAlignCenter();
    await this.printLine(`TOTAL BRUTO: $${data.totalGross.toLocaleString()}`);
    await this.setBold(false);
    await this.send(this.CMD.NEWLINE);
    
    await this.printLine("--- FIN DEL REPORTE Z ---");
    await this.feedLines(5);
    await this.cutPaper();
  }
}

// Global Singleton Instance
export const printerRegistry = new ThermalPrinter();
