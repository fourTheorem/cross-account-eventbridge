---
title: EventBridge as a Cross-Account Event Backbone
published: false
description: Achieving event driven architecture across applications, services and accounts in AWS
tags: aws, eventbridge, crossaccount, kafka
//cover_image: https://direct_url_to_image.jpg
---

Two of the emerging best practices in modern AWS applications are:
1. Use a separate AWS account per application
2. Decouple communication between components using events instead of point-to-point, synchronous communication.

This post will show how EventBridge can provide an ideal event backbone for applications in multiple AWS accounts, achieving both of these best practices with minimal complexity. First, let's talk about why these are regarded as best practices. We want to avoid the mistake of accepting 'best practices' without understanding the reasoning!

## Separate AWS accounts

An AWS account is the ultimate boundary for permissions and quotas. IAM is used for fine-grained access control and is one of the most impressive and fundamental AWS services there is. There is no escaping the fact that enforcement of [the principle of least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) takes a lot of time and a solid understanding. If you mix applications, environments or teams in a single AWS account, you rely on permissions boundaries, complex IAM policies and strict policy change processes to avoid impacting others' resources. This will result in a significant overhead in engineering time as well as the risk of human error. By providing each application and environment with a separate account, you can rely more on the account boundary to protect against the workloads and actions of others. You can still enforce minimal privilege but in a much more agile way, by detecting and continually improving policies instead of strict enforcement up front. For development accounts, this is a big productivity boost.

AWS quotas put limits on the number of requests you can make or resources you can utilise by default in an account. You have a mix of soft quotas, which can be raised if you ask, and hard quotas, which, more often than not, cannot budge. There may be some exceptions here if you have specific needs and engage directly with your AWS account manager. Once you mix workloads in an AWS account, those workloads share quotas. This can have the effect of limiting the scalability of each application or the more drastic result where one application can deny the other from operating because it is simply reaching a quota. Take AWS Lambda as an example. If your region has a default quota of 1,000 concurrent executions and one application reaches this, it will throttle any other workload from using Lambda. Using separate accounts removes the risk of this cross-application side-effect.

The drawback of using separate accounts for everything will come with the account management overhead. If you end up with more than a handful of accounts (100's or 1000's of accounts is not uncommon!), account automation is a must. I recommend a solution based on [org-formation](https://github.com/org-formation/org-formation-cli) for this.

## Event based communication

The case for event-based communication is less clear cut  and more a case of nuanced trade-offs. With synchronous communication, an application will send a request to a known address and wait to receive a response. The advantage as a developer or architect is that you know what service you are addressing and you can follow the flow of logic and data clearly. There are many disadvantages, however. 

Synchronous communication means you have to know the address of the application or service that is processing your request. This is called _location coupling_, and it means you have to have a mechanism to update the address in all clients if it changes. Service discovery solutions are used to solve this but not without their own complexity. With synchronous communication, you also get _temporal coupling_, since the action of making a request is bound in time to the processing of that request. Temporal coupling has a greater impact, since it results in failures when the request processor is not online, not reachable, or just busy with other requests. Temporal coupling means that the receiver must scale exactly in line with the request volume.

Asynchronous (event-driven) communication can remove these forms of coupling. Instead of sending events or requests to a known receiver, you send events to a bus, queue or topic. The receiver can scale independently and even delay processing. Message durability provided by the bus or queue can ensure that events don't get lost or undelivered, even if the event processor is temporarily offline.

That said, asynchronous communication is harder to reason about. It becomes more difficult to follow the flow of data and logic. I would say it requires a mindset change for engineers and also means you need better observability tooling to capture event flows.

While event-driven seems to be the more architecturally sound approach, there is still a case for going synchronous. We have all become used to integrating SaaS platforms using APIs and webhooks. This is essentially all synchronous communication. It has become a de-facto standard for SaaS product integration because it is easy for the consumer to understand, get started and troubleshoot. It shifts the burden to the SaaS provider who now has to ensure the API is always available, robust and scalable.

Even though I'm a big fan of event-driven, I still think there's a valid case for good, well-documented, synchronous APIs where simplicity and clarity are more important than decoupled perfection. A well-balanced enterprise architecture might combine a small number of REST APIs at high-level boundaries across distinct applications with asynchronous messages for callbacks and updates as well as lower-level, inter-service communication.

We have covered the reasons for these two underlying best practices. Let's now dive in to our cross-account event driven solution using EventBridge!

## What is an Event Backbone?

An Event Backbone is simply an event communication mechanism that serves multiple applications. The term is [commonly used](https://kgb1001001.github.io/cloudadoptionpatterns/Event-Based-Architecture/Event-Backbone/) for such systems based on Apache Kafka, since Kafka was one of the first technologies that enabled event backbones with massive scale and performance. Since Kafka was first released over a decade ago, cloud managed services have evolved to the degree where you don't need to Kafka to have a scalable, reliable event backbone. Amazon EventBridge is the most obvious example, since it has managed to pull off the amazing feat of having a large feature set and massive scalability while remaining one of the simplest cloud services there is.

If you are a Kafka fan, there is effort being put in by AWS in reducing the complexity with the managed MSK service and a generally available 'serverless' version in the works too. I would compare MSK to EventBridge in the same way I would compare EKS to Fargate or Lambda. You get a lot more control and configurability but even with the AWS managed service, you still have plenty of complexity.

The beauty of something like EventBridge is that the investment is so low. If your needs evolve, you can adapt and use alternative options for specific cases. You are not stuck with it because of a large investment in infrastructure or training. Need durability? Add SQS! Need low-latency, ordered streams? Add Kinesis! It's possible to build a event backbone on Kinesis or SNS/SQS but EventBridge is still the best place to start, integrates with more services and has really good cross-account support.

## Cross-account EventBridge

We already mentioned that EventBridge has good support for cross-account scenarios. With EventBridge, you can create a Rule with any other EventBridge _bus_ as a target. This bus can be in a different account.

![Cross account EventBridge](./cross-account-eb.png)

For this to work, the target bus must have a policy that allows the source account to send events to it.

Now, let's imagine this idea at a larger scale, where we have multiple accounts, each with their own applications or services. Where does each application need to send events? There are a few options here but this post focuses on my personally preferred one. If you want to know all the options, take a look at [this great talk from re:Invent 2020 on Building event-driven architectures](https://youtu.be/Wk0FoXTUEjo).

The preferred approach here is what that talk refers to as the "single-bus*, multi account-pattern". There are are in fact multiple buses, but a central bus in a dedicated account is used to route messages to multiple accounts, each with their own local bus.

- Every service send events to a global bus, a dedicated bus in a separate account
- Every service receives events from a local bus in its own account
- The global bus has rules to route all events to every local bus except the local bus of the event sender

You might ask why services can't send events to their local bus instead of the global bus. Apart from adding an additional layer, it's simply not possible with EventBridge.  You cannot have events transitively routed to a third bus (`local -> global -> local`). Only one cross-account target is allowed in the chain (`global -> local`)

## Cross-account EventBridge backbone example

Let's start with an example using an eCommerce use case. Our application has two services - the Order Service and the Delivery Service. There is a logical link between orders and the delivery of products being fulfilled, but these are regarded as separate services that should not be tightly coupled.

- When orders are created, we want the delivery service to be notified.
- When deliveries are sent, we want to update orders accordingly.

We have two services and three accounts:
1. The Order Service account, which has the order service logic and its own "local" EventBridge bus
2. The Delivery Service account, which has the delivery service logic and also has its own "local" EventBridge bus
3. The Global Bus account, which only has a "global" EventBridge bus. This is used to route messages to other accounts.

The flow of events for the order creation use case is as follows.

1. An HTTP POST API is used to create an order. The backing Lambda function generates an order ID and sends an `Order.Created` event to the global bus.
2. The delivery service picks up the `Order.Created` event from its local bus, processes the order , and sends a `Delivery.Updated` event including all the important delivery details to the global bus.
3. The order service picks up the `Delivery.Updated` event from its local bus, and finally sends an `Order.Updated` event to the global bus.

![Distributing cross-account events using a Global Bus](../local-global-eventbridge.png)

> **Example Source**
>  The full source code with documentation for this is available on [github.com/fourTheorem/cross-account-eventbridge](https://github.com/fourTheorem/cross-account-eventbridge/). It include a CDK pipeline for deployment of all resource to the three accounts.

## Global bus event rules

Events cannot be sent anywhere in EventBridge without a rule. Rules can be based on a schedule or an event pattern. For our backbone, we need to create routing rules in the global bus. We create a single rule for each service account:

```yaml
eventPattern:
  account:
    - 'anything-but': 12345789012
```

This rule will route all events to every service account except the one that sent the message.

## Logging events for debugging and auditing

One of the challenges people encounter with EventBridge when using it for the first time relates to observability. It can be difficult to understand which events are flowing through a bus and see their contents so that you can troubleshoot delivery failures. A simple way to address this is to create a rule to capture and log all events to CloudWatch Logs. How do you capture all events? EventBridge rules require you to have at least one condition in your filter, but a prefix match expression with an empty string will capture all events from any source:

```yaml
eventPattern:
  source:
    - prefix: ''
```

## Further reading and viewing

We have covered the fundamental building blocks for a cross-account backbone with EventBridge. There is plenty more you can do with EventBridge, like using archives and event replaying, as well as integrating it into other AWS services. For a small amount of upfront effort and minimal ongoing maintenance, you can achieve a very flexible and scalable event bus for many applications across accounts.

If you want to read more on EventBridge, [Luciano Mammino](https://twitter.com/loige) and I have written an article and have a YouTube video and podcast episode to accompany it:
1. [fourTheorem Blog: What can you do with EventBridge]( https://www.fourtheorem.com/blog/what-can-you-do-with-eventbridge)
2. [AWS Bites 23. What’s the big deal with EventBridge? - YouTube](https://youtu.be/UjIE5qp-v8w)

We also have a full series of podcast episodes covering all the main AWS event services, including a deep dive on Kafka, so check out the playlist [here](https://www.youtube.com/watch?v=CG7uhkKftoY&list=PLAWXFhe0N1vLHkGO1ZIWW_SZpturHBiE_).

---
About the author:....