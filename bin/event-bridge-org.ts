#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { PipelineStack } from '../stacks/pipeline-stack'
import { ApplicationStage } from '../stacks/application-stage'

const app = new cdk.App()
const applicationStage = new ApplicationStage(app, 'ApplicationStage', {})

const pipelineStack = new PipelineStack(app, 'PipelineStack', {
  env: {
    account: app.node.tryGetContext(`cicd-account`),
    region: app.region
  },
  applicationStage
})
