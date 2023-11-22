import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'
import { APIGatewayProxyHandler, EventBridgeHandler } from 'aws-lambda'
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
 * HTTP POST /order handling. Create an order and post it in an 'Order.Created' event
 */
export const handleOrderCreate: APIGatewayProxyHandler = middify(async function handleOrderCreate (event){
  log.info({ event })

  const orderId = uuidv4()
  const order = {
    orderId,
    createdAt: Date.now()
  }

  await eventSender.send('Order.Created', order)
  return {
    statusCode: 201,
    body: JSON.stringify(order)
  }
})

/**
 * Handle EventBridge events indicating a delivery update for an order.
 * An 'Order.Updated' event is emitted to indicate that the order is delivered.
 */
export const handleDeliveryUpdate: EventBridgeHandler<string, any, any> = middify(async function handleDeliveryUpdate (event, context) {
  log.info({ event })

  const { order, deliveredAt } = event.detail.data

  const updatedOrder = {
    ...order,
    deliveredAt,
    updatedAt: Date.now()
  }

  await eventSender.send('Order.Updated', updatedOrder)
  return updatedOrder
})
