import { Stage, StageProps } from 'aws-cdk-lib'
import { IEventBus } from 'aws-cdk-lib/aws-events'
import { Construct } from 'constructs'
import { BaseStack } from './base-stack'

export interface BaseStageProps extends StageProps {
  busAccount: string
}

export abstract class BaseStage extends Stage {
  stack: BaseStack

  constructor(scope: Construct, id: string, props: BaseStageProps) {
    super(scope, id, props)
  }
}