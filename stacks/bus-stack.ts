import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as Case from 'case'
import {
   EventBus as EventBusTarget,
   CloudWatchLogGroup as LogGroupTarget
} from 'aws-cdk-lib/aws-events-targets'
import { EventBus } from 'aws-cdk-lib/aws-events';

interface BusStackProps extends StackProps {
  applicationAccountByIdentifier: Record<string, string>
}

/**
 * Stack to create a global EventBus. All applications post cross-domain events to this bus.
 * This bus also has rules to forward global events to local buses in each application account
 * where rules can be created to handle events in each application.
 */
export class BusStack extends Stack {
  bus: events.EventBus

  constructor(scope: Construct, id: string, props: BusStackProps) {
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
        Principal: { AWS: Object.values(props?.applicationAccountByIdentifier) },
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
    
    // Create forwarding rules to forward events to a local bus in a different account
    // and ensure the global bus has permissions to receive events from such accounts.
    for (const [identifier, applicationAccount] of Object.entries(props.applicationAccountByIdentifier)) { // Set used to handle same account used by multiple services
      const normalisedIdentifier = Case.pascal(identifier)
      const localBusArn = `arn:aws:events:${this.region}:${applicationAccount}:event-bus/local-bus-${identifier}`
      const rule = new events.Rule(this, `globalTo${normalisedIdentifier}`, {
        eventBus: this.bus,
        ruleName: `globalTo${normalisedIdentifier}`,
        eventPattern: {
          account: [{ 'anything-but': applicationAccount }] as any[]
        }
      })
      rule.addTarget(new EventBusTarget(EventBus.fromEventBusArn(this, `localBus${normalisedIdentifier}`, localBusArn)))
    }
    this.bus = bus
  }
}
