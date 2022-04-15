#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BusStack } from '../stacks/bus-stack';
import { OrderServiceStack } from '../stacks/order-stack';
import { DeliveryServiceStack } from '../stacks/delivery-stack';

const app = new cdk.App();
const busStack = new BusStack(app, `BusStack`, {
  env: {
    account: app.node.tryGetContext(`bus-account`),
    region: app.region
  },
})
const globalBus = busStack.bus

const orderServiceStack = new OrderServiceStack(app, 'OrderServiceStack', {
  env: {
    account: app.node.tryGetContext(`order-service-account`),
    region: app.region
  },
  globalBus
})

const deliveryServiceStack = new DeliveryServiceStack(app, 'DeliveryServiceStack', {
  env: {
    account: app.node.tryGetContext(`delivery-service-account`),
    region: app.region
  },
  globalBus
})

busStack.addLocalBusTarget('OrderServiceBusTarget', orderServiceStack.localBus)
busStack.addLocalBusTarget('DeliveryServiceBusTarget', deliveryServiceStack.localBus)