import { Stage, StageProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { BaseStack } from './base-stack'

export interface BaseStageProps extends StageProps {
  busAccount: string
  identifier: string
}

export abstract class BaseStage extends Stage {
  stack: BaseStack

  constructor(scope: Construct, id: string, props: BaseStageProps) {
    super(scope, id, props)
  }
}