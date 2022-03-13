#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { PipelineStack } from '../stacks/pipeline-stack'
import { BusStage } from '../stacks/bus-stage'
import { OrderStage } from '../stacks/order-stage'
import { DeliveryStage } from '../stacks/delivery-stage'

const app = new cdk.App()

const cicdAccount = app.node.tryGetContext('cicd-account')
const busAccount = app.node.tryGetContext('bus-account')
const orderAccount = app.node.tryGetContext('order-service-account')
const deliveryAccount = app.node.tryGetContext('delivery-service-account')

const busStage = new BusStage(app, 'BusStage', {
  applicationAccounts: [orderAccount, deliveryAccount]
})

const orderStage = new OrderStage(app, 'OrderStage', {
  env: {
    account: orderAccount,
    region: app.region
  },
  busAccount,
})

const deliveryStage = new DeliveryStage(app, 'DeliveryStage', {
  env: {
    account: deliveryAccount,
    region: app.region
  },
  busAccount,
})

const pipelineStack = new PipelineStack(app, 'PipelineStack', {
  env: {
    account: app.node.tryGetContext(`cicd-account`),
    region: app.region
  },
  stages: [
    busStage,
    orderStage,
    deliveryStage,
  ],
  accounts: {
    'cicd-account': cicdAccount,
    'bus-account': busAccount,
    'order-service-account': orderAccount,
    'delivery-service-account': deliveryAccount,
  }
})
