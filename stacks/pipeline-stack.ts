import { aws_codestarconnections as codeStartConnections, pipelines, Stack, StackProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"

interface PipelineStackProps extends StackProps {
  stages: Stage[],
  accounts: Record<string, string>,
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const codeStarConnection = new codeStartConnections.CfnConnection(this, 'CodeStarConnection', {
      connectionName: 'GitHubConnection',
      providerType: 'GitHub'
    })

    const cdkContextArgs = Object.entries(props.accounts).map(([key, value]) => `-c ${key}=${value}`).join(' ')

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.connection('fourTheorem/cross-account-eventbridge', 'main', {
          connectionArn: codeStarConnection.ref,
          triggerOnPush: true
        }),
        installCommands: ['npm i -g npm@9'],
        commands: [
          'npm ci',
          'npm run build',
          `npx cdk ${cdkContextArgs} synth`,
        ],
      }),
    })
    const wave = pipeline.addWave('ApplicationWave')
    for (const stage of props.stages) {
      wave.addStage(stage)
    }
  }
}