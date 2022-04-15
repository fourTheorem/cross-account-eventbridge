import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events'
import * as logs from 'aws-cdk-lib/aws-logs'
import {
   EventBus as EventBusTarget,
   CloudWatchLogGroup as LogGroupTarget
} from 'aws-cdk-lib/aws-events-targets'

/**
 * Stack to create a global EventBus. All applications post cross-domain events to this bus.
 * This bus also has rules to forward global events to local buses in each application account
 * where rules can be created to handle events in each application.
 */
export class BusStack extends Stack {
  bus: events.EventBus
  /**
   * List of local bus accounts to which global events should be forwarded.
   */
  localBusAccounts: string[] = []

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const busLogGroup = new logs.LogGroup(this, 'GlobalBusLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
    })

    const bus = new events.EventBus(this, 'Bus', {
      eventBusName: 'global-bus',
    })

    new events.CfnEventBusPolicy(this, 'BusPolicy', {
      eventBusName: bus.eventBusName,
      statementId: 'global-bus-policy-stmt',
      statement: {
        Principal: { AWS: this.localBusAccounts },
        Action: 'events:PutEvents',
        Resource: bus.eventBusArn,
        Effect: 'Allow'
      }
    })

    new events.Rule(this, 'BusLoggingRule', {
      eventBus: bus,
      eventPattern: {
        source: [{ 'prefix': ''}] as any[] // Match all
      },
      targets: [new LogGroupTarget(busLogGroup)]
    })
    this.bus = bus
  }

  /**
   * Create a forwarding rule to forward events to a local bus in a different account
   * and ensure the global bus has permissions to receive events from such accounts.
   * 
   * @param id 
   * @param localBus 
   */
  addLocalBusTarget(id: string, localBus: events.EventBus) {
    this.localBusAccounts.push(localBus.env.account)
    const rule = new events.Rule(this, id, {
      eventBus: this.bus,
      ruleName: id,
      eventPattern: {
        account: [{ 'anything-but': localBus.env.account }] as any[]
      }
    })
    rule.addTarget(new EventBusTarget(localBus))
  }
}
