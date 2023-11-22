import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'

import { EventBridgeHandler } from 'aws-lambda'
import { Tracer } from '@aws-lambda-powertools/tracer'
import { EventSender } from './event-util'
import { middify } from './lambda-common'

const { SERVICE_IDENTIFIER } = process.env

if (!SERVICE_IDENTIFIER) {
  throw new Error('SERVICE_IDENTIFIER env var is required')
}
const log = pino({ name: SERVICE_IDENTIFIER })
const tracer = new Tracer({ serviceName: SERVICE_IDENTIFIER })
const eventSender = new EventSender(SERVICE_IDENTIFIER, tracer)

/**
 * Order Delivery processing - handle EventBridge events for Order.Created
 * and emit a Delivery.UpdatedEvent
 */
export const handleOrderCreated: EventBridgeHandler<string, any, any> = middify(async function (event, context) {
  log.info({ event })

  const order = event.detail.data

  // Sleep to simulate some delivery processing
  await new Promise((resolve) => {
    setTimeout(resolve, 5000)
  })

  const deliveryUpdate = {
    order,
    deliveredAt: Date.now(),
    deliveryId: uuidv4()
  }
  await eventSender.send('Delivery.Updated', deliveryUpdate)
})
