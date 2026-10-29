import { useState, type FormEvent } from 'react'
import type { PrinterConnectionType } from '../../lib/escPosPlugin'
import { getPrinterSettings, savePrinterSettings } from '../../lib/printerSettings'

const CONNECTION_LABELS: Record<PrinterConnectionType, string> = {
  bluetooth: 'Bluetooth',
  tcp: 'Network (LAN/Wi-Fi)',
  usb: 'USB',
}

export function PrinterSettingsSection() {
  const initial = getPrinterSettings()
  const [connectionType, setConnectionType] = useState<PrinterConnectionType>(
    initial.connectionType,
  )
  const [address, setAddress] = useState(initial.address)
  const [port, setPort] = useState(String(initial.port))
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    savePrinterSettings({
      connectionType,
      address: address.trim(),
      port: Number(port) || 9100,
      widthMm: initial.widthMm,
      charsPerLine: initial.charsPerLine,
    })
    setSaved(true)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded border border-slate-200 bg-white p-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Printer (this device)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Saved only on this tablet -- each device can use its own printer.
        </p>
      </div>

      <div>
        <label htmlFor="connectionType" className="block text-sm font-medium text-slate-700">
          Connection
        </label>
        <select
          id="connectionType"
          value={connectionType}
          onChange={(event) => setConnectionType(event.target.value as PrinterConnectionType)}
          className="mt-1 rounded border border-slate-300 px-3 py-2"
        >
          {(Object.keys(CONNECTION_LABELS) as PrinterConnectionType[]).map((type) => (
            <option key={type} value={type}>
              {CONNECTION_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {connectionType !== 'usb' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="address" className="block text-sm font-medium text-slate-700">
              {connectionType === 'bluetooth'
                ? 'Bluetooth address (optional)'
                : 'Printer IP address'}
            </label>
            <input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={
                connectionType === 'bluetooth'
                  ? 'Uses first paired printer if blank'
                  : '192.168.1.50'
              }
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          {connectionType === 'tcp' && (
            <div>
              <label htmlFor="port" className="block text-sm font-medium text-slate-700">
                Port
              </label>
              <input
                id="port"
                value={port}
                onChange={(event) => setPort(event.target.value)}
                inputMode="numeric"
                className="mt-1 w-24 rounded border border-slate-300 px-3 py-2"
              />
            </div>
          )}
        </div>
      )}

      {saved && <p className="text-sm text-green-700">Saved on this device.</p>}

      <button type="submit" className="rounded bg-slate-700 px-4 py-2 text-sm text-white">
        Save printer
      </button>
    </form>
  )
}
