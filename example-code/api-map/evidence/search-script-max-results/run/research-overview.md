# AWS documentation research overview

**Query:** DynamoDB global secondary index  
**Locale:** `en_us`  
**AWS suggestions requested:** 3  
**AWS suggestions returned:** 3  
**Results included here:** 3  
**Full documents downloaded:** 0


> This file organizes AWS search metadata. It is not an AI-generated synthesis. Full retrieved source text is in `research-bundle.md`.

## Ranked documentation

### 1. Using Global Secondary Indexes in DynamoDB - Amazon DynamoDB

- **AWS endpoint rank:** 1
- **Product:** Amazon DynamoDB
- **Guide:** Developer Guide
- **Source:** [https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)

**Summary:** Use global secondary indexes to perform alternate queries from the base DynamoDB table to model your application's various access patterns.

**Matched excerpt:** DynamoDB automatically synchronizes each global secondary index with its base table. When an application writes or deletes items in a table, any global secondary indexes on that table are updated asynchronously, using an eventually consistent model. Applications never write directly to an index. However, it is important that you understand the implications of how DynamoDB maintains these indexes.


### 2. Managing Global Secondary Indexes in DynamoDB - Amazon DynamoDB

- **AWS endpoint rank:** 2
- **Product:** Amazon DynamoDB
- **Guide:** Developer Guide
- **Source:** [https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html)

**Summary:** Create, modify, and delete global secondary indexes online in Amazon DynamoDB.

**Matched excerpt:** For more information about CloudWatch metrics related to DynamoDB, see DynamoDB metrics.


### 3. Overloading Global Secondary Indexes in DynamoDB - Amazon DynamoDB

- **AWS endpoint rank:** 3
- **Product:** Amazon DynamoDB
- **Guide:** Developer Guide
- **Source:** [https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-overloading.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-overloading.html)

**Summary:** Learn about the concept of overloading global secondary indexes (GSIs) in DynamoDB. This page explains how DynamoDB tables can hold diverse data types, and how a single GSI can be used to perform various queries, such as looking up employees by name, finding employees in a specific warehouse, and retrieving recent hires. The key point is that DynamoDB's flexible schema allows for efficient indexing and querying across a wide range of data.

**Matched excerpt:** Although Amazon DynamoDB has a default quota of 20 global secondary indexes per table, in practice, you can index across far more than 20 data fields. As opposed to a table in a relational database management system (RDBMS), in which the schema is uniform, a table in DynamoDB can hold many different kinds of data items at one time. In addition, the same attribute in different items can contain entirely different kinds of information.


## Available facets

Use these exact values in a narrower follow-up search.

| Type | Value |
|---|---|
| product | Amazon DynamoDB |
| product | Comparing the Use of Amazon DynamoDB and Apache HBase for NoSQL |
| guide | Developer Guide |
| guide | AWS Whitepaper |
