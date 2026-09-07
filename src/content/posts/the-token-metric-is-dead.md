---
author: Uthynauta
pubDatetime: 2026-09-05T18:45:00-06:00
title: The Token Metric Is Dead
slug: the-token-metric-is-dead
featured: true
draft: false
language: en
translationKey: token-metric-is-dead
tags:
  - llm
  - inference
  - reasoning
  - ai-engineering
description: Tokens are still useful for billing and I/O. But as reasoning moves behind opaque summaries — and increasingly into latent computation — they may be becoming a terrible proxy for how much work a model actually did.
---

# The Token Metric Is Dead

I have been watching how we estimate the work done by LLMs, and I keep coming back to the same idea: the token metric can be misleading. It may never have been a real engineering unit that could survive big changes in model design.

The metric works only if one thing stays mostly true: a large part of the model's computation has to show up as a sequence of tokens.

That made sense when autoregressive models were basically text generators. Their main job was to predict the next token, then the next one, and then the next one again.

As long as computation and token generation moved together, counting tokens was a reasonable way to estimate how much work the model did.

But reasoning models made that relationship harder to trust.

## When more tokens stopped meaning better reasoning

We started seeing this problem almost as soon as "reasoning" became part of the model conversation.

One thing became clear very quickly: the number of tokens generated during reasoning does not always tell us how good the reasoning process was. It does not always explain how the model moved from the _input tokens_ to the [_output tokens_](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count).

In practice, many people who use _frontier_ models now avoid the highest reasoning-effort settings unless the task really needs them.

More visible reasoning, or [_reasoning tokens_](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count), does not always mean a better answer.

Depending on the model and the task, raising the effort too much can add [latency, cost](https://platform.claude.com/docs/en/build-with-claude/extended-thinking), repeated checks, and extra noise without giving a matching improvement in quality.

You still have to test this case by case. But for most uses, a safer rule is simple: start with a moderate effort level, and increase it only when the task is complex enough to justify it.

The problem is that even this link between reasoning and tokens is becoming harder to observe.

## The reasoning we stopped seeing

The main _frontier_ model providers have stopped showing the raw, literal [_chain of thought_](https://openai.com/index/learning-to-reason-with-llms/) (CoT) of their models.

What the user or developer gets is more often a partial, [summarized](https://openai.com/index/new-tools-and-features-in-the-responses-api/), or even [encrypted](https://ai.google.dev/gemini-api/docs/thought-signatures) version of the model's internal reasoning.

The labs have understandable reasons for this. They want to protect their methods, make model extraction or distillation harder, improve the user experience, and keep some internal safety and monitoring tools private.

But there is a more interesting engineering effect: we can no longer directly see the thing we are using as a sign of "reasoning effort".

That leads to an uncomfortable question.

What if tokens are not only hiding the reasoning from us, but also starting to hide an important part of the computation behind that reasoning?

## Thinking without words

Around the same time, a related idea started showing up in research: maybe reasoning does not have to be only a sequence of text tokens. Maybe part of the reasoning process can happen directly inside the model's internal representations.

One of the first papers that caught my attention was [**Coconut — Chain of Continuous Thought**](https://arxiv.org/abs/2412.06769).

The idea is simple and interesting.

Instead of always decoding an internal state into a word or token, the model can reuse that internal state and keep computing from there.

The model does not have to say every intermediate step in order to keep "thinking".

Coconut did not come out from thin-air.

There were already papers like [**Think Before You Speak: Training Language Models With Pause Tokens**](https://arxiv.org/abs/2310.02226), which studied what happens when a model gets extra computation time before producing the next visible token.

Then came [**Quiet-STaR**](https://arxiv.org/abs/2403.09629), which explored ways for models to learn to "think before speaking".

Later, more work appeared on [_latent thoughts_](https://arxiv.org/abs/2502.17416), [_looped transformers_](https://arxiv.org/abs/2606.31779), and [_recurrent depth_](https://arxiv.org/abs/2609.01117), where the same layers can be reused more than once.

Step by step, the idea stopped looking like a small trick. It started to look like a real research direction: useful, buildable, and plausible.

This is where the problem becomes important.

## A token was never just a piece of a word

For many people who use _frontier_ models, a token looks like a strange way to cut words and text so providers can bill us for using the model, or more exactly, for using the infrastructure behind the model.

But inside these models, something more important happens.

Each token becomes a vector representation. Layer by layer, that representation adds context through the attention mechanisms that led to the [Transformer architecture](https://arxiv.org/abs/1706.03762).

In other words, the token we send to the model ends up inside a much richer multidimensional space than the discrete vocabulary it came from.

Each position does not only carry information about the original token. It also carries information about its relationship with the rest of the context.

Once we understand this, it becomes clear why tokens were such a convenient unit for measuring and billing transformer-based models.

In a very simplified way, we could think about it like this:

**1 processed token → 1 position in the sequence → 1 equivalent unit of work**

This is not a mathematical identity. Real cost also depends on sequence length, KV-cache, architecture, hardware, and many other details. But as an engineering estimate, it worked well enough.

Until models stopped moving forward only through tokens.

## When a loop appears

The problem starts when the amount of processing between two visible tokens is no longer roughly constant.

If a model can use its internal representations directly, it can run several transformations before producing the next token.

Then we no longer have something like:

**1 visible token → 1 equivalent unit of work**

We can start having something more like:

**1 output token → N internal transformations → N extra units of compute → 1 visible token**

At that point, token count and processing cost begin to separate.

When an LLM architect chooses to run several internal steps before the next token is emitted, that token no longer gives a clear measure of how much computation happened.

I am not saying tokens were never useful as a unit of measurement. They were useful. But our beloved token is starting to show real limits.

Once we move from models whose processing, generation, and "thinking" were tightly tied to visible tokens, and we add internal _loops_, we also need to count those loops if we want to measure the real effort behind an answer.

It is like doing a multiplication by hand and then saying I solved it in one step because I only showed the final result once.

To get there, I may have multiplied digit by digit, stored intermediate results, and added them at the end.

Some people may be able to solve it mentally in one shot.

I am not one of them.

And it would be misleading to say my process took only one step just because the answer was written only one time.

## And then Astra appeared

Up to this point, this could sound like a mostly academic discussion. Models with internal-state processing could look like research experiments, not something that matters for real products.

We already had papers, experimental architectures, and several strong ideas about latent reasoning.

But in the days before GPT-6 Astra was launched, reports started pointing in this same direction.

[_The Information_](https://www.theinformation.com/articles/secret-technique-behind-openais-astra-model-sparks-security-concerns), citing a person familiar with the model's development, reported that Astra uses a technique called _recurrent depth_ or _looped transformer_. The idea is that some representations can be processed several times before the model produces visible output.

The report added another important detail: OpenAI had allegedly limited the use of this technique on purpose, so the model would still keep enough readable _chain of thought_ for monitoring. According to the report, at least some part of Astra's reasoning would happen in the internal representation space before producing a token, or before putting the reasoning into words. That internal reasoning would need to be controlled so monitoring could still stay useful.

[Other outlets](https://www.theverge.com/ai-artificial-intelligence/988334/openai-astra-ai-monitoring-safety) later covered the report and the discussion about what _recurrent depth_ could mean for reasoning observability.

Does this mean we know Astra uses _recurrent depth_ heavily? No. OpenAI has not confirmed it, and it has not denied it either. As far as the public knows, OpenAI has not published enough architectural detail to verify this claim independently. But it is still relevant to this argument.

So let us return to the main point.

The scientific literature already shows that internal compute can be separated from the number of visible tokens.

Experimental implementations exist.

Research on _looped transformers_ and _recurrent depth_ exists.

And now we also have reports that connect this kind of architecture to one of the newest _frontier_ models, and to a model with strong benchmark results.

We still do not know how all these pieces connect.

But I think it is reasonable to start asking the question.

Maybe we are not only seeing models that learned to think with fewer tokens.

**Maybe we are starting to see models that can hide more of the compute they use.**

## So what are we measuring in benchmarks?

This is where the issue becomes practical.

We get impressed when a model solves a benchmark with a certain number of _output tokens_. And OpenAI was very specific about reporting [_output tokens_](https://openai.com/index/path-to-astra/)
.
Benchmarks help us compare models under known conditions. We compare models. We compare costs. We compare token counts.

We even build curves that try to show how much "reasoning" is needed to reach a certain performance level. And we often connect the number of tokens with model capability. For many people, it also gives a rough estimate of the bill they will pay for a task.

But we rarely ask whether the model had to run extra internal steps before writing each token.

If a model can run one, two, five, or N internal iterations between two visible tokens, then comparing only token counts stops being a comparison of equal things.

A model that writes 500 tokens after 500 hypothetical units of work did not necessarily do the same work as another model that writes 500 tokens after thousands of internal transformations.

Both wrote 500 tokens. That does not mean both used the same amount of compute.

There is another interesting hint here.

A preprint published in July 2026, [**Not All LLM Reasoning is Visible in the Chain-of-Thought**](https://arxiv.org/abs/2607.22925), studied 13 _frontier_ models with synthetic tasks. It found that several models could benefit from filler tokens with no useful meaning, with performance gains of up to 13 percentage points in some experiments.

This result does not prove that Astra uses _recurrent depth_. It also does not prove which internal mechanism caused the effect. But my argument does not need to go that far.

The interesting point is simpler:

there is experimental evidence suggesting that the number and meaning of the tokens we can see do not always describe all the useful computation the model performs before answering.

If we accept even that possibility, counting tokens and measuring reasoning become two different things.

## The problem does not end with benchmarks

So far, I have mainly talked about the technical side.

But there is another problem.

Someone has to pay for all that compute.

In 2025, researchers from the University of Maryland published a preprint called [**CoIn — Counting the Invisible Reasoning Tokens in Commercial Opaque LLM APIs**](https://arxiv.org/abs/2505.13778).

The paper starts from a strange situation that already exists in commercial APIs for reasoning models:

we can be billed for [reasoning tokens whose content we cannot observe](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count).

The authors take that concern further: if the customer cannot see those tokens, the customer also cannot independently check that the provider's reported count matches what really happened.

They also describe the idea of _token count inflation_ and propose a way to audit the amount and semantic value of hidden tokens.

CoIn is a preprint. We should not present it as settled academic consensus.

But it matters for a different reason:

someone already thought the opacity of billed _reasoning tokens_ in commercial APIs was important enough to build a technical audit method for it.

So we end up with two different problems that start to meet.

On one side, we can have:

**reasoning tokens that we pay for but cannot see.**

On the other side, we can have:

**compute or reasoning that happens, but whose size is not well represented by the number of tokens we see.**

In both cases, the same question appears:

**what the hell are we measuring when we say a model used X tokens to solve a task?**

## The token is not dead. The metric is.

The token is obviously not dead. It is still a very useful unit for representing inputs and outputs. It is also a necessary step toward the beautiful embedding, or vector representation in latent space.

Tokens are still basic for understanding context windows.

They still affect memory, KV-cache, throughput, and many other parts of inference systems.

And we will probably keep paying APIs with some version of this unit for a long time.

What I think is dying is something else:

**the idea that the number of tokens, by itself, is a good enough proxy for how much work a model did.**

That difference matters.

We use this metric to compare models. To compare benchmarks. To calculate costs. To design systems. To choose which model should handle a task. To build _routing_ strategies.

And finally, to answer a simple-sounding question:

how much compute do I need to solve this problem?

## A measurement problem

In metrology, when the variable we use to estimate something no longer tracks the thing we actually want to measure, we have to rethink that variable.

That does not mean the former value was useless.

It also does not mean it never worked well enough.

It means the system changed.

We cannot keep measuring in the same way when models can use internal _loops_, retries, extra steps, or any other compute that does not show up directly in the variable we are counting.

The friction now is that users, labs, researchers, companies, CTOs/CFOs, and almost everyone in the AI ecosystem are used to tokens.

We have built intuition around them.

It is like switching from marks or pesetas to euros.

Or like estimating the grocery bill in your head before reaching the checkout.

We roughly know what "100 thousand tokens" means. We roughly know what a large context might cost. We roughly know how much a certain task should use.

The token became an intuitive unit. Giving up an intuitive unit is always uncomfortable.

But if we want to measure the thing we call "reasoning effort" more honestly, we may need other measures.

Because, to be honest, _frontier_ labs are not going to give us GPU time or electricity for free.

Compute can disappear from our view. It cannot disappear from the hardware.

It may help make a benchmark look better, but in production that compute still exists somewhere.

It shows up as accelerator usage, latency, energy use, and infrastructure.

Sooner or later, that cost reaches API bills and then the products we all use.

So maybe we should agree on what we are measuring before we get used to paying opaquely for "reasoning tokens" we cannot even see.

For a while, counting tokens and measuring compute were close enough that we could treat them almost as the same thing.

Maybe they are not close enough anymore.

And if real compute starts hiding between tokens, counting only the tokens will not pay for the energy or infrastructure needed to produce them.
