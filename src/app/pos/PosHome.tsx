import { useState } from 'react'
import type { OrderType, Staff } from '../../lib/types'
import { OpenOrdersScreen } from './OpenOrdersScreen'
import { OrderHistoryScreen } from './OrderHistoryScreen'
import { PosScreen } from './PosScreen'
import { ZReportScreen } from './ZReportScreen'

export type OrderContext = {
  orderId: string | null
  type: OrderType
  tableId: string | null
}

type View =
  | { name: 'open-orders' }
  | { name: 'order'; context: OrderContext }
  | { name: 'history' }
  | { name: 'z-report' }

export function PosHome({ staff }: { staff: Staff }) {
  const [view, setView] = useState<View>({ name: 'open-orders' })

  if (view.name === 'order') {
    return (
      <PosScreen
        staff={staff}
        orderContext={view.context}
        onDone={() => setView({ name: 'open-orders' })}
      />
    )
  }

  if (view.name === 'history') {
    return <OrderHistoryScreen staff={staff} onBack={() => setView({ name: 'open-orders' })} />
  }

  if (view.name === 'z-report') {
    return <ZReportScreen onBack={() => setView({ name: 'open-orders' })} />
  }

  return (
    <OpenOrdersScreen
      staff={staff}
      onOpenOrder={(context) => setView({ name: 'order', context })}
      onOpenHistory={() => setView({ name: 'history' })}
      onOpenZReport={() => setView({ name: 'z-report' })}
    />
  )
}
