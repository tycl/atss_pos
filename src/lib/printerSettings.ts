import type { PrinterConnectionType } from './escPosPlugin'

const PRINTER_STORAGE_KEY = 'atss_printer'

export type PrinterSettings = {
  connectionType: PrinterConnectionType
  /** Bluetooth MAC address or TCP host; unused for USB. */
  address: string
  /** TCP only. */
  port: number
  widthMm: number
  charsPerLine: number
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  connectionType: 'bluetooth',
  address: '',
  port: 9100,
  widthMm: 48,
  charsPerLine: 32,
}

/** Printer hardware is wired to one physical tablet, not the merchant
 * account, so this lives in localStorage rather than Supabase/Dexie. */
export function getPrinterSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(PRINTER_STORAGE_KEY)
    if (!raw) return DEFAULT_PRINTER_SETTINGS
    return { ...DEFAULT_PRINTER_SETTINGS, ...(JSON.parse(raw) as Partial<PrinterSettings>) }
  } catch {
    return DEFAULT_PRINTER_SETTINGS
  }
}

export function savePrinterSettings(settings: PrinterSettings): void {
  try {
    localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // best-effort; printing will just fall back to defaults next load
  }
}
