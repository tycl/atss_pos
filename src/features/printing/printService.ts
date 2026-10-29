import { Capacitor } from '@capacitor/core'
import { EscPosPrinter } from '../../lib/escPosPlugin'
import { getPrinterSettings } from '../../lib/printerSettings'

/** Sends formatted text to the configured printer. A no-op (logged, not
 * thrown) when not running on a native device -- e.g. the Vite dev server
 * or the back-office browser -- since there is no printer to reach there. */
export async function printText(text: string, openDrawer = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.info('[print] Skipped (no native printer on this platform):', text)
    return
  }

  const settings = getPrinterSettings()
  await EscPosPrinter.printReceipt({
    text,
    connectionType: settings.connectionType,
    address: settings.address || undefined,
    port: settings.port,
    widthMm: settings.widthMm,
    charsPerLine: settings.charsPerLine,
    openDrawer,
  })
}
