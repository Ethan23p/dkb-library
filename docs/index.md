*Ethan Porter's submission to the Future of Life Foundation's Epistack Competition.*

**[See a DKB in action — the showcase →](./showcase/)**  ·  [Repository](https://github.com/Ethan23p/dkb-library)

---

<!-- ============================================================
     WRITE-UP BODY
     Canonical source: Logseq page "Epistack Submission Write-Up".
     To refresh: replace everything BELOW this comment with a
     fresh Logseq markdown export of that page. Nothing above it
     comes from Logseq, so nothing above it should be pasted over.
     ============================================================ -->

- ## Overview
  *My submission to the Future of Life Foundation's Epistack Competition.*
	- ### What does it do?
	  A library for creating knowledge bases that are *durable, scalable, and intuitive*. Multiplying one's capacity to **ingest, retrieve, and synthesize data while preserving nuance**.
		- #### Preserves nuance by
			- being source-data oriented (not generated artifacts) and
			- deferring synthesis over source-data to the time and context of retrieval.
		- #### Knowledge bases which are built to be *durable, scalable, and intuitive* by
			- preserving source-data verbatim,
			- maintaining a principle that generative content isn't source data or evidence,
			- leveraging mechanisms with AI to optimize for the limited resource: *the user's attention*.
	- ### Why is this significant?
	  The significance is in the design and the guiding values/principles being embodied through the entire system, and they're the epistemological statement I would like to impress upon you.
		- The prototype (beta version) is available for your testing as a Claude plugin - installation instructions in the next section.
		- I'll go into the 3 foundational principles, pulled from the specification.
			- Source Data First
				- > None of the generative content from this system qualifies as source data or evidence - inference this system does is grounded solely by first-hand source data. (inference, meaning: metadata formation, informational artifact generation, etc.)
				  >
				  > **Source data at source fidelity is essential**; phrasing, tacit knowledge, metaphors - warts (or contradictions) and all.
					- How is this implemented?
						- This codebase doesn't use generated artifacts as source data, though it does use generative mechanisms.
						- When a query is run, it consists of:
							- the User's relevant source content, verbatim; placed side by side and labelled with provenance;
							- AND the User's query
						- A valid mental model would be that it's like feeding your AI Assistant each of your core sources and then asking them questions about them and requiring they follow a regime of providing provenance. A DKB is such a process, operationalized, enabled to scale, and made reliable.
						- In these early versions
							- v0.2.1 does shrewd 'context stuffing' of the entire knowledge base, which is represented as a cluster of `.md` files on disk.
							- v0.2.2 will do agentic graph search over an EAV database to find relevant sources, and then more gracefully stuff them in context and run the query. Source data at that point will probably be hand-rolled, `.json` or `.yaml` files.
							- Post-v0.2, graph search + explore agents is quite effective, with quite high capacity, resembling the "deep research" pattern employed by the big AI providers; ideally, future development will go into scaling even beyond that - which I'm certain is possible, through delegation, as long as the core guiding values aren't violated.
			- Just in Time (JiT) Intelligence
				- > **A fatal failure mode with modern AI is interpretations over interpretations.**
				  >
				  > Inference this system does is deferred to the *time* and *context* of retrieval - ensuring that nuance is preserved, a modern model is used, and data is up-to-date.
				- How is this implemented?
					- This codebase doesn't use generated artifacts as source data, though it does use generative mechanisms.
						- Therefore, the trick is to not try and employ the agentic capabilities *too early* in the process and, instead, to build architecture around the agentic capabilities such that they are highly leveraged but not in a way that feeds back into the source data or are exposed to the known issues of contemporary AI.
						- This is demonstrated by the *lack* of architecture around AI technologies - much more emphasis is placed on the pieces moving around it, like ingesting, storing, processing source data.
							- Thus, this system isn't intended to "solve debate" as much as it's supposed to supplement agents *greater than or equal to* humans, in reasoning.
			- AI as an Interface for Hard Data
				- > The Interface Agents are first-class citizens - this system is technically useable by a human at a terminal but will never be used that way.
				  >
				  > **This system leverages AI Agents both as machinery and as interfaces, both irreducible**.
				  >
				  > Machinery: processing data, interpreting between sources, on-demand synthesis;
				  >
				  > Interfaces: interpolating across jagged boundaries for humans, using a deterministic CLI to perform complex operations with *high trust*.
				- How is this implemented?
					- Agents are machinery in that they are utilized for the operations which are not cheap or impossible through traditional software - like doing reasoned search over source data at the level of a college student; synthesizing information in limited, constrained contexts; and such operations.
					- *reasoned search over source data*
						- software developers have created powerful tools for search over the last decade which, in my understanding, boil down to: relational / graph data & semantic / vector data;
						- A powerful pattern is providing an Agent with access to these tools (as we've seen with modern AI for the last 3 years or so) - this pattern is a wonderful point of leverage to exploit, which is a major part of the magic of this system.
						- Open-source implementation of these methods of search is straightforward, and I have experience with them:
							- graph data: simulated via SQLike (v0.2.1), DataScript (v0.2.2)
							- vector data: ChromaDB (post v0.2)
						- Which is exactly the pattern that DKB will utilize. The idea is straightforward:
							- Do agentic search over the most relevant source data.
								- How much of the relevant source data?
									- Assuming a model of 2026 with over 1 million tokens of potential context, reserving some for the response which is to come, that leaves somewhere around 990k tokens.
								- What's relevant?
									- semantic relevance: consistent, strong, mid-accuracy signal (e.g. "include source data with relevance above [x]%)
									- relational relevance: not entirely consistent, potentially strong, high-accuracy signal (e.g. "include source data in line with [x] consideration")
					- Agents are interfaces
						- AI Agents are *wonderful* at interpreting the messy, inconsistent input of humans into discrete outcomes, such as tool calls;
						- Therefore, place an agent in between the user and the, at times, technical & precise interface to handle the translation.
						- This enables an enormous increase in control for the User which is reflected in the CLI and the instructions given to the AI Assistant: the guide to using the CLI sounds like it would require a multi-month training regime to enable a human to use it, but even the least capable agents of today handle the translation with ease.
		- Compounding Across Teams & Collaborators
			- I emphasize durable and regression-resistant because a DKB is a piece of knowledge-utility which appreciates in value over time - I would say this is a property incompatible with solely human-maintained utilities *except in the case of largescale crowd-sourcing* like Wikis, and even for those, just barely.
			- Being able to organize, manipulate, reason over large amounts of data is a force multiplier which wasn't realistic to harness before contemporary AI.
	- ### See a DKB in action. (early stage, beta version)
	  Showcase, from the Repo: `github.com/Ethan23p/dkb-library/tree/main/docs/showcase`
		- In the showcase, Claude walks you through a few actual instances of the application being used, pulled from the extensive testing which is central in my workflow. This demonstration is very early stage (these are literally some of the first end-to-end simulations we ran), but they demonstrate the values in the way the system reacts to and supplements the User, based on their queries.
		- #### Plain, Boring Tensions in the Sources
		  Case #1
			- Provided a binary question, Claude (using this tooling) explains the tensions expressed in the different sources within the Knowledge Base; this demonstrates the system distinctly *not* automating the Epistemology, instead enabling the User to make that judgement.
		- #### Preventing Hallucination & Preserving Integrity, by Design
		  Case #2
			- By providing all of the data that the agent needs to assess a situation, by setting expectations, by framing the interaction properly: showing *Epistemic humility* can be on offer as the path of least resistance and the Agent will reliably take it.
	- ### Try it as a Claude Plugin. (early stage, beta version)
		- Installation: `https://github.com/Ethan23p/dkb-library/blob/main/docs/PLAYTESTING.md`
		- In Claude Code, run these 4 commands, in sequence:
		  ```
		  /plugin marketplace add Ethan23p/dkb-library
		  /plugin install dkb@ethan-dkb
		  /plugin install dkb-demo@ethan-dkb
		  /reload-plugins
		  ```
		- The second install is two pre-built Durable Knowledge Bases - you can talk with Claude to get them established, then do some 'explore' queries.
			- The first DKB has sources about the theoretical safety of the Large Hadron Collider.
			- The second DKB is a wild-card - it contains a handful of sources detailing an interesting historical dynamic pertaining to the early days of computer tech, when they were being introduced to typical, hourly workers.
		- Once it's installed, the intention is that Claude will straightforwardly figure out the tool and guide you through all operations, seamlessly. You can actually just jump in, but, for the discerning user, there's further instruction in the `PLAYTESTING.md`, linked above.
	- ### Who am I?
	  My name's Ethan, I'm an independent software developer and writer currently based in Phoenix, AZ.
		- I'm a rationalist (of the Astral Codex Ten camp), and I'm obsessive about design, AI, computer science, user experience, game design.
		- Note: for this write-up and other such writing, I do the physical writing 100% myself; the ideation is largely alone, with exploration and brainstorming with AI as is productive and/or less tedious. For writing within the repo - including documentation, commit messages, and such - I typically have that generated by an AI Assistant based on a tight specification.
			- *And I use dashes grammatically, in a style of my own - which is unrelated to the dash/emdash usage of modern AI.*
	- ### A Multi-Faceted Library, An Engine per Use-Case
		- #### "Epistack Knowledge Base" - Applied Epistemology & Study (You know this one)
			- potential topics: COV origin research, LHC black holes, health impact of eggs
		- #### agentic memory
			- Where I started this exploration from.
			- I'll be applying this system to AI memories, in various configurations, which should have a measurable impact; at least for long-term memory or, with some configuration, spanning the full range like human's have: working memory / mid-term memory / long-term memory.
			- Memory is the most compelling application because the impact is felt viscerally - modern AI systems have never been enabled with memory in any significant form.
		- #### one's personal context
			- In the same vein as memory, this should be interesting because of how viscerally we feel it. Imagine an AI system which *knows* you - or, at least, an AI system which doesn't make you repeat your personal context incessantly.
		- #### attention/task management
			- The current project is version 0.2 - 0.1 was applied to *tracking my creative endeavors*; it validated the idea for me because it made a noticeable impact.
			- Creative endeavors are a good example because the following is *trivially true* of them, today: each individual person has strictly, only mental accounting of their various **non-obligatory** endeavors. Individuals who are highly creative & technical are presumed to be juggling these endeavors *indefinitely*.
- ## Methodology
	- ### Ingestion
	  How does this system handle ingestion?
		- Users within a team choose source data meticulously and then pass them into the system with low-friction; ingestion is where the quality ceiling of the Knowledge Base is set, and it is when **identity** is forged. After ingestion, the goal is that not a single datum is lost to ingestion, retrieval, synthesis or otherwise.
		- The DKB methodology focuses heavily on ingestion, even to the extent that it reaches through the other layers to hopefully resolve some of those tensions pre-emptively. Where it doesn't automate reasoning, it does expose the underlying mechanisms.
			- What qualifies as source data?
				- Any item which could be cited in an academic paper.
				- What doesn't quality as source data?
					- self-generated content;
			- Like Wikipedia, a DKB can accept source-data from an arbitrary number of sources in parallel and makes issues of managing that data actually tractable.
				- A secondary mechanism for scaling the useability of the vast amount of knowledge would be intelligently derived informational artifacts - for when the system needs to maintain the spirit of "first-hand source data" but scales beyond current capabilities for search & retrieval.
				- These serve to relieve/harness some of the attrition of constantly searching, updating, and maintaining the knowledge-base; this mechanism is comparable to portal pages, disambiguation pages found in Wikipedia.
	- ### Structure
	  How does this system handle inference, discourse?
		- Regarding inference, genealogy is intentionally ephemeral, transparent, per-artifact. Using the DKB should enable a rich, nuanced comprehension of the underlying sources, arguments, positions; though, it intentionally doesn't automate that process.
		- The DKB methodology doesn't directly address discourse - competing claims, sources, "the same points argued ad infinitum" - but it does expose them at time of retrieval.
		- *retrieval*
			- Retrieval can surface claims, patterns, disagreements; this is in the hands of the team using it.
			- Metadata is leveraged during retrieval to great effect - each piece of metadata represents a new node in the graph of source data, and each new node is a point, the sum of which makes up the surface area the AI can *intelligently search over*.
				- This is significant and distinct from semantic similarity search - the leverage AI provides in retrieval is proportional to how much tangible space it is able to search through. Where semantic similarity provides one powerful mechanism, thorough metadata provides many mechanisms of less power which can be leveraged more strongly.
		- *synthesis*
			- When synthesis by AI is used, the methodology places the AI in a position of utility and intelligence as opposed to one which is opinionated  or makes less harsh the underlying mechanics.
	- ### Assessment
	  How does this system handle assessment?
		- Largely unaddressed in this system, deliberately; assessment represents a seam where you might have the work handled by human researchers, cutting-edge AI researchers, or another tool entirely.
		- Judgement is concentrated at two points:
		  **what source data gets added** and **literal interpretation, utility at query time**. This is intentionally to reduce unnecessary load on the operator and optimize for their attention being spent on the important bits of research.
		- The Knowledge Base avoids declaring a verdict, a credence, or ranking.
	- ### Guiding Values & Principles
		- #### Concept
			- Source Data First
				- None of the generative content from this system qualifies as source data or evidence - inference this system does is grounded solely by first-hand source data. (inference, meaning: metadata formation, informational artifact generation, etc.)
				- **Source data at source fidelity is essential**; phrasing, tacit knowledge, metaphors - warts (or contradictions) and all.
					- Though that doesn't imply byte-level preservation.
			- Just in Time (JiT) Intelligence
				- The fatal failure mode with modern AI is interpretations over interpretations.
				- Inference this system does is deferred to the *time* and *context* of retrieval - ensuring that nuance is preserved, a modern model is used, and data is up-to-date.
			- AI as an Interface for Hard Data
				- The Interface Agents are first-class citizens - this system is technically useable by a human at a terminal but will never be used that way.
				- This system leverages AI Agents both as machinery and as interfaces, both irreducible.
					- Machinery: processing data, interpreting between sources, on-demand synthesis;
					- interfaces: interpolating across jagged boundaries for humans, using a deterministic CLI to perform complex operations with *high trust*.
			- Data-Orientation
			- Evaluation & Observability
			- Active Engagement
			- Crowd-Sourcing Dynamics
		- #### Development
			- Durable, Regression Resistant, Maintainable
			- Simple & Minimal
			- Moldable & Atomic
			- Ergonomic
			- Observable
			- Test & Evaluation Driven Development
	- ### User Experience Flows
	  *This content is quite raw, but it's really the best way to get a feel for the system.*
		- routine fresh initialization
			- **User:**
				- "Hey Claude! Today we're getting started on a project involving the library, 'Durable Knowledge Base', you should have access to some skills?"
			- **Assistant:**
				- *Initializes DKB skill.*
				- Receives introductory content.
				- "Hi! Yes, I just loaded it up. The 'Durable Knowledge Base' system. . ."
				- *Claude introduces the user to the concept, Claude's place in it, and the User's place in it.*
				- *Then Claude explains the next steps.*
			- **User:**
				- "Okay, great! That aligns with my understanding. Let's get started with a knowledge base on *personal context about me*. The intention being that you can get a deeper understanding of me and, hopefully, I don't have to repeatedly explain contextual information about me as often."
		- routine 'explore' retrieval (User-initiated, cold-start)
			- **User:**
				- "Hey Claude! I'm asking about our large hydron collider knowledge base;"
				- "So, suppose a micro black hole did form and *didn't* evaporate, how slowly would it actually grow? And is 'slow enough to not matter for billions of years' the same as 'safe'?"
			- **AI Assistant:**
				- "Let me get oriented within the LHC knowledge base and then I'll look into this for you."
					- Note: ideally, the User's AI harness provides memory tools to ease such interactions; this is assuming a cold start. (any modern harness meaning Claude Code, Codex, Gemini CLI, etc.)
				- *Invokes DKB skill.*
				- *Calls upon the CLI: `DKB retrieve --help`*
				- *Receives guidance for using this aspect of the system.*
				- *Calls upon the CLI: `DKB retrieve explore "[subject]"`*
				- *
				- *Returns to the user the verbatim result.*
		- routine 'query' retrieval (User-initiated, harness memory pre-established)
			- **User:**
				- "Hey Claude! I need some sources to chew on for the LHC project."
				- "No fluff. My question, to get started: If a micro black hole did form and *didn't* evaporate, how slowly would it actually grow — and is 'slow enough to not matter for billions of years' really the same as 'safe'?"
			- **Assistant:**
				- "Sure, let me pull from the knowledge base and get right back to you - just the links & orientation, no commentary."
				- *Invokes DKB skill.*
				- *Calls upon the CLI: `DKB retrieve --help`*
				- *Calls upon the CLI, fr: `DKB retrieve query "micro black hole accretion rate Earth LHC safety"`*
				- *'Query' is initiated.*
				- *Receives extensive list of sources with minimal orientation provided by AI Agent, their guidance based only on high-confidence information.*
				- *Returns to the user the verbatim result.*
		- routine adding source-data (User-initiated)
			- **User:**
				- "Hi, looking to add to the Epistack DKB the following paper: [link to online journal]"
			- **Agent:**
				- *Invokes DKB Skill.*
				- *Grabs the sample entry provided by the CLI through `DKB add-source --help`.*
				- *Uses web fetch tools. Gets some information and an abstract but, predictably, is blocked from accessing the full paper or the PDF.*
				- *Preps the sample entry with what information has been gathered.*
				- "Absolutely; I ran into access issues trying to fetch the paper online, but I'll show you what info I was able to get in a data block: [informative representation]"
				- "I still need access to the full paper. There are a couple options, of course:"
					- "Assuming you have access to viewing and downloading the paper through your machine, we could launch a short Claude-in-Chrome session and I could straightforwardly get the paper. This requires minimal setup and would be very quick."
					- "If you have the PDF downloaded, you can point me to that directory and I'll import it."
					- "If you have credentials I could use to interact with that site specifically, let me know."
				- "Naturally, I recommend that first option so that you can leave the work to me, but any approach would work."
			- **User:**
				- "Oh, that would be fine, let me open Chrome..."
			- **Agent:**
				- *Uses the User's browser to download the paper.*
				- *Confirms the details with the user, including the metadata it was able to source.*
				- *Authors the command to add source data: `DKB add-source --json-import "tmp/Joscha-Bach-paper.json"`
		- routine adding source-data (Agent-initiated)
			- **Agent:**
				- "I'm seeking academia-level source-data to support the detailed argument laid out by the Orchestrator Agent. Based on the substantial number of sources found so far, I've identified a journal that might be fruitful for this subject that has only been cited once so far. I'll start there."
				- *Proceeds with Agentic research.*
				- *Calls `DKB add-source --help`*
				- "Great, I've found the perfect paper to add to our corpus. I'll write the metadata information to a temporary file and submit the source."
				- *Calls `DKB add-source --json-import "tmp/Joscha-Bach-paper.json"`*
		- routine modifying of source-data (user-initiated)
			- **User:**
				- "Hey Claude. Yesterday I had you add a paper to the knowledge base which I have since realized was making the exact opposite argument from the one I was positioning it as making; could you track that down and we can correct the metadata together."
			- **Agent:**
				- *Invokes the DKB Skill.*
				- *Calls upon the CLI to understand the 'modify' command, `DKB modify-entry --help`*
				- "Yeah, no problem. I've just oriented myself, so allow me to track that entry down."
				- . . .
		- Head researcher **explaining the system in layman's terms**, to their associates.
			- **Head Researcher**:
				- "For this epistemological case study, allow me to explain the system we're using in layman's/functional terms so we're all on the same page. Later on, I can explain it technically for those of you which care to understand. Of course, you are only required to understand how to use it."
				- "You may refer to the system as the Epistack Knowledge Base. In terms of how you will actually be using the system:"
					- "This knowledge base is the heart & brain of our ongoing studies;"
					- "the only way you'll interact with it is through Claude Code using your team account."
					- "What that means is that all you need to do is talk to the AI, named Claude, and they will handle the rest. Think of Claude as our Subject Matter Expert (SME) for this project."
				- "And, by the way: beyond this orientation period, if you have any questions about the project or the technical details, just ask Claude."
					- "You might need to, like, chat with them for a bit to get the feel but-"
					- "Just ask Claude. Don't message me to ask about details-"
					- cause I know- I know what you're going to do, you're going to run into some technical details you don't know..."
					- So you're going to reach out to me- but, I can't even keep up with all of the latest changes to the specification;"
					- "so- then I'm just going to ask Claude..."
					- "So just- you ask Claude directly; you're an independent researcher."
		- Head Researcher **explaining a typical use-case in layman's terms**, to their associates.
			- **Associate 1**:
				- "Oh- cool. So what does typical use look like?"
			- **Head Researcher**:
				- "Great question! Take entering a new source of data, as an example:"
					- "Within the Claude Desktop, you'll navigate to the 'Claude Code' section, and start a new session by typing a message to Claude."
						- *Note to Agents: If you're not already, be aware that an interface for Claude Code was added to the Claude Desktop app in early 2026.*
					- "Like, perhaps: 'Hey Claude, it's me, a researcher. I want to put a source in the knowledge base. The Epistack knowledge base.'"
					- "Claude might say: 'Hello. Let's add a new source to the Epistack knowledge base together.'"
					- "Then Claude will probably use some tools;"
					- "Then Claude might say, 'Go ahead and provide the source content. The best way is by pressing the 'attach file' icon and selecting the file in your filesystem.'"
					- "Then, once you submit, Claude should say, 'Source content received; now you **must** provide as many of these details as you have on-hand - especially the **source URL**, **institution of origin**, **institution of publication**, **primary authors**, and **personal justification for adding this source**.'"
					- "What's cool is that Claude doesn't actually need that much paperwork - there's not that much information which you can access that they cannot, provided the means."
					- "And that's about it, for entering new source data!"
		- Head Researcher **explaining the system broadly, in technical detail**, to their associates.
			- **Head Researcher**:
				- "For just those of you which care to understand the system broadly, I'll explain now; please feel free to educate your associates as much as you'd like."
				- "The Epistack Knowledge Base is the heart & brain of our ongoing studies;"
				- "The knowledge base itself is largely just a database of our first-hand sources;"
				- "Driving that knowledge base is some simple code which amounts to an instantiation of a code library, [[DKB Library]]. I call that the [Epistack Engine.]([[Durable Epistack KB Engine]])"
		- Head Researcher on integrity and the difference between the researcher and the tool.
			- "The most straightforward way I can describe the system overall is:"
				- "as input, we pass in source data - the same sources that we would reference in our typical studies."
				- "As output, we can get any manner of information that we'd like. Claude will give you broad overviews, formatted citations, plain lists of sources, trace lines of evidence, do largescale analysis of data with the tools you give them - in fact, Claude will do the entire project, if you let them."
					- "**The trick is**: If any of you *do* let them do too much, you are still responsible for every outcome that follows. And I'll set the expectation now: this organization does not hand off the research to AI - so if we find that you are, you will no longer be associated with this organization."
				- "Therefore, I expect that you'll be doing the research you love doing, and using this knowledge base as a tool throughout."
