import { aws_codestarconnections as codeStartConnections, pipelines, Stack, StackProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs";
import { ApplicationStage } from "./application-stage";

interface PipelineStackProps extends StackProps {
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const codeStarConnection = new codeStartConnections.CfnConnection(this, 'CodeStarConnection', {
      connectionName: 'GitHubConnection',
      providerType: 'GitHub'
    })

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.connection('fourTheorem/cross-account-eventbridge', 'pipeline', {
          connectionArn: codeStarConnection.ref
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
    });
    pipeline.addStage(new ApplicationStage(this, 'ApplicationStage', {}))
  }
}