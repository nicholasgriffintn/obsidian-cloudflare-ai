---
type: changelog
---
## 2024-12-13

 [link](https://developers.cloudflare.com/ai-gateway/changelog/#2024-12-13)

**Bug Fixes**

- **Bug Fixes**: Fixed Anthropic errors being cached.
- **Bug Fixes**: Fixed `env.AI.run()` requests using authenticated gateways returning authentication error.

## 2024-11-28

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-11-28)

**OpenRouter**

- **Configuration**: Added [OpenRouter](https://developers.cloudflare.com/ai-gateway/providers/openrouter/) as a new provider.

## 2024-11-19

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-11-19)

**WebSockets API**

- **Configuration**: Added [WebSockets API](https://developers.cloudflare.com/ai-gateway/configuration/websockets-api/) which provides a single persistent connection, enabling continuous communication.

## 2024-11-19

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-11-19)

**Authentication**

- **Configuration**: Added [Authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/) which adds security by requiring a valid authorization token for each request.

## 2024-10-28

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-10-28)

**Grok**

- **Providers**: Added [Grok](https://developers.cloudflare.com/ai-gateway/providers/grok/) as a new provider.

## 2024-10-17

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-10-17)

**Vercel SDK**

Added [Vercel AI SDK](https://sdk.vercel.ai/). The SDK supports many different AI providers, tools for streaming completions, and more.

## 2024-09-26

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-09-26)

**Persistent logs**

- **Logs**: AI Gateway now has [logs that persist](https://developers.cloudflare.com/ai-gateway/observability/logging/index), giving you the flexibility to store them for your preferred duration.

## 2024-09-26

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-09-26)

**Logpush**

- **Logs**: Securely export logs to an external storage location using [Logpush](https://developers.cloudflare.com/ai-gateway/observability/logging/logpush).

## 2024-09-26

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-09-26)

**Pricing**

- **Pricing**: Added [pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/) for storing logs persistently.

## 2024-09-26

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-09-26)

**Evaluations**

- **Configurations**: Use AI Gateway’s [Evaluations](https://developers.cloudflare.com/ai-gateway/evaluations) to make informed decisions on how to optimize your AI application.

## 2024-09-10

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-09-10)

**Custom costs**

- **Configuration**: AI Gateway now allows you to set custom costs at the request level [custom costs](https://developers.cloudflare.com/ai-gateway/configuration/custom-costs/) to requests, accurately reflect your unique pricing, overriding the default or public model costs.

## 2024-08-02

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-08-02)

**Mistral AI**

- **Providers**: Added [Mistral AI](https://developers.cloudflare.com/ai-gateway/providers/mistral/) as a new provider.

## 2024-07-23

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-07-23)

**Google AI Studio**

- **Providers**: Added [Google AI Studio](https://developers.cloudflare.com/ai-gateway/providers/google-ai-studio/) as a new provider.

## 2024-07-10

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-07-10)

**Custom metadata**

AI Gateway now supports adding [custom metadata](https://developers.cloudflare.com/ai-gateway/configuration/custom-metadata/) to requests, improving tracking and analysis of incoming requests.

## 2024-07-09

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-07-09)

**Logs**

[Logs](https://developers.cloudflare.com/ai-gateway/observability/analytics/#logging) are now available for the last 24 hours.

## 2024-06-24

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-06-24)

**Custom cache key headers**

AI Gateway now supports [custom cache key headers](https://developers.cloudflare.com/ai-gateway/configuration/caching/#custom-cache-key-cf-aig-cache-key).

## 2024-06-18

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-06-18)

**Access an AI Gateway through a Worker**

Workers AI now natively supports [AI Gateway](https://developers.cloudflare.com/ai-gateway/providers/workersai/#worker).

## 2024-05-22

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-05-22)

**AI Gateway is now GA**

AI Gateway is moving from beta to GA.

## 2024-05-16

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-05-16)

- **Providers**: Added [Cohere](https://developers.cloudflare.com/ai-gateway/providers/cohere/) and [Groq](https://developers.cloudflare.com/ai-gateway/providers/groq/) as new providers.

## 2024-05-09

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-05-09)

- Added new endpoints to the [REST API](https://developers.cloudflare.com/api/resources/ai_gateway/methods/create/).

## 2024-03-26

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2024-03-26)

- [LLM Side Channel vulnerability fixed](https://blog.cloudflare.com/ai-side-channel-attack-mitigated)
- **Providers**: Added Anthropic, Google Vertex, Perplexity as providers.

## 2023-10-26

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2023-10-26)

- **Real-time Logs**: Logs are now real-time, showing logs for the last hour. If you have a need for persistent logs, please let the team know on Discord. We are building out a persistent logs feature for those who want to store their logs for longer.
- **Providers**: Azure OpenAI is now supported as a provider!
- **Docs**: Added Azure OpenAI example.
- **Bug Fixes**: Errors with costs and tokens should be fixed.

## 2023-10-09

 [](https://developers.cloudflare.com/ai-gateway/changelog/#2023-10-09)

- **Logs**: Logs will now be limited to the last 24h. If you have a use case that requires more logging, please reach out to the team on Discord.
- **Dashboard**: Logs now refresh automatically.
- **Docs**: Fixed Workers AI example in docs and dash.
- **Caching**: Embedding requests are now cacheable. Rate limit will not apply for cached requests.
- **Bug Fixes**: Identical requests to different providers are not wrongly served from cache anymore. Streaming now works as expected, including for the Universal endpoint.
- **Known Issues**: There's currently a bug with costs that we are investigating.