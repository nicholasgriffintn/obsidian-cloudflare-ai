---
type: changelog
---
## 2024-09-26

 [link](https://developers.cloudflare.com/workers-ai/changelog/#2024-09-26)

**Workers AI Birthday Week 2024 announcements**

- Meta Llama 3.2 1B, 3B, and 11B vision is now available on Workers AI
- `@cf/black-forest-labs/flux-1-schnell` is now available on Workers AI
- Workers AI is fast! Powered by new GPUs and optimizations, you can expect faster inference on Llama 3.1, Llama 3.2, and FLUX models.
- No more neurons. Workers AI is moving towards [unit-based pricing](https://developers.cloudflare.com/workers-ai/platform/pricing)
- Model pages get a refresh with better documentation on parameters, pricing, and model capabilities
- Closed beta for our Run Any* Model feature, [sign up here](https://forms.gle/h7FcaTF4Zo5dzNb68)
- Check out the [product announcements blog post](https://blog.cloudflare.com/workers-ai) for more information
- And the [technical blog post](https://blog.cloudflare.com/workers-ai/making-workers-ai-faster) if you want to learn about how we made Workers AI fast

## 2024-07-23

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-07-23)

**Meta Llama 3.1 now available on Workers AI**

Workers AI now suppoorts [Meta Llama 3.1](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct/).

## 2024-07-11

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-07-11)

**New community-contributed tutorial**

- Added community contributed tutorial on how to [create APIs to recommend products on e-commerce sites using Workers AI and Stripe](https://developers.cloudflare.com/developer-spotlight/tutorials/creating-a-recommendation-api/).

## 2024-06-27

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-06-27)

**Introducing embedded function calling**

- A new way to do function calling with [Embedded function calling](https://developers.cloudflare.com/workers-ai/function-calling/embedded)
- Published new [`@cloudflare/ai-utils`](https://www.npmjs.com/package/@cloudflare/ai-utils) npm package
- Open-sourced [`ai-utils on Github`](https://github.com/cloudflare/ai-utils)

## 2024-06-19

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-06-19)

**Added support for traditional function calling**

- [Function calling](https://developers.cloudflare.com/workers-ai/function-calling/) is now supported on enabled models
- Properties added on [models](https://developers.cloudflare.com/workers-ai/models/) page to show which models support function calling

## 2024-06-18

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-06-18)

**Native support for AI Gateways**

Workers AI now natively supports [AI Gateway](https://developers.cloudflare.com/ai-gateway/providers/workersai/#worker).

## 2024-06-11

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-06-11)

**Deprecation announcement for `@cf/meta/llama-2-7b-chat-int8`**

We will be deprecating `@cf/meta/llama-2-7b-chat-int8` on 2024-06-30.

Replace the model ID in your code with a new model of your choice:

- [`@cf/meta/llama-3-8b-instruct`](https://developers.cloudflare.com/workers-ai/models/llama-3-8b-instruct/) is the newest model in the Llama family (and is currently free for a limited time on Workers AI).
- [`@cf/meta/llama-3-8b-instruct-awq`](https://developers.cloudflare.com/workers-ai/models/llama-3-8b-instruct-awq/) is the new Llama 3 in a similar precision to your currently selected model. This model is also currently free for a limited time.

If you do not switch to a different model by June 30th, we will automatically start returning inference from `@cf/meta/llama-3-8b-instruct-awq`.

## 2024-05-29

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-05-29)

**Add new public LoRAs and note on LoRA routing**

- Added documentation on [new public LoRAs](https://developers.cloudflare.com/workers-ai/fine-tunes/public-loras/).
- Noted that you can now run LoRA inference with the base model rather than explicitly calling the `-lora` version

## 2024-05-17

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-05-17)

**Add OpenAI compatible API endpoints**

Added OpenAI compatible API endpoints for `/v1/chat/completions` and `/v1/embeddings`. For more details, refer to [Configurations](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/).

## 2024-04-11

 [](https://developers.cloudflare.com/workers-ai/changelog/#2024-04-11)

**Add AI native binding**

- Added new AI native binding, you can now run models with `const resp = await env.AI.run(modelName, inputs)`
- Deprecated `@cloudflare/ai` npm package. While existing solutions using the @cloudflare/ai package will continue to work, no new Workers AI features will be supported. Moving to native AI bindings is highly recommended