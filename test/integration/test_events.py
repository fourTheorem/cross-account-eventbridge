import time
import json

import aws_iatk
import requests
import pytest

created_by_tag_value = "event-bridge-org-int-tests"
delivery_service_stack_name = 'DeliveryStage-DeliveryServiceStack'
order_service_stack_name = 'OrderStage-OrderServiceStack'
bus_stack_name = 'BusStage-BusStack'

region = 'eu-west-1'

@pytest.fixture(scope='module')
def iatk():
    iatk = aws_iatk.AwsIatk(profile='dev2.DevAdministratorAccess', region=region)
    remove_listeners(iatk)  # Clean up from abandoned previous runs
    yield iatk
    remove_listeners(iatk)


def test_order_delivery(iatk: aws_iatk.AwsIatk):
    """ Check whether delivery events are received when an order is created """
    # Get EventBridge resource identifiers from the Delivery Service stack
    delivery_outputs = iatk.get_stack_outputs(
        delivery_service_stack_name, 
        output_names=['localBusName', 'orderDeliveryRule', 'orderDeliveryRuleTarget']
    ).outputs

    delivery_local_bus_name = delivery_outputs['localBusName']
    order_delivery_rule = delivery_outputs['orderDeliveryRule'].split('|')[-1]
    order_delivery_rule_target = delivery_outputs['orderDeliveryRuleTarget']

    # Get resource identifiers from the Order Service stack
    order_outputs = iatk.get_stack_outputs(
        order_service_stack_name, 
        output_names=['apiEndpoint', 'localBusName', 'deliveryEventsRule', 'deliveryEventsRuleTarget']
    ).outputs

    api_endpoint = order_outputs['apiEndpoint']

    # Set up an IATK listener for EventBridge rules on the Delivery Service
    delivery_listener_id = iatk.add_listener(
        event_bus_name=delivery_local_bus_name,
        rule_name=order_delivery_rule,
        target_id=order_delivery_rule_target,
        tags={"CreatedBy": created_by_tag_value},
    ).id

    # Create an order with the Order Service
    response = requests.post(api_endpoint)
    order_id = response.json()['orderId']
    assert order_id is not None
    trace_id = response.headers['x-amzn-trace-id']

    # Check whether the delivery service received the Order.Created event
    def event_assertion(event: str):
        payload = json.loads(event)
        assert payload['detail-type'] == "Order.Created" 
        assert payload['detail']['data']['orderId'] == order_id

    assert iatk.wait_until_event_matched(delivery_listener_id, event_assertion)

    def trace_assertion(trace: aws_iatk.GetTraceTreeOutput):
        trace_tree = trace.trace_tree
        assert [[seg.origin for seg in path] for path in trace_tree.paths] == [
            ['AWS::Lambda', 'AWS::Lambda::Function', 'AWS::Events',
             'AWS::Lambda', 'AWS::Lambda::Function', 'AWS::Events',
             'AWS::Lambda', 'AWS::Lambda::Function', 'AWS::Events']
        ]
        assert trace_tree.source_trace.duration < 20

    # This sleep should not be required for retry_get_trace_tree_until but it seems to mitigate
    # https://github.com/awslabs/aws-iatk/issues/106
    time.sleep(15)

    assert iatk.retry_get_trace_tree_until(
        tracing_header=trace_id,
        assertion_fn=trace_assertion,
        timeout_seconds=60,
    )


def remove_listeners(iatk):
    """ Remove all listeners created by integration tests
    """
    iatk.remove_listeners(
        tag_filters=[
            aws_iatk.RemoveListeners_TagFilter(
                key="CreatedBy",
                values=[created_by_tag_value],
            )
        ]
    )