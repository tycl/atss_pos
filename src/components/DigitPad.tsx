export function DigitPad({
  onDigit,
  onBackspace,
  cornerLabel,
  onCorner,
}: {
  onDigit: (digit: string) => void
  onBackspace: () => void
  cornerLabel: string
  onCorner: () => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <button
          key={digit}
          onClick={() => onDigit(digit)}
          className="h-16 w-16 rounded border border-slate-300 bg-white text-xl"
        >
          {digit}
        </button>
      ))}
      <button
        onClick={onCorner}
        className="h-16 w-16 rounded border border-slate-300 bg-white text-sm"
      >
        {cornerLabel}
      </button>
      <button
        onClick={() => onDigit('0')}
        className="h-16 w-16 rounded border border-slate-300 bg-white text-xl"
      >
        0
      </button>
      <button
        onClick={onBackspace}
        className="h-16 w-16 rounded border border-slate-300 bg-white text-sm"
      >
        ⌫
      </button>
    </div>
  )
}
