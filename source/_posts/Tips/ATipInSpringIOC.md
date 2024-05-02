---
title: A tip in Spring IOC
date: 2024-05-02 14:35:53
tags: Tips
categories: Coding Tips
---

These days, I'm learning how Apache Kafka is used in Springboot. And I found an interesting tip in Springboot ioc.

<!--more-->

Before, I injected the bean into another bean like this:

```java
@Service
public class KafkaProducer {
    
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    public KafkaProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
}
```

Or like this:

```java
@Service
public class KafkaProducer {
    
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;
}
```

But, when I learned with this tutorial, the author inject the `kafkaTemplate` like this:

```java
@Service
public class KafkaProducer {
    
    private KafkaTemplate<String, String> kafkaTemplate;

    public KafkaProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
}
```

In other words, this way of injecting without `@Autowired`, made me feel amazed.

He said Spring framework will automatically inject this dependency(`kafkaTemplate`) whenever this bean(`KafkaProducer`) has only one parameterized constructor. I think is a useful and elegant way.