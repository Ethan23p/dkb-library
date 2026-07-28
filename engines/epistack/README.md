# epistack

First engine instantiation: the Durable Epistack KB Engine (FLF Epistemic Case Study competition). Stays thin — CLI title, invocation name, convention seed, explore model, `main()`; every mechanism lives in `library/`. Spec: `[[Durable Epistack KB Engine]]` in Logseq.

`main.ts` is what `bin/dkb` execs, and what `demo/build.ts` drives as a subprocess to generate the demo knowledge bases. Run it directly with `bun engines/epistack/main.ts --help`.
