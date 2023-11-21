import { Construct } from 'constructs'
import { Stage, StageProps } from 'aws-cdk-lib'
import { DeliveryServiceStack } from './delivery-stack'
import { EventBus } from 'aws-cdk-lib/aws-events'
import { BaseStage, BaseStageProps } from './base-stage'

export class DeliveryStage extends BaseStage {

  constructor(scope: Construct, id: string, props: BaseStageProps) {
    super(scope, id, props)

    const deliveryServiceStack = new DeliveryServiceStack(this, 'DeliveryServiceStack', {
      ...props,
      env: {
        account: this.node.tryGetContext('delivery-service-account'),
        region: this.region
      },
      identifier: 'delivery-service',
      busAccount: props.busAccount
    })
  }
}