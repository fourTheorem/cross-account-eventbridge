import { Construct } from 'constructs'
import { OrderServiceStack } from './order-stack'
import { BaseStage, BaseStageProps } from './base-stage'

export class OrderStage extends BaseStage {

  constructor(scope: Construct, id: string, props: BaseStageProps) {
    super(scope, id, props)

    const orderServiceStack = new OrderServiceStack(this, 'OrderServiceStack', {
      ...props,
      env: {
        account: this.node.tryGetContext('order-service-account'),
        region: this.region
      },
      busAccount: props.busAccount,
      identifier: 'order-service'
    })
  }
}