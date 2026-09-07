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

I have been following the evolution of how we estimate the work performed by an LLM for a while, and it is becoming increasingly clear to me that the token metric can be not only misleading, but perhaps never represented an engineering unit that could survive changes in the models themselves.

Its usefulness as a measure of the work performed by a model depends, to a large extent, on a property we are starting to leave behind: an important part of the model's computational process is supposed to be manifested through the sequential generation and processing of tokens.

The token may have been a particularly useful metric when autoregressive models were, in essence, text generation machines. Models whose fundamental operation consisted of iteratively predicting the next token.

As long as computational work and progress through a sequence of tokens remained tightly related, counting tokens was a reasonable approximation of the work performed.

But that relationship began to get complicated with the arrival of reasoning models.

## When more tokens stopped meaning better reasoning

We started seeing problems in how computational effort is counted almost from the very moment the concept of "reasoning" appeared on the board.

Something quickly became clear: the number of tokens generated during a reasoning process does not necessarily reflect the quality of the process that takes us from the *input tokens* to the [*output tokens*](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count).

In fact, among those of us who regularly use *frontier* models, it has almost become a rule of thumb to avoid maximum reasoning-effort levels unless the task truly justifies them.

More explicit reasoning, or [_reasoning tokens_](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count), does not necessarily imply a better answer.

Depending on the model and the task, indiscriminately increasing effort can add [latency, cost](https://platform.claude.com/docs/en/build-with-claude/extended-thinking), redundancy, and over-verification without producing an equivalent improvement in response quality.

This has to be evaluated case by case, but a good rule of thumb is still to use more conservative effort levels for most use cases and increase them when the complexity of the task truly justifies it.

The problem is that even that relationship between reasoning and tokens has become increasingly difficult to observe.

## The reasoning we stopped seeing

The main providers of *frontier* models have gradually stopped exposing the raw or literal copy of their models' [*chain of thought*](https://openai.com/index/learning-to-reason-with-llms/) (CoT).

What the user or developer receives is increasingly a partial, [summarized](https://openai.com/index/new-tools-and-features-in-the-responses-api/), or even [encrypted](https://ai.google.dev/gemini-api/docs/thought-signatures) representation of internal reasoning.

The reasons offered by the labs that provide LLM models are understandable and, in many cases, defensible. Among them are protecting competitive advantages, making extraction or distillation harder, improving the user experience, and preserving internal monitoring and safety mechanisms.

But there is a consequence that seems much more interesting to me from an engineering point of view. We lose the ability to directly observe the thing we are using to represent "reasoning effort."

And then an uncomfortable question appears.

What if, in addition to no longer showing reasoning, tokens were starting to stop representing an important part of the computation that happens during that reasoning?

## Thinking without words

In a curiously parallel way, a trend began to appear in the scientific literature: extending the reasoning process beyond a sequence of tokens that "represents" the model's path of thought and allowing part of the process to happen directly on its internal representations.

One of the works that first caught my attention was [**Coconut — Chain of Continuous Thought**](https://arxiv.org/abs/2412.06769).

The idea is particularly interesting.

Instead of necessarily decoding an internal state of the model to immediately convert it into a word or token, that state can be reused to continue the computational process.

The model no longer needs to verbalize every intermediate step in order to keep "thinking."

Coconut, of course, did not come out of nowhere.

There were already works such as [**Think Before You Speak: Training Language Models With Pause Tokens**](https://arxiv.org/abs/2310.02226), which explored what happens if we allow the model to perform additional computation before producing the next observable token.

Then came [**Quiet-STaR**](https://arxiv.org/abs/2403.09629), exploring mechanisms through which models could learn to "think before speaking."

And later, works appeared on [*latent thoughts*](https://arxiv.org/abs/2502.17416), [*looped transformers*](https://arxiv.org/abs/2606.31779), and [*recurrent depth*](https://arxiv.org/abs/2609.01117), where the same layers can be reused iteratively.

Little by little, the idea stopped looking merely novel and became a formal branch of academic research. So the idea began to look useful, implementable, and plausible.

And here is where the problem that interests me appears.

## A token was never just a piece of a word

For many regular users of *frontier* models, the token looks like a convoluted way of splitting words and text so we can be billed for use of the model, or rather, for the infrastructure needed to operate the model as a service.

But inside the architecture of these models, something much more interesting happens.

Each token is transformed into a vector representation that, layer after layer, incorporates contextual information through the attention mechanisms that gave rise to the [Transformer architecture](https://arxiv.org/abs/1706.03762).

That is, the token we feed into the model ends up represented inside a multidimensional space far richer than the discrete vocabulary it came from.

There, each position contains information not only about what it originally represents, but also about the relationships it maintains with the rest of the context.

Once we understand this, we also understand why the token had until now been such a convenient unit for measuring and billing the use of transformer-based models.

In an extremely simplified way, we could imagine something like this:

**1 processed token → 1 position in the sequence → 1 equivalent unit of work**

It is not a mathematical equivalence, and the real cost depends, among other things, on sequence length, KV-cache, architecture, and hardware. But as an engineering approximation, it worked quite well.

Until we stopped advancing only through tokens.

## When a loop appears

The problem begins when the amount of processing that happens between two observable tokens stops being approximately constant.

If we take advantage of the model's internal representations, we can perform multiple transformations before producing the next token.

Then we stop having something conceptually similar to:

**1 observable token → 1 equivalent unit of work**

and we can start having:

**1 output token → N internal transformations → N additional units of compute → 1 observable token**

The number of tokens and the amount of processing then begin to decouple.

When an LLM architect decides to perform multiple steps on internal representations before emitting the next token, that token stops faithfully representing the amount of computational work we intended to approximate with it.

I am not saying the token was never useful as a unit of measurement. But it is clear that our beloved token, which had been used so widely, is starting to show disadvantages.

Once we move from models whose processing, generation, and "thinking" were tightly bound to an observable sequence of tokens, and add internal *loops*, we also need to count those cycles if we truly want to measure the amount of computational effort needed to reach a result.

It is like doing multiplication by hand and then saying I solved it in one step because I only wrote the final result once.

To get there, I may have had to perform several digit-by-digit multiplications, store intermediate results, and then add them up.

I do not doubt there are people capable of solving it mentally in one shot.

I am not one of them.

And it would be misleading to claim that my process required a single step simply because I only made the result visible.

## And then Astra appeared

Up to this point, we could consider all this a fundamentally academic discussion. And we could say that models with internal-state processing existed exclusively in the scientific literature as exercises in innovation.

We already have papers, experimental architectures, and some particularly interesting ideas about latent reasoning.

However, in the days before the launch of GPT-6 Astra, reports began to appear pointing precisely in this direction.

[*The Information*](https://www.theinformation.com/articles/secret-technique-behind-openais-astra-model-sparks-security-concerns), citing a person with knowledge of the model's development, reported that Astra uses a technique known as *recurrent depth* or *looped transformer*, which allows certain representations to be processed repeatedly before producing the observable output.

The report added something even more interesting: OpenAI had allegedly deliberately limited the use of this technique to preserve enough readable *chain of thought* to monitor the model's behavior. But, according to the report, at least some percentage of the reasoning performed by the model would be happening in the previously described representation space before producing a token, or before verbalizing the reasoning, and this had to be controlled to maintain some degree of reliability with respect to the real reasoning process.

[Other outlets](https://www.theverge.com/ai-artificial-intelligence/988334/openai-astra-ai-monitoring-safety) later picked up the report and the discussion about the implications of *recurrent depth* for reasoning observability.

Does this mean we know that Astra extensively uses *recurrent depth*? OpenAI has neither denied nor admitted it. As far as we publicly know, OpenAI has not published an architectural description detailed enough to independently verify this suspicion. But it is interesting for our analysis.

Let us return to the point.

The possibility of decoupling the amount of internal compute from the number of observable tokens exists in the scientific literature.

Experimental implementations exist.

Works on *looped transformers* and *recurrent depth* exist.

And now there are also reports attributing this kind of architecture to one of the most recent and best-performing *frontier* models on benchmarks.

We still do not know to what extent all these pieces are connected.

But I think it is reasonable to start asking the question.

Maybe we are not just seeing models that learned to think with fewer tokens.

**Maybe we are starting to see models capable of hiding more of the amount of compute they perform.**

## So what are we measuring in benchmarks?

This is where the discussion starts to have practical consequences.

We are impressed when a model solves a given benchmark using a certain number of *output tokens*. And OpenAI was very specific in reporting [_output tokens_](https://openai.com/index/path-to-astra/)
.
Benchmarks help us compare models under known conditions. We compare models. We compare costs. We compare token counts.

We even build curves that try to represent how much "reasoning" we need to reach a given level of performance. And we also tend to associate the number of tokens used with the model's capability, and, for many people even more interestingly, it gives us an estimate of the bill we will pay to run a task.

But we rarely ask whether the model, in order to express each of those tokens, performed more internal steps.

If between two observable tokens a model could execute one, two, five, or N internal iterations, simply comparing the number of tokens stops being a comparison of equivalent quantities.

A model that produces 500 tokens after 500 hypothetical units of computational work did not necessarily do the same work as another model that produces 500 tokens after thousands of internal transformations.

Both wrote 500 tokens. But that does not necessarily mean they used the same amount of compute to produce them.

And there is another particularly interesting hint.

A preprint published in July 2026, [**Not All LLM Reasoning is Visible in the Chain-of-Thought**](https://arxiv.org/abs/2607.22925), studied 13 *frontier* models using synthetic tasks and found that several could benefit from semantically irrelevant filler tokens, with performance improvements of up to 13 percentage points in some experiments.

The result does not prove that Astra uses *recurrent depth*. Nor does it prove what internal mechanism is responsible for the phenomenon. But for the argument I am making here, I do not even need to go that far.

The interesting part is much simpler:

there is experimental evidence suggesting that the amount and semantic content of the tokens we can observe do not necessarily describe all the useful computation that happens while the model reaches an answer.

And if we accept even that possibility, counting tokens and measuring reasoning start becoming two different things.

## The problem does not end with benchmarks

So far I have talked mainly about the problem from a technical point of view.

But there is a second problem.

Someone has to pay for all that compute.

In 2025, researchers from the University of Maryland published a preprint called [**CoIn — Counting the Invisible Reasoning Tokens in Commercial Opaque LLM APIs**](https://arxiv.org/abs/2505.13778).

The work starts from a rather peculiar situation that already exists in commercial APIs for reasoning models:

we can be billed for [reasoning tokens whose content we cannot observe](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count).

The authors take that concern to an even more uncomfortable possibility: if the client cannot observe those tokens, they also cannot independently verify that the amount reported by the provider corresponds exactly to what happened.

They even propose the concept of *token count inflation* and a mechanism for auditing the quantity and semantic validity of those hidden tokens.

CoIn is a preprint, not a publication we should present as established academic consensus.

But its existence seems relevant to me for a different reason:

someone already considered the opacity of *reasoning tokens* billed by commercial APIs interesting enough as a problem to try to build a technical auditing mechanism for it.

And so we end up with two different problems that start to converge.

On one hand, we can have:

**reasoning tokens that we pay for but cannot observe.**

And on the other, we can have:

**compute or reasoning that happens, but whose magnitude is not necessarily represented by the number of tokens we observe.**

In both cases, exactly the same question appears:

**what the hell are we measuring when we say a model used X tokens to solve a task?**

## The token is not dead. The metric is.

The token is obviously not dead. It remains an extremely useful unit for representing inputs and outputs. It is a necessary step toward the beautiful embedding, or vector representation in latent space.

It remains fundamental for understanding context windows.

It still has direct implications for memory, KV-cache, throughput, and many other properties of an inference system.

And we will probably keep paying APIs using some variant of this unit for quite some time.

What I think is dying is something else:

**the idea that the number of tokens is, by itself, a good enough proxy for how much work a model did.**

And that distinction matters.

Because we use that metric to compare models. To compare benchmarks. To calculate costs. To design systems. To decide which model should solve a given task. To build *routing* strategies.

And finally, to try to answer a seemingly simple question:

how much compute do I need to solve this problem?

## A problem of metrology

In metrology, when the variable used to approximate a phenomenon stops faithfully representing what we want to measure, we have to reconsider how we measure it.

That does not mean the previous measure was useless.

Nor does it mean it never reasonably represented what we wanted to observe.

It simply means the system changed.

We cannot keep measuring the same way processes that incorporate internal *loops*, retries, additional steps, or any other form of compute that stops showing up directly in the variable we are counting.

The friction I notice now is that users, labs, researchers, companies, CTOs/CFOs, and the whole long list of people and organizations that make up the current AI ecosystem are too used to the token.

We have developed an intuition around it.

It is similar to switching from marks or pesetas to euros.

Almost like mentally calculating how much the grocery cart will cost before getting to the checkout.

We know roughly what "100 thousand tokens" means. We know roughly how much a given context might cost. We know roughly how much a certain task should consume.

The token became an intuitive unit. And letting go of an intuitive unit always creates friction.

But if we truly want to faithfully represent that quantity we empirically call "reasoning effort," perhaps we need to start thinking about other measures.

Because, let us be honest, it is not as if *frontier* labs are going to give us GPU time or electricity for free.

Compute can disappear from our view. It cannot disappear from the hardware.

It may be useful to present a given benchmark in a favorable light, but in production that compute ends up existing somewhere.

It shows up as accelerator occupancy, latency, energy consumption, and infrastructure.

And sooner or later that cost ends up being passed on to API bills and ultimately to the products we all consume.

That is why perhaps we should agree on what we are measuring before we get used to paying opaquely for "reasoning tokens" we cannot even observe.

Because counting tokens and measuring compute were, for a while, close enough approximations that we could treat them almost as the same thing.

Maybe they no longer are.

And if real compute starts hiding between tokens, continuing to count only the tokens will not pay the energy bill or the infrastructure needed to reach them.
