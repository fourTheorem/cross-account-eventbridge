import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'

import { EventBridgeHandler } from 'aws-lambda'
import { Tracer } from '@aws-lambda-powertools/tracer'
import { EventSender } from './event-util'

const SERVICE_NAME = 'delivery.service'

const log = pino({ name: SERVICE_NAME })
const tracer = new Tracer({ serviceName: SERVICE_NAME })
const eventSender = new EventSender(SERVICE_NAME, tracer)

/**
 * Order Delivery processing - handle EventBridge events for Order.Created
 * and emit a Delivery.UpdatedEvent
 */
export const handleOrderCreated: EventBridgeHandler<string, any, any> = async function (event, context) {
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
}
