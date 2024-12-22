---
type: changelog
---
## 2024-12-20

[link](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-12-20)

**Added support for index name reuse**

Vectorize now supports the reuse of index names within the account. An index can be created using the same name as an index that is in a deleted state.

## 2024-12-19

 [link](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-12-19)

**Added support for range queries in metadata filters**

Vectorize now supports `$lt`, `$lte`, `$gt`, and `$gte` clauses in [metadata filters](https://developers.cloudflare.com/vectorize/reference/metadata-filtering/).

## 2024-11-13

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-11-13)

**Added support for $in and $nin metadata filters**

Vectorize now supports `$in` and `$nin` clauses in [metadata filters](https://developers.cloudflare.com/vectorize/reference/metadata-filtering/).

## 2024-10-28

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-10-28)

**Improved query latency through REST API**

Vectorize now has a significantly improved query latency through REST API:

- [Query vectors](https://developers.cloudflare.com/api/resources/vectorize/subresources/indexes/methods/query/).
- [Get vector by identifier](https://developers.cloudflare.com/api/resources/vectorize/subresources/indexes/methods/get_by_ids/).

## 2024-10-24

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-10-24)

**Vectorize increased limits**

Developers with a Workers Paid plan can:

- Create 50,000 indexes per account, up from the previous 100 limit.
- Create 50,000 namespaces per index, up from the previous 100 limt. This applies to both existing and newly created indexes.

Refer to [Limits](https://developers.cloudflare.com/vectorize/platform/limits/) to learn about Vectorize's limits.

## 2024-09-26

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-09-26)

**Vectorize GA**

Vectorize is now generally available

## 2024-09-16

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-09-16)

**Vectorize is available on Workers Free plan**

Developers with a Workers Free plan can:

- Query up to 30 million queried vector dimensions / month per account.
- Store up to 5 million stored vector dimensions per account.

## 2024-08-14

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-08-14)

**Vectorize v1 is deprecated**

With the new Vectorize storage engine, which supports substantially larger indexes (up to 5 million vector dimensions) and reduced query latencies, we are deprecating the original "legacy" (v1) storage subsystem.

To continue interacting with legacy (v1) indexes in [wrangler versions after `3.71.0`](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler%403.71.0), pass the `--deprecated-v1` flag.

For example: 'wrangler vectorize --deprecated-v1' flag to `create`, `get`, `list`, `delete` and `insert` vectors into legacy Vectorize v1 indexes. There is no currently no ability to migrate existing indexes from v1 to v2. Existing Workers querying or clients to use the REST API against legacy Vectorize indexes will continue to function.

## 2024-08-14

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-08-14)

**Vectorize v2 in public beta**

Vectorize now has a new underlying storage subsystem (Vectorize v2) that supports significantly larger indexes, improved query latency, and changes to metadata filtering.

Specifically:

- Indexes can now support up to 5 million vector dimensions each, up from 200,000 per index.
- Metadata filtering now requires explicitly defining the metadata properties that will be filtered on.
- Reduced query latency: queries will now return faster and with lower-latency.
- You can now return [up to 100 results](https://developers.cloudflare.com/vectorize/reference/client-api/#query-vectors) (`topK`), up from the previous limit of 20.

## 2024-01-17

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2024-01-17)

**HTTP API query vectors request and response format change**

Vectorize `/query` HTTP endpoint has the following changes:

- `returnVectors` request body property is deprecated in favor of `returnValues` and `returnMetadata` properties.
- Response format has changed to the below format to match [Workers API change]:(/workers/configuration/compatibility-flags/#vectorize-query-with-metadata-optionally-returned)

```json
{
  "result": {
    "count": 1,
    "matches": [
      {
        "id": "4",
        "score": 0.789848214,
        "values": [ 75.0999984741211, 67.0999984741211, 29.899999618530273],
        "metadata": {
          "url": "/products/sku/418313",
          "streaming_platform": "netflix"
        }
      }
    ]
  },
  "errors": [],
  "messages": [],
  "success": true
}
```

## 2023-12-06

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2023-12-06)

**Metadata filtering**

Vectorize now supports [metadata filtering](https://developers.cloudflare.com/vectorize/reference/metadata-filtering) with equals (`$eq`) and not equals (`$neq`) operators. Metadata filtering limits `query()` results to only vectors that fulfill new `filter` property.

```ts
let metadataMatches = await env.YOUR_INDEX.query(queryVector,
  {
    topK: 3,
    filter: { streaming_platform: "netflix" },
    returnValues: true,
    returnMetadata: true
  })
```

Only new indexes created on or after 2023-12-06 support metadata filtering. Currently, there is no way to migrate previously created indexes to work with metadata filtering.

## 2023-11-08

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2023-11-08)

**Metadata API changes**

Vectorize now supports distinct `returnMetadata` and `returnValues` arguments when querying an index, replacing the now-deprecated `returnVectors` argument. This allows you to return metadata without needing to return the vector values, reducing the amount of unnecessary data returned from a query. Both `returnMetadata` and `returnValues` default to false.

For example, to return only the metadata from a query, set `returnMetadata: true`.

```ts
let matches = await env.YOUR_INDEX.query(queryVector, { topK: 5, returnMetadata: true })
```

New Workers projects created on or after 2023-11-08 or that [update the compatibility date](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) for an existing project will use the new return type.

## 2023-10-03

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2023-10-03)

**Increased indexes per account limits**

You can now create up to 100 Vectorize indexes per account. Read the [limits documentation](https://developers.cloudflare.com/vectorize/platform/limits/) for details on other limits, many of which will increase during the beta period.

## 2023-09-27

 [](https://developers.cloudflare.com/vectorize/platform/changelog/#2023-09-27)

**Vectorize now in public beta**

Vectorize, Cloudflare's vector database, is [now in public beta](https://blog.cloudflare.com/vectorize-vector-database-open-beta/). Vectorize allows you to store and efficiently query vector embeddings from AI/ML models from [Workers AI](https://developers.cloudflare.com/workers-ai/), OpenAI, and other embeddings providers or machine-learning workflows.

To get started with Vectorize, [see the guide](https://developers.cloudflare.com/vectorize/get-started/).