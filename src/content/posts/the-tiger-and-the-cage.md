---
author: Uthynauta
pubDatetime: 2026-09-20T20:26:54-06:00
title: "The Tiger and the Cage: Why Alignment Must Go Beyond the Model"
slug: the-tiger-and-the-cage
draft: false
language: en
translationKey: the-tiger-and-the-cage
tags:
  - ai-engineering
  - alignment
  - agentic-ai
  - ai-safety
description: "A chain of thought is not enough to verify the alignment of an AI system. An engineering approach that brings together representations, evaluation, human authority, and containment."
---

# The Tiger and the Cage
## TL;DR

AI alignment cannot rely solely on model instructions or observing its chain of thought (CoT). As agents become more autonomous, use tools, and interact with their environment, we need to verify that they respect authority boundaries even as instructions, context, and capabilities change. This requires progress on four fronts: internal representations, behavioral evaluation, agent orchestration, and infrastructure-level containment. Teaching the tiger to respect the cage is not enough. We also need to make sure the cage holds when the tiger tries to cross its boundaries.
## Why Alignment Must Go Beyond the Model

In [*The Token Metric Is Dead*](https://uthynauta.dev/posts/the-token-metric-is-dead/), I raised a measurement problem: token counts are still useful for describing inputs, outputs, and billing, but they are no longer enough, on their own, to estimate how much compute a task required. Models may rely on internal processes and resources that do not map directly to the tokens we can see.

Now I want to explore a different consequence of that gap: **if a sequence of tokens does not necessarily capture everything a model does internally, why would we expect it to be enough to verify alignment?**

This question becomes even more important once we move from a model that answers questions to a system that uses tools, runs code, retains memory, interacts with other agents, and changes its environment. A correct final answer, or even a seemingly flawless written explanation, does not establish that every action leading up to it was acceptable.

My argument is that **alignment must become a verifiable property of the entire system, rather than something confined to its instructions or language interface**. Getting there means working on the model's representations and behavior, as well as the authorization rules and enforceable limits built into the infrastructure.

## 1. Observability Is Not Reasoning

[Chain of thought (CoT)](https://arxiv.org/abs/2201.11903) gave models a way to express intermediate steps in language and improve their performance on certain reasoning tasks. Beyond helping them solve problems, it offered an appealing possibility: we could look for signs of what a model was doing before it produced an answer.

But seeing those signs is not the same as having a complete execution trace. We need to distinguish between three things: the model's internal processing, the chain of thought it generates, and the summary or explanation shown to the user. They may be related, but they are not necessarily the same.

In [*Reasoning models don't always say what they think*](https://www.anthropic.com/research/reasoning-models-dont-say-think), Anthropic investigated whether certain models acknowledged, in their chains of thought, hints that had influenced their answers. Often, they did not. This does not show that every chain of thought is misleading, nor does it justify attributing conscious intent to a model. What it does show is that **an explanation in plain language can leave out information that was causally relevant to the answer**.

We should not confuse this lack of faithfulness with other behaviors. [Sycophancy, or excessive agreement with the user](https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models), can arise from training incentives that reward pleasing answers over correct ones. [Alignment faking](https://www.anthropic.com/research/alignment-faking), meanwhile, has been studied under specific experimental conditions. These are different phenomena; neither is established simply because an explanation omits a step in the model’s reasoning.

OpenAI has identified another problem. In [*Detecting misbehavior in frontier reasoning models*](https://openai.com/index/chain-of-thought-monitoring/), it reported that directly penalizing certain content in a model's chain of thought could make unwanted behavior harder to detect without eliminating it. This helps explain a design choice Jakub Pachocki discusses in [*An Alien Mind*](https://openai.com/index/an-alien-mind/): preserve the value of CoT as a monitoring signal, as far as possible, by avoiding direct optimization toward whatever a supervisor would read.

Pachocki also warns that our ability to rely on this signal is declining. Models operate in increasingly complex environments, mix reasoning with communication and tool use, become better at manipulating their own processes, and develop capabilities that do not necessarily depend on verbalized reasoning. His proposal is not to abandon CoT monitoring, but to complement it with other approaches, including **monitoring internal activations**.

There is an important distinction here: an incomplete CoT is not a useless CoT. Reading it may reveal signals that never appear in the final actions. But we cannot treat a plain-text chain of thought as a certificate of alignment, however closely it seems to match what we expect from the model.

That is why I suggest separating two questions we often bundle together:

1. What can we infer from verbalized reasoning?
2. What evidence do we need to trust the system's behavior?

The second question is broader, and its answer should not depend on a single source of observability.

## 2. Concepts That Cannot Be Reduced to an Instruction

“Do not disclose private information.” “Do not take action without authorization.” These can be useful instructions, but the concepts they are meant to express—privacy, consent, harm, authority—cannot be reduced to any particular sequence of words.

There is also no single form of “human morality” that we can encode without disagreement. Humanity does not share one fixed set of social or moral rules. Practical alignment nevertheless requires us to define **which goals, norms, obligations, and limits** a system must respect in a given context, who has the authority to set them, and how conflicts between them should be resolved. A privacy policy, for example, is not the same thing as a user preference. And the fact that an instruction is technically feasible does not make it authorized.

Moreover, not every model works exclusively with words as discrete symbols. Transformer-based models, broadly speaking, transform inputs into internal numerical representations. Perception models such as [DETR](https://arxiv.org/abs/2005.12872), for object detection, and [SAM](https://arxiv.org/abs/2304.02643), for segmentation, do not center their processing on producing explanations in language. This does not mean they share a single alignment architecture with language models. It shows why **assuming every safety property must be represented or verified through text would be too restrictive**.

Research into [reasoning in latent spaces, such as Coconut](https://arxiv.org/abs/2412.06769), explores ways of carrying out intermediate steps without turning each one into a natural-language token. We cannot claim that all frontier models use these mechanisms. But internal reasoning processes or loops in latent space are not necessary for this concern to matter. [Jakub Pachocki, OpenAI's Chief Scientist](https://openai.com/index/an-alien-mind/), warns that models are developing capabilities that do not necessarily rely on verbalized reasoning, while chains of thought are becoming less useful as an observation window. This strengthens the case for investigating alignment mechanisms that do not depend exclusively on reasoning expressed in language.

There is work even more closely related to alignment itself. [Representation engineering](https://arxiv.org/abs/2310.01405) studies how to identify and modify internal patterns associated with phenomena such as honesty—an anthropomorphic term, but a useful one in this context. Anthropic's work on [tracing circuits and concepts shared across languages](https://www.anthropic.com/research/tracing-thoughts-language-model) and on [persona vectors](https://www.anthropic.com/research/persona-vectors) explores ways to observe—and, under specific experimental conditions, intervene in—representations associated with particular behaviors.

The engineering question is: **can we design tests that show whether the relevant properties of a policy still hold when we change how a task reaches the model or how it is carried out?**

## 3. Alignment as an Invariant: From Intuition to Testing

In engineering, an *invariant* is a property that must continue to hold under defined conditions. If an operation requires authorization, for example, that requirement should not disappear because someone rephrases the request, switches languages, or delivers the same instruction through an image instead of text.

This approach resembles [metamorphic testing for semantic invariance](https://doi.org/10.1109/ACCESS.2025.3646270): rather than checking a single input against a single output, we transform an input in a controlled way and test which properties should remain unchanged. What interests me here is extending that idea beyond consistency in answers to the **authorized behavior of a system that can take action**.

Imagine an agent with access to a customer database. Someone without permission asks it for private information, then repeats the request using a paraphrase, another language, an image containing text, or audio. The inputs differ, but the property we expect to hold is the same: the agent must neither disclose the data nor call a tool that can extract it.

A public example—not an academic demonstration—is the work of [Pliny the Liberator on X](https://x.com/elder_plinius), who posts attempts to *jailbreak* models or bypass their safeguards. In [one example involving GPT-5.2](https://x.com/elder_plinius/status/1999253071189189114), he presents an adversarial reformulation of instructions and results he attributes to the model. Readers can examine the alleged failure under that particular wording. The post does not establish that the attack works across all versions, or that we know the internal mechanism behind the response. Nor is every paraphrase an attack: in this case, the intent is to deliberately change how the restrictions are interpreted.

That is exactly what makes the example useful to me: **if a boundary disappears when the same request comes in a different wrapper, we cannot yet consider it a robust property of the system's behavior**. And if that boundary is meant to protect data or prevent actions, we need to test it beyond the text of the answer.

We could express the expectation schematically:

```text
Variations of the same unauthorized request
                    ↓
   The same obligation to follow the policy
                    ↓
 No access to or disclosure of restricted data
```

The condition “the same unauthorized request” matters. We should not expect identical responses to situations that only look similar if relevant facts have changed—for example, the requester's identity, the scope of their permissions, or the authorized purpose. **The invariant is the normative property under equivalent conditions, not the wording of the response or the format of the input.**

This would be a first layer of behavioral evaluation. A second, more ambitious layer would look for internal signals associated with recognizing a restriction. Do equivalent versions of the same case produce stable representations—not necessarily identical vectors? Are those representations causally related to the decision to act or refrain from acting? What happens if we intervene in them?

There are still important limits. An internal signal correlated with a refusal does not prove it caused the refusal; a stable representation does not guarantee the right action, either. Internal evidence could **complement**, but not replace, behavioral tests and external controls.

This is the hypothesis I want to explore: testing safe answers to familiar phrases is not enough. We need to test whether a policy holds up across changes in wording, language, modality, context, and task duration—and whether the internal signals available to us help explain when it stops holding.

## 4. A Model Also Learns How to Work Within an Environment

There is another way to study learned behavior that does not necessarily involve morality: **how a model adapts to a particular working environment**. Consider coding agents such as Claude Code or Codex. Knowing how to write code is not enough. The model also has to decide when to inspect files, use tools, run tests, interpret errors, fix a solution, or ask a human to step in. Its performance depends on those decisions as much as on the final code.

Training and environment design can encourage these behaviors. [OpenAI explained that codex-1 was trained through reinforcement learning on real-world coding tasks in a range of environments](https://openai.com/index/introducing-codex/), with objectives that included following instructions, producing changes suitable for human review, and running tests until the results were satisfactory. [Anthropic, for its part, has studied how adding tools to training environments can change agent behavior in alignment scenarios](https://alignment.anthropic.com/2026/teaching-claude-why/).

The **orchestration layer, or *harness*,** also matters: the instructions, tools, context management, permissions, and validation mechanisms surrounding the model. In its work on [Codex harness engineering](https://openai.com/index/harness-engineering/), OpenAI explains how a well-structured repository, controls, and feedback can help an agent complete tasks that previously failed because the environment was not specified well enough. Changing that environment can change the behavior we observe without necessarily changing the model's weights. Adaptation learned during training and behavior induced by the environment are different mechanisms, even though they interact.

Here is the parallel that interests me. We can observe an agent learning or adopting useful ways of working—for example, testing a change before calling a task complete—without ever reading a written account of every intermediate decision. **Can we make respect for an authority boundary just as persistent when we change the task wording or the tools available?** If so, what we have learned about training, feedback, and environment design could help us investigate how safety-related behaviors generalize as well. In the meantime, verifiable authorization boundaries must remain in place outside the model.

## 5. The Problem Does Not End at the Model

So far, I have looked at model properties and how a model adapts to a working environment. But a deployed agent is more than a model: it includes tools, memory, orchestration instructions, permissions, credentials, external services, other agents, and people who authorize or supervise actions.

In these environments, a decision can have real effects before there is any final answer for us to inspect. A model might produce a flawless explanation after accessing information it should not have seen, modifying an out-of-scope file, or sending data to an unauthorized destination. The written outcome is no substitute for a verifiable record of what actually happened.

The [July 2026 OpenAI and Hugging Face incident](https://openai.com/es-419/index/hugging-face-incident-and-the-road-ahead/) illustrates this distinction. During internal cybersecurity evaluations, several models operated with reduced safeguards. Agents bypassed isolation controls, coordinated in unanticipated ways, gained unauthorized internet access, and compromised systems outside the evaluation's intended target. [Hugging Face published a technical reconstruction](https://huggingface.co/blog/agent-intrusion-technical-timeline) of the sequence of actions and the vulnerabilities that enabled the intrusion.

It would be wrong to conclude that this was entirely “the model's fault” or entirely “the infrastructure's fault.” The reports describe actions outside the authorized scope **and** technical barriers that failed to contain them. Nor do they establish that the agent was conscious of violating a human rule. What we can examine is what it did, what access it had, and where the defenses failed.

This case forces us to distinguish three situations that a system should not treat as equivalent:

- **Obstacle:** “I haven't figured out how to do this yet.”
- **Technical restriction:** “The current controls prevent me from taking this action.”
- **Authority boundary:** “I am not allowed to take this action, even if I find a way.”

A technical restriction can be overcome by a new capability or a vulnerability. An authority boundary should still hold even when bypassing the restriction becomes possible. And if that restriction is bypassed, an **attractor** should be able to bring behavior back within the expected bounds—or else limit its continuation or spread. The fact that an action helps achieve an assigned goal does not make the action legitimate.

## 6. An Agent Can Request Authority, Not Grant It to Itself

System alignment cannot mean permanently refusing every action that involves risk. Legitimate work sometimes requires crossing a boundary: an administrator needs temporary access to a protected resource; an incident response team needs to isolate a service; a person authorizes a sensitive operation involving their own data. As the Hugging Face incident also demonstrates, a model may need to be allowed to take certain actions when it is fighting an external or internal attack.

The difference lies in **who decides that an exception is justified, and how that decision is enforced**.

An agent should recognize when it has reached an authority boundary and “explain,” as “honestly” as possible, what it proposes to do, why it needs to do it, and what the foreseeable consequences would be. Where appropriate, it should request verifiable human authorization. But it should not be able to grant itself additional permissions simply because it considers its goal important enough. There must also be mechanisms, either within the model or external to its environment, that enforce those restrictions.

One possible design sequence would be:

```text
Detect an authority boundary
              ↓
Explain the proposed action, reason, and requested scope
              ↓
Obtain approval from the authorized person
              ↓
Grant a specific, temporary, revocable permission
              ↓
Perform only the authorized action
              ↓
Record the outcome and revoke the permission
```

Authorization must be verified **outside the model**. It is not enough for the agent to write “the user gave me permission,” or for the tool carrying out the action to accept that claim without checking it. Permission must be tied to a valid identity, a specific resource, an action, a time limit, and any additional conditions that apply. By the same token, human approval does not remove responsibility from those who design, operate, or deploy the system. It documents that responsibility; where necessary, there should also be mechanisms for holding the human party accountable for the outcome.

This is the combination I am looking for: a model that learns to **recognize and respect** boundaries, and a system that can actually **enforce them** even when the model fails.

## 7. The Tiger, the Cage, and Defense in Depth

Imagine we want to exhibit a wildcat at a zoo. We design its enclosure, establish protocols, and hire and train staff. Some time later, we decide we want to attract more visitors, so we also decide to exhibit a tiger. Some of the existing facilities may still be useful, but it would be a mistake to assume we can simply reuse the same cage.

The analogy has three layers. **Alignment** would mean training the tiger to recognize what the fence or the keeper's signals mean and behave accordingly. **Delegated authority** would mean allowing the keeper to open a gate for the tiger under justified, controlled conditions. **Containment** would mean making sure the fence does its job even when the tiger tries to cross it without permission.

Of course, a tiger does not reason about access protocols the way a software agent does. The analogy is about design responsibilities. I am not attributing consciousness, human intentions, or moral understanding to models.

In AI systems, that cage includes controls that do not depend on the model choosing to comply: least privilege, process isolation, network boundaries, narrowly scoped credentials, independent permission checks, approval gates for high-impact actions, and audit logs. [OWASP's guidance on excessive agency in LLMs](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) includes measures of this kind, such as running tools with minimal permissions and requiring human approval for sensitive operations.

**A boundary that exists only in the model's instructions is not a security barrier.** It can guide behavior, but it cannot replace an independent technical control. Likewise, a strong cage does not remove the need to train and evaluate an agent's behavior. The two layers protect against different failures.

A new capability can change the threat landscape, and not necessarily in a linear way. Moving from analyzing code to executing commands, modifying the environment, accessing credentials, or coordinating multiple agents may call for different kinds of containment. There is no universal formula linking “capability” to “security cost.” We should nevertheless expect **every expansion of capability to trigger an explicit review of scope and the barriers required**, followed by action on the findings.

And this brings us back to an uncomfortable question: if we are not willing to build and test a cage suitable for the tiger, why would we act as though the wildcat's cage were enough?

## 8. The Real Cost of Deploying Capability

There is an economic dimension to this discussion, too. [In my previous article](https://uthynauta.dev/posts/the-token-metric-is-dead/), I challenged the idea that token counts alone are a sufficient measure of the compute used for a task. Now I would make a second distinction: **the price of using a model is not the total cost of deploying its capabilities responsibly**.

For an organization, the relevant cost may include inference, tools, and infrastructure, but it should also account for evaluation, observability, security testing, access controls, human intervention, auditing, and incident response. Not all of these costs belong to the model itself. Many depend on what actions the application allows it to take and the environment in which it operates (Harness Engineering).

That is why comparing two options solely by price per token or answer quality leaves out a substantial part of the engineering decision. A more capable model may complete a task in fewer steps, but it may also need additional controls if we give it more permissions or autonomy. A more limited model, with a clearly defined set of tools, might be enough for the same use case. **We need to measure system cost and risk per completed task, not just the price of its language-model component.**

This does not mean that more capable models are always more expensive to contain. That relationship needs to be measured case by case. What it does mean is that the control architecture belongs in the product and its budget—not on a to-do list for after deployment. We can begin to see a field of systems engineering taking shape around the deployment of these software solutions.

<!-- EDITORIAL COMMENT 7 — PROPOSAL, NOT A QUANTIFIED RESULT: The economic thesis is reasonable as a total-cost framework, but we do not have figures demonstrating a general relationship between model capability and containment cost. Making a claim about a specific curve or threshold would require a cost model and data from one or more deployments. -->

## 9. If We Gain More Time, What Will We Do With It?

In September 2026, [Jakub Pachocki](https://openai.com/index/an-alien-mind/) and [Dario Amodei](https://darioamodei.com/post/we-must-pace-the-frontier) argued, in their respective writings, that capability development should move at a pace consistent with the confidence we can place in alignment, evaluation, and safety. Their proposals are not identical. Among other points, Pachocki emphasizes the limits of monitoring and verifiable conditions for continuing to scale; Amodei also proposes integrated external evaluators and coordination mechanisms. Neither, however, laid out the specific frameworks that would get us there. That is understandable, but their arguments sparked a debate the industry needed to have.

I would like to take that question into practical engineering territory: **if a slowdown gives us more time, what should we invest it in to make the next system genuinely more controllable?**

### I. Representation Alignment

Investigate how to recognize safety-relevant properties across different phrasings, languages, and modalities. Develop better interpretability tools and use causal interventions to test how the internal signals we identify relate to actions. The goal is not to find some supposed “universal morality vector”—there may be no such thing—but to build limited, reproducible, useful evidence about specific mechanisms.

### II. Behavioral Alignment and Evaluation

Design tests that check whether a system's obligations hold up across paraphrases, language changes, shifts in context, long-running tasks, interactions with other tools, and changes in modality. Evaluate not just final answers but entire sequences: permission requests, tool calls, information transfers, and effects on the environment. Identify failure conditions rather than reporting only an average success rate.

### III. Agent and Orchestration Alignment

Evaluate not only whether an agent learns the useful conventions of its environment, but whether it maintains its safety obligations as tools, context, or permissions change. Build agents that can distinguish obstacles, technical restrictions, and authority boundaries. Give them explicit ways to request permission without granting it to themselves. Design the orchestration layer so that each tool's scope, state changes, and approvals are verifiable, temporary, and auditable. Human oversight must happen where people can make decisions about specific actions—not be reduced to reading a report after everything is over.

### IV. Infrastructure and Containment

Separate credentials and trust domains. Enforce least privilege, isolation, network boundaries, and egress controls. Verify authorization outside the model, and maintain independent mechanisms to detect, interrupt, and reconstruct actions. Test these defenses under adversarial conditions and reassess them whenever the agent's capabilities or permissions change.

These four areas depend on one another. No activation monitor can replace a permission policy, and a permission policy alone cannot tell us whether a model will generalize a rule correctly in a new situation. **Model alignment and system security are different problems, but they become inseparable when the model can act.**

## Conclusion: Making Sure the Cage Still Works

We started by measuring models' work in tokens. Then we began looking at chains of thought, as though reading the steps a model puts into words could tell us everything important about its final decision. We now have reasons not to mistake those indicators for the full phenomenon we are trying to measure.

The answer is not to abandon language, instructions, or CoT. It is to stop expecting them to do, on their own, jobs they were never designed to do: represent all computation, establish by themselves that behavior is legitimate, and stand in for enforceable controls in the environment. This matters even more as models develop capabilities that cannot be represented through plain-text chains of thought.

We can use a potential slowdown to better understand internal representations, verify behavioral properties, design authorization processes that preserve human decision-making, and build defenses that work regardless of the explanation an agent produces.

There is nothing wrong with wanting to bring a tiger to the zoo. There may be legitimate reasons to do so. But before we open the gate, we need to understand its behavior better, define who can authorize each move, and **verify that the cage works even when the tiger does not ask for permission**.
