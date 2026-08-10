# Aug 10, 2026 · AI & Tech Daily Digest

> AI and tech highlights compiled for August 10, 2026, with summaries, links, and commentary.

---

## I. Policy & Regulation

### 1. House Democrats call for OpenAI, Anthropic CEOs to testify on AI-driven hacks (Policy)
**Summary:** A group of House Democrats led by Rep. Greg Casar (D-Texas) wrote House Speaker Mike Johnson asking him to invite CEOs of major AI firms including OpenAI and Anthropic to testify before Congress. The letter, first reported by CNBC, says recent hacking incidents involving AI models have “serious implications for Americans’ safety and security” and that Congress has so far “completely failed to respond” to threats from AI development. Lawmakers want answers on causes, possible company failures or negligence, and what regulation is needed to prevent repeats—against a backdrop of cybersecurity evaluation incidents and debate over measures such as an “AI Kill Switch” bill.

**Links:**

- [CNBC — Dems call for AI companies to testify on hacks](https://www.cnbc.com/2026/08/10/openai-anthropic-ai-hack-congress.html)
- [CNBC — OpenAI Astra model raises cyberattack concerns](https://www.cnbc.com/2026/08/10/openai-astra-cybersecurity-risks.html)

**Commentary:** Once capability evals and real-world intrusion narratives converge, Washington’s fastest lever is a CEO hearing—oversight competition is now public accountability theater.

---

## II. Models & Open Products

### 2. Meta launches Muse Glimmer: 30B open-weight agentic model built for single-GPU local runs (Product / Open source)
**Summary:** On August 10, Meta introduced Muse Glimmer, an ~30-billion-parameter multimodal open-weight model under Apache 2.0, optimized for always-on local agent workflows (tool use, local coding, long tasks) that can run on a Mac or PC with a single consumer GPU. Meta says quantization can shrink the footprint to roughly ~17GB for 24/32GB consumer cards. Weights are on Hugging Face, with planned integrations for llama.cpp, MLX, ExecuTorch, Ollama, LM Studio, and others. CEO Mark Zuckerberg also said Meta will open weights for flagship Muse Spark 1.2, pitching on-device AI as a cost and latency alternative to cloud inference.

**Links:**

- [Meta AI Research — Introducing Muse Glimmer](https://research.meta.ai/blog/introducing-muse-glimmer-open-agentic-model)
- [CNBC — Meta launches Muse Glimmer open-weight AI model](https://www.cnbc.com/2026/08/10/meta-muse-glimmer-open-weight-ai.html)

**Commentary:** The open-source race is shifting from “bigger base models” to “agents that run offline”—Meta is using device-side deployment to flank cloud compute moats.

---

### 3. OpenRouter weekly chart: DeepSeek-V4-Flash GA tops usage; China models lead U.S. for a 15th straight week (Industry)
**Summary:** National Business Daily, citing OpenRouter data, estimated ~69 trillion tokens of global model usage last week (Aug 3–9), up ~21.5% week over week. Chinese models on the board logged ~34.25 trillion tokens versus ~9.17 trillion for U.S. models—China’s 15th consecutive weekly lead. The top four were all Chinese: DeepSeek-V4-Flash GA (0731) led at ~8.83 trillion tokens (~+570% WoW), followed by Tencent Hy3, DeepSeek-V4-Flash preview, and Xiaomi MiMo-V2.5. DeepSeek says the GA build keeps the preview’s structure and size but redoes post-training with stronger agent skills; Google’s Gemini 3.6 Flash entered the chart around ninth.

**Links:**

- [Ifeng Tech — China AI models lead token usage for 15 weeks; DeepSeek-V4-Flash tops chart](https://tech.ifeng.com/c/8vTJnHUppfC)
- [Ifeng Tech — How Chinese models swept the global top five](https://tech.ifeng.com/c/8vS6mAUPCPV)

**Commentary:** Token leaderboards are now a scoreboard for price-performance plus agents—the next stress test is inference supply and reliability, not another Flash drop.

---

### 4. xAI ships Imagine Image 2.0: region edits and up to five reference images; claims No. 2 on Arena T2I and edit boards (Product)
**Summary:** xAI made Imagine Image 2.0 generally available as Quality Mode on grok.com/imagine and in Grok iOS/Android apps around August 7, stressing typography, small-text sharpness, and consistency across generations. Editing is first-class: magic-wand region edits, segmentation, transparent background export, multi-reference editing with up to five inputs, smart resize across aspect ratios, and task templates. xAI says the model ranks second worldwide on Arena text-to-image and image-edit leaderboards as of August 7 (listed under the SpaceXAI name); API access remains “coming soon.”

**Links:**

- [xAI — Imagine Image 2.0](https://x.ai/news/grok-imagine-image-2)
- [Unite.AI — xAI Ships Grok Imagine Image 2.0](https://www.unite.ai/xai-ships-grok-imagine-image-2-0-with-precise-editing-and-a-top-arena-ranking/)

**Commentary:** Image competition is moving from one-shot generation to an iterable design toolchain—edit fidelity matters more to real workflows than raw Elo alone.

---

## III. China Apps & Monetization

### 5. Alibaba’s Qwen Open Platform goes live across phone, PC, and AI glasses with first-wave life-service partners (Product / Ecosystem)
**Summary:** On August 10, Qwen’s Open Platform launched, opening service integration for partners and developers across mobile, PC, and AI glasses. The first cohort spans logistics, housing, local services, wealth, autos, and more—including SF Express, Swan Home, Ziroom, Yingmi Fund, Hello bike/car rental, VeryZhun, and Midea Meiju. Third parties can build AI agents as standalone chat spaces inside the Qwen app for consult–recommend–fulfill flows, with standardized protocols plus account, AI payment, and order hooks. Early hands-on coverage describes the bet as wiring existing industry services into AI, not replaying every app’s GUI.

**Links:**

- [Shanghai Securities News / 10jqka — Qwen Open Platform launches across App, PC, glasses](https://stock.10jqka.com.cn/20260810/c678822687.shtml)
- [NetEase / SiliconStar — Hands-on with Qwen Agent](https://m.163.com/dy/article/L3VG0F0H0511N33R.html)

**Commentary:** Agent product-market fit hinges less on a new chat box than on plugging fragmented industry APIs into dialogue—“can get things done” will bind ecosystems faster than “can chat.”

---

### 6. Doubao hotel orders begin ~12% take rate today—AI chat-entry commissions go live in China (Monetization)
**Summary:** From 00:00 on August 10, 2026, hotel bookings that originate in Doubao and convert via Douyin LaiKe apply a dedicated fee: ~11.4% software service fee plus ~0.6% payment fee, about 12% combined. The schedule follows Douyin Life Services’ July 27 “specific channel software service fee” notice, which lists Doubao among special channels and pushes rates through merchant backends; the fee base includes user payment plus non-merchant subsidies such as platform coupons. Hoteliers confirmed backend notices; ByteDance has not issued a broad public comment. Multiple outlets frame it as a landmark for Chinese AI assistants taking a cut of completed transactions.

**Links:**

- [Ifeng Tech — Doubao hotel channel independent fee ~12% starts today](https://tech.ifeng.com/c/8vThIcCdMO7)
- [Huxiu — Doubao begins charging ~12% commission on hotel orders](https://www.huxiu.com/moment/1269818.html)

**Commentary:** Beyond ads and subscriptions, assistants now price their gatekeeper role as GMV commission—conversation is becoming a checkout rail.

---

### 7. Unitree STAR Market online subscription opens; DeepSeek takes ~¥141M strategic allotment with a 36-month lockup (Funding / Embodied AI)
**Summary:** Unitree Robotics (688836) priced its STAR Market IPO at ¥150.80 per share for ~40.45 million new shares, with online subscription opening August 10. Hangzhou DeepSeek appears on the strategic allotment list for ~933,400 shares (~¥141 million) with a 36-month lockup. Chairman Wang Xingxing said the parties signed an MoU covering joint AGI R&D, high-performance general robots, and deep collaboration on AI model adaptation/fusion. Tencent-linked capital and other strategic investors also participated. Markets read it as a public capital structure tying “model brains” to “robot bodies.”

**Links:**

- [Sina Finance — DeepSeek and Tencent capital among Unitree strategic allottees](https://finance.sina.com.cn/jjxw/2026-08-06/doc-inimkwsv2925031.shtml)
- [China Fund News — DeepSeek in Unitree IPO allotment; Wang outlines three cooperation pillars](https://www.chnfund.com/article/AR9a67abe1-fe92-e0ac-4f3f-3a22edfb93d2)

**Commentary:** A three-year lockup is not a trading story—it writes the embodied-AI supply chain into the IPO cap table.

---

## IV. Embodied AI & Research

### 8. Daimon unveils Daimon-TWM, a tactile-grounded world model with ~64% average success on contact-rich tasks (Research / Robotics)
**Summary:** On August 10, Daimon Robotics said it released Daimon-TWM (Tactile-grounded World Model), described as a tactile-native world model spanning physical understanding, predictive planning, and rapid reaction. The company reports ~64.0% average success on hard contact-rich tasks and >80% on pose-adjustment categories, with much stronger performance than baseline π0.5 under disturbances. On nine physical-cognition metrics it cites a composite score of ~60.1, ahead of some tactile-specialized and vision baselines. Co-founder and chief scientist Wang Yu is a long-time robotics manipulation researcher.

**Links:**

- [Sina Finance — Daimon’s “physical interaction brain” Daimon-TWM](https://finance.sina.com.cn/roll/2026-08-10/doc-inimvsvi8126899.shtml)

**Commentary:** Embodied AI’s bottleneck is shifting from “seeing” to “feeling and correcting fast”—if tactile world models generalize, they reprice automation ceilings on contact-dense lines.

---

## V. Funding & Semiconductor Infrastructure

### 9. Sony and TSMC in talks on ~¥1 trillion Kumamoto image-sensor JV targeting ~2029 volume production (Infrastructure)
**Summary:** Nikkei and The Japan Times reported August 10 that Sony Group and TSMC are discussing roughly ¥1 trillion (~$6.3–6.4 billion) of combined investment in next-gen image-sensor production and R&D in Kumamoto, Japan, with volume production targeted as early as ~2029. Ownership chatter centers on ~60% Sony / ~40% TSMC, with Sony in control. Use cases include robots and vehicles needing higher-precision AI vision. A May basic agreement already exists; final investment and JV formation remain pending, and Japan’s trade minister said the government would consider support.

**Links:**

- [Nikkei Asia — Sony, TSMC to invest $6.3bn in advanced image sensor plant](https://asia.nikkei.com/business/tech/semiconductors/sony-tsmc-to-invest-6.3bn-in-advanced-image-sensor-plant-in-kumamoto)
- [The Japan Times — Sony and TSMC to invest ¥1 trillion in joint chip plant](https://www.japantimes.co.jp/business/2026/08/10/companies/sony-tsmc-joint-chip-plant-japan/)

**Commentary:** Physical AI’s “eyes” capacity is being pre-booked in geopolitically aligned fabs—sensor capex is syncing with robot and automotive AI narratives.

---

### 10. Discovered Materials raises ~$9M seed to hunt cooler chip materials with AI agent swarms (Funding)
**Summary:** TechCrunch reported August 10 that materials startup Discovered Materials closed an ~$9 million seed round led by Lightspeed India Partners, with Peak XV Partners and angels including Paul Graham, Gokul Rajaram, and Thariq Shihipar; the company emerged from Y Combinator. Its pitch is using swarms of AI agents to discover materials for more efficient integrated circuits, targeting thermal and energy bottlenecks in chips.

**Links:**

- [TechCrunch — Discovered Materials is playing AI whack-a-mole to hunt cooler chips](https://techcrunch.com/2026/08/10/discovered-materials-is-playing-ai-whack-a-mole-to-hunt-cooler-chips/)

**Commentary:** The agent fundraising story has jumped from “write code” to “mine materials”—compute anxiety is spawning a materials-discovery startup wave.

---

### 11. Edge AI firm Edgify raises ~$9M to push retail computer vision into logistics and manufacturing (Funding)
**Summary:** Israel-based edge AI company Edgify announced an ~$9 million Series A+ backed by Rank Ventures and Mangrove Capital Partners, bringing total funding to ~$25 million. Proceeds will accelerate physical-retail rollout and expand into convenience, QSR, distribution centers, and apparel, with longer-term aims in transport, logistics, manufacturing, and warehousing. Edgify emphasizes linking legacy devices into real-time networks that can operate with less cloud dependence under bandwidth and on-prem cost constraints.

**Links:**

- [Tech.eu — Edgify raises $9M to expand its edge AI platform](https://tech.eu/2026/08/10/edgify-raises-9m-to-expand-its-edge-ai-platform/)

**Commentary:** Edge funding is another reminder that not all inference belongs in the cloud—after retail proving grounds, the next targets are bandwidth-expensive, latency-sensitive industrial floors.

---

### 12. Finster AI wins strategic investment from UBS Investment Bank for AI-native IB workflows (Funding / Fintech)
**Summary:** On August 10, Finster AI—an AI intelligence layer for financial professionals—said UBS Investment Bank is investing strategically as part of its Series B, alongside FactSet. Capital will support enterprise-grade AI infrastructure for investment-banking use cases: workflows, data integrations, and research, analysis, and client-service features designed for regulated environments. UBS framed the stake as interest in tech that can improve efficiency, transparency, and insight generation across advisory and capital-markets work.

**Links:**

- [PR Newswire — Finster AI secures investment from UBS](https://www.prnewswire.com/news-releases/finster-ai-secures-investment-from-ubs-to-advance-ai-innovation-in-investment-banking-302846425.html)

**Commentary:** Wall Street is buying auditable research pipelines, not generic chatbots—regulated industries are equity-binding trusted AI vendors.

---

## Today's Summary

- U.S. House Democrats escalate AI-hack scrutiny by seeking CEO testimony from leading labs, pulling cybersecurity capability debates onto the hearing calendar.
- Meta stakes out local open agents with Muse Glimmer, while DeepSeek-V4-Flash keeps proving China-side price-performance and post-training agent gains on OpenRouter usage.
- China monetization signals harden: Qwen’s open platform wires real services; Doubao’s hotel channel starts ~12% commissions; Unitree’s IPO subscription overlaps DeepSeek’s locked strategic stake.
- Hardware and capital lean into physical AI—Sony–TSMC’s trillion-yen-class sensor plan, plus materials-discovery and edge-retail funding rounds.

**Daily Framing:** A dual-track day of regulatory accountability and on-device/on-the-ground monetization—Congress wants CEOs on the record while open local models and chat-entry take rates push agents from demos toward checkout and the factory floor.

---

*This digest is compiled from real-time search results and is for reference only.*
