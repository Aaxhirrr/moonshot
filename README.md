# moonshot

moonshot is a scripted hackathon demo for showing the economic cost of wasted AI context in large-codebase developer workflows.

The core demo compares two runs of the same task:

> Fix checkout bug where discounts are applied after tax instead of before tax.

- Baseline Nova receives the messy `mooncart` repo context: `86,240` tokens.
- moonshot scans, scores, blocks, and summarizes first: `17,920` tokens.
- Same patch, same passing test, much smaller context packet.

## Demo

```bash
npm install
npm run dev
```

Open:

- `/` for the landing page.
- `/demo` for the scripted comparison demo.

## Pipeline

The demo models:

1. Repo scanner
2. Token estimator
3. Relevance scorer
4. Context router
5. Prompt builder
6. Nova / mock Nova output
7. Patch + report visualization

Mock Nova is the default so the demo is reliable during judging. Live Nova integration can be added behind environment variables without changing the UI story.

## Dataset Note

The raw local archive is intentionally ignored because it contains environment files, IDE caches, and bulky artifacts. The public repo commits only sanitized `mooncart` fixtures in `data/`.
