import { registerPlugin } from '@capacitor/core'

export type PrinterConnectionType = 'bluetooth' | 'tcp' | 'usb'

export type PrintReceiptOptions = {
  text: string
  connectionType: PrinterConnectionType
  /** Bluetooth MAC address, or TCP host. Omit for Bluetooth to use the
   * first paired printer. Unused for USB. */
  address?: string
  /** TCP port only (default 9100, the common ESC/POS network port). */
  port?: number
  dpi?: number
  widthMm?: number
  charsPerLine?: number
  /** Also pulses the cash drawer. Printing and the drawer kick are one
   * native call since DantSu's library only exposes them combined. */
  openDrawer?: boolean
}

export type PairedPrinter = { name: string; address: string }

export type EscPosPrinterPlugin = {
  printReceipt(options: PrintReceiptOptions): Promise<void>
  listPairedBluetoothPrinters(): Promise<{ printers: PairedPrinter[] }>
}

export const EscPosPrinter = registerPlugin<EscPosPrinterPlugin>('EscPosPrinter')
