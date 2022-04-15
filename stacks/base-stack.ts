import { Stack, StackProps } from 'aws-cdk-lib';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as events from 'aws-cdk-lib/aws-events'
import { CloudWatchLogGroup as LogGroupTarget } from 'aws-cdk-lib/aws-events-targets'
import { Construct } from 'constructs';

export interface BaseStackProps extends StackProps {
  globalBus: IEventBus
}

/**
 * Base stack class used for any application requiring a local bus
 * with logs and permissions to receive events from the global bus.
 */
export abstract class BaseStack extends Stack {
  localBus: IEventBus
  globalBus: IEventBus
  globalBusPutEventsStatement: iam.PolicyStatement

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props)

    this.globalBus = props.globalBus
    this.globalBusPutEventsStatement = new iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: [this.globalBus.eventBusArn],
    })

    const busLogGroup = new logs.LogGroup(this, 'LocalBusLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
    })

    const localBus = new events.EventBus(this, 'LocalBus', { eventBusName: 'local-bus' })
    new events.CfnEventBusPolicy(this, 'LocalBusPolicy', {
      eventBusName: localBus.eventBusName,
      statementId: 'local-bus-policy-stmt',
      statement: {
        Principal: { AWS: props.globalBus.env.account },
        Action: 'events:PutEvents',
        Resource: localBus.eventBusArn,
        Effect: 'Allow'
      }
    })

    new events.Rule(this, 'LocalLoggingRule', {
      eventBus: localBus,
      ruleName: 'local-logging',
      eventPattern: {
        source: [{ prefix: '' }] as any[] // Match all
      }
    }).addTarget(new LogGroupTarget(busLogGroup))
    this.localBus = localBus
  }
}