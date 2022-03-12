import { Construct } from 'constructs'
import { Stage, StageProps } from 'aws-cdk-lib'
import { BusStack } from './bus-stack'
import { OrderServiceStack } from './order-stack'
import { DeliveryServiceStack } from './delivery-stack'
import { EventBus } from 'aws-cdk-lib/aws-events'

export class ApplicationStage extends Stage {

  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props)

    const busAccount = this.node.tryGetContext('bus-account')
    const busStack = new BusStack(this, 'BusStack', {
      ...props,
      env: {
        account: busAccount,
        region: this.region
      }
    })

    const orderServiceStack = new OrderServiceStack(this, 'OrderServiceStack', {
      ...props,
      env: {
        account: this.node.tryGetContext('order-service-account'),
        region: this.region
      },
      busAccount
    })

    const deliveryServiceStack = new DeliveryServiceStack(this, 'DeliveryServiceStack', {
      ...props,
      env: {
        account: this.node.tryGetContext('delivery-service-account'),
        region: this.region
      },
      busAccount
    })
    busStack.addLocalBusTarget('OrderServiceBusTarget', orderServiceStack.localBus)
    busStack.addLocalBusTarget('DeliveryServiceBusTarget', deliveryServiceStack.localBus)
  }
}