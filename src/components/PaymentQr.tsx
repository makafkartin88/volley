import QRCode from 'qrcode'
import { buildSpdPayload } from '@/domain/spd'
import { getPayeeIban, getPayeeName, getReadableAccount } from '@/lib/bank'
import { formatCzk } from '@/lib/format'

/**
 * QR platba (SPD). Server Component — SVG se vyrenderuje na serveru, do
 * klienta se nedostane žádná QR knihovna.
 *
 * Payload jde beze změny přes `buildSpdPayload` (Task 3, otestováno) —
 * žádná SPD logika tu není znovu napsaná.
 */
export async function PaymentQr({
  amountCzk,
  message,
  variableSymbol,
}: {
  amountCzk: number
  message: string
  variableSymbol: string
}) {
  const payload = buildSpdPayload({
    iban: getPayeeIban(),
    amountCzk,
    message,
    variableSymbol,
    payeeName: getPayeeName(),
  })
  const svg = await QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    // Bez `width` knihovna vygeneruje SVG jen s `viewBox`, žádnou šířkou
    // ani výškou — v `w-fit` obalu se to zhroutí na 0×0 px a QR je neviditelný.
    width: 240,
    color: { dark: '#0A0A0B', light: '#FFFFFF' },
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Bílé pozadí je nutné i v tmavém tématu — čtečky nespolehlivě
          čtou invertovaný QR kód a platba by nešla naskenovat. */}
      <div
        className="w-fit rounded-object bg-white p-4"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <dl className="flex flex-col gap-1 text-meta">
        <div className="flex justify-between gap-4">
          <dt className="text-chalk-dim">Účet</dt>
          <dd className="text-chalk">{getReadableAccount()}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-chalk-dim">Částka</dt>
          <dd className="text-chalk">{formatCzk(amountCzk)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-chalk-dim">Variabilní symbol</dt>
          <dd className="text-chalk">{variableSymbol}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-chalk-dim">Zpráva</dt>
          <dd className="text-chalk">{message}</dd>
        </div>
      </dl>
    </div>
  )
}
