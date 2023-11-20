import pino from 'pino'
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge'

const log = pino({ name: 'event-sender' })

const { BUS_ARN } = process.env

import { Tracer } from '@aws-lambda-powertools/tracer'

/**
 * Utility to create EventBridge events in a consistent format
 *
 * @returns An EventSender
 */
export class EventSender {

  serviceName: string
  tracer: Tracer

  constructor(serviceName: string, tracer: Tracer) {
    this.serviceName = serviceName
    this.tracer = tracer
  }

  /**
   * Send an event to EventBridge
   */
  send (detailType: string, data: object) {
    const client = this.tracer.captureAWSv3Client(new EventBridgeClient({}))
    const params = {
      Entries: [{
        EventBusName: BUS_ARN,
        Source: this.serviceName,
        DetailType: detailType,
        Detail: JSON.stringify({
          data,
          meta: {}
        })
      }]
    }
    log.info({ params }, 'Sending events')
    return client.send(new PutEventsCommand(params))
  }
}
