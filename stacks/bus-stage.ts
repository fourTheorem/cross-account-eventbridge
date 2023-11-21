import { Construct } from 'constructs'
import { Stage, StageProps } from 'aws-cdk-lib'
import { BusStack } from './bus-stack'

interface BusStageProps extends StageProps {
  applicationAccountByIdentifier: Record<string, string>
}

export class BusStage extends Stage {

  constructor(scope: Construct, id: string, props: BusStageProps) {
    super(scope, id, props)

    const busStack = new BusStack(this, 'BusStack', {
      ...props,
      applicationAccountByIdentifier: props.applicationAccountByIdentifier,
    })
  }
}