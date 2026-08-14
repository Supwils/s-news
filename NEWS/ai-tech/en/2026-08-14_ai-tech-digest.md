# Aug 14, 2026 · AI & Tech Daily Digest

> Highlights in AI and technology for August 14, 2026, with summaries, links, and brief commentary.

---

## I. Policy and Regulation

### 1. Sen. Banks asks the White House to subsidize U.S. open-weight models and curb China dependence (Policy)

**Summary:** Reuters reported on August 14 that Republican Senator Jim Banks released a Friday letter to Trump economic adviser Christopher Phelan, asking the administration to design incentives for U.S. firms to build open-weight models, options to “limit dependence” on Chinese open-weight systems, and tighter barriers on Chinese labs using American chips. He wrote that Washington cannot let Chinese open models “burrow into the global economy only to be weaponized, like rare earths.” The administration currently exempts U.S. open-weight models such as Meta’s Llama from stricter voluntary safety testing; Nvidia and Meta urged policymakers in July not to restrict open weights, while Anthropic CEO Dario Amodei has warned they are harder to monitor.

**Links:**

- [The News International — Trump’s AI policy sparks fierce debate as lawmakers clash over open-weight models](https://www.thenews.com.pk/latest/1412296-trumps-ai-policy-sparks-fierce-debate-as-lawmakers-clash-over-open-weight-models)
- [Traders Union — U.S. senator urges incentives for open-weight AI models amid China security concerns](https://tradersunion.com/news/financial-news/show/2991424-us-senator-ai-open-weight-incentives/)

**Commentary:** Washington wants both an open-weight exemption to compete with China and chip controls to starve Chinese open weights—the live question is whether the next instrument is a subsidy or an export rule.

---

### 2. Vietnam bars state agencies from uploading classified files to public AI platforms (Regulation)

**Summary:** Vietnam’s Ministry of Science and Technology instructed ministries, judicial bodies, the National Assembly, the Fatherland Front, and provincial governments not to upload state-secret documents to public AI platforms while using digital tools and AI to review legal texts, and to follow secrecy, cybersecurity, and national AI ethics rules. Reporting says only approved platforms on domestic infrastructure with Vietnamese-owned language models may be used for official legal review; public commercial tools from OpenAI, Anthropic, Google, and Microsoft are excluded from classified material. Vietnam’s AI law took effect in March 2026 with a 12-month compliance window for foreign systems; the high-risk AI list (Decision 33/2026/QD-TTg) takes effect on August 15.

**Links:**

- [Vietnam.vn / Báo Đầu tư — Warning against uploading confidential documents to public AI platforms](https://www.vietnam.vn/en/canh-bao-viec-dua-tai-lieu-mat-len-cac-nen-tang-ai-cong-cong)
- [Vietnam Ministry of Science and Technology — High-risk AI systems list](https://mst.gov.vn/ban-hanh-danh-muc-he-thong-tri-tue-nhan-tao-co-rui-ro-cao-197260708150409012.htm)

**Commentary:** Southeast Asia is splitting “use AI” from “feed state secrets to a public model”—the first gate for government digitization is data residency, not benchmark rank.

---

## II. Models and Products

### 3. Z.ai ships GLM-5.3: post-training lifts coding and cyber skills, open weights delayed about two weeks (Product)

**Summary:** Z.ai released GLM-5.3 on August 14, saying it shares GLM-5.2’s base and that all gains come from post-training with far more long-horizon environments. The company reports about a 50% lift on its in-house Code Bench versus 5.2, Terminal-Bench 3.0 from 4.6 to 28.3, and DeepSWE v1.1 from 46.2 to 66.9; CyberGym is reported at 84.5%, slightly above Mythos 5 at 83.8% and GPT-5.6 Sol at 83.6% (vendor figures, not independently reproduced). With Chinese security teams and universities, it says models have found 2,436 bugs in 269 real projects since 5.2, including 1,097 critical or high. Because cyber capability “grew faster than planned,” weights are slated about two weeks later (around August 28); GLM Coding Plan and ZCode access is live now.

**Links:**

- [Z.ai — GLM-5.3: Frontier Coding with Emergent Cyber Capabilities](https://z.ai/blog/glm-5.3)
- [Sina Finance — Zhipu releases GLM 5.3](https://finance.sina.com.cn/jjxw/2026-08-14/doc-ininhhrs2643963.shtml)

**Commentary:** An open-weight family is being held back for the first time because it got too good at finding bugs—coding agents and exploit chains are now separated mainly by a safety calendar.

---

### 4. Reuters: Apple trained a China-specific LLM with Alibaba’s help (Product / Region)

**Summary:** Reuters reported on August 14, citing three people familiar with the matter, that Apple has trained a large language model specifically for China with support from Alibaba, a shift from relying mainly on local third-party models. Apple Intelligence is expected to launch in China in coming months via an iOS update after CAC generative-AI registration last month. Existing plans still fold Alibaba’s Qwen into the China SKU and add Baidu technology; the in-house model is meant to give Apple more control over AI-equipped devices sold there. Joe Tsai publicly confirmed an Apple–Alibaba AI tie-up in February 2025. Apple and Alibaba declined to comment.

**Links:**

- [Reuters — Apple trains its own AI model for China market with Alibaba's support, sources say](https://www.reuters.com/business/retail-consumer/apple-trains-its-own-ai-model-china-market-with-alibabas-support-sources-say-2026-08-14/)
- [The Hindu BusinessLine — Apple trains its own AI model for China market with Alibaba’s support](https://www.thehindubusinessline.com/info-tech/apple-trains-its-own-ai-model-for-china-market-with-alibabas-support/article71344084.ece)

**Commentary:** Clearing a filing is not the same as handing over the stack—Apple wants its own weights behind the firewall, with Alibaba and Baidu remaining the local compliance and cloud interface.

---

### 5. DeepSeek open-sources agent runtime Harness preview and moves ahead with price hikes (Product)

**Summary:** 21st Century Business Herald reported on August 14 that DeepSeek open-sourced DeepSeek Harness (DSH) developer preview v0.1 under MIT in the early hours of August 13, a shift from selling models toward delivering workflows. The same day it fully announced V4-Pro-0813 on web, app, and API after a silent rollout and a withdrawn homepage notice. Sina Finance said parts of a new price schedule take effect on August 17, with the steepest increases on peak-hour cached-input tiers; DeepSeek did not explain service instability around the launch. Alibaba, Tencent, and ByteDance are also pouring resources into office agents.

**Links:**

- [21jingji — DeepSeek open-sources its agent “hands and feet”](https://m.21jingji.com/article/20260814/herald/4a601c2be862f426e52543baede4af4c.html)
- [Sina Finance — DeepSeek’s new version finally goes live](https://finance.sina.com.cn/wm/2026-08-14/doc-ininhaiq4197039.shtml)

**Commentary:** Token dumping is hitting a ceiling; the next contest is who can run agents reliably—Harness is a bid for the runtime standard, and the price hike is how “selling outcomes” gets a margin.

---

### 6. X open-sources For You ranking code and adds a visibility self-check (Product)

**Summary:** X said on August 13 it will publish source for the For You timeline and core ranking engine on GitHub under Apache v2, including model configuration, filters, and weighting parameters, expanding prior open-source code roughly 10–15 times. VP of Product Keith Coleman told TechCrunch that outside researchers could already run the scorer off-platform; developers may file pull requests for X engineers to consider. A settings “Under the Hood” tool lets users with 10 or more posts in the past month download a JSON summary of labels on their account or posts. Grok-based violation predictors are withheld to limit evasion. The `xai-org/x-algorithm` repo documents an August 13 update.

**Links:**

- [TechCrunch — X open sources its ranking algorithm](https://techcrunch.com/2026/08/13/x-open-sources-its-ranking-algorithm-letting-users-see-if-theyve-been-shadowbanned/)
- [GitHub — xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)

**Commentary:** What is public is the ranking formula; what stays closed is the Grok enforcement layer—transparency is being scoped as auditable recommendation, not a copy of the whole trust-and-safety stack.

---

## III. Security and Supply Chain

### 7. LiteLLM supply-chain haul analyzed at 153GB; many stolen keys still work five months later (Security)

**Summary:** Hudson Rock said it fully analyzed a 153GB RAR archive (433,909 files) stolen in March’s LiteLLM supply-chain attack and attributed 118,829 CI/CD runner dumps to 2,488 corporate domains, naming NVIDIA, Volkswagen, Microsoft, FedEx, S&P Global, Cisco, Deloitte, and Siemens among others. Help Net Security reported on August 13 that TeamPCP poisoned Trivy, stole LiteLLM’s PyPI token, and published malicious 1.82.7 / 1.82.8 on March 24. Researcher Kevin Beaumont wrote on Mastodon the same day that at one large U.S. tech firm that claimed full rotation, “almost every” stolen credential still worked. Malicious packages sat on PyPI for about 40 minutes; the damage window runs from install date and, for many named domains, is still open.

**Links:**

- [Help Net Security — 153GB of stolen credentials surface after LiteLLM supply chain attack](https://www.helpnetsecurity.com/2026/08/13/litellm-breach-stolen-credentials-leak/)
- [TechTimes — LiteLLM Supply Chain Hack Hit 2,488 Firms; Stolen Keys Still Work Five Months On](https://www.techtimes.com/articles/324451/20260814/litellm-supply-chain-hack-hit-2488-firms-stolen-keys-still-work-five-months.htm)

**Commentary:** After an AI gateway is compromised, the real incident clock is not the 40 minutes a package stayed up—it is every cloud key still sitting in CI.

---

## IV. Autonomy, Capital, and Companies

### 8. Pony.ai and Uber expand to more than 2,000 robotaxis in Europe (Autonomy)

**Summary:** The companies announced on August 14 an expanded partnership to deploy more than 2,000 Pony.ai robotaxis in Europe, with Middle East plans included. The deal builds on commercial service in Zagreb (coming to Uber) plus four still-unnamed European cities, with details in phases. Pony.ai supplies autonomy, Uber the ride-hailing platform, and local partners may own and operate fleets (Verne in Zagreb). CNBC noted WeRide’s planned Madrid pilot with Uber later this year and Uber Japan’s Tokyo test-ops deal; Waymo’s global fleet is about 5,000 vehicles, with London testing. No city names or go-live dates were given.

**Links:**

- [Uber IR — Pony.ai and Uber Expand Partnership to Deploy Over 2,000 Robotaxis in Europe](https://investor.uber.com/news-events/news/press-release-details/2026/Pony-ai-and-Uber-Expand-Partnership-to-Deploy-Over-2000-Robotaxis-in-Europe/default.aspx)
- [CNBC — Uber partners with China's Pony.ai for 2,000 robotaxis in Europe](https://www.cnbc.com/2026/08/14/uber-partners-with-chinas-ponyai-for-2000-robotaxis-in-europe.html)

**Commentary:** Uber is selling itself as the OS for autonomy while Chinese fleets ride its demand into Europe—mapping data and regulators will decide this deal before the 2,000-vehicle headline does.

---

### 9. Databricks closes $5B at a $190B valuation; Q2 run-rate tops $7B (Funding)

**Summary:** Databricks said on August 13 it closed a $5 billion strategic round at a $190 billion valuation, led by Coatue with Blackstone, MGX, T. Rowe Price-advised accounts, and new investor Sixth Street Growth. It reported more than 80% year-over-year Q2 growth and a revenue run-rate above $7 billion; Lakebase, its serverless Postgres for agents, has passed a $100 million run-rate. Proceeds go to Lakebase, Genie (data-to-action coworker), and Unity AI Gateway for multi-model governance and cost control. The valuation is up about 42% from roughly $134 billion in February. CEO Ali Ghodsi told TechCrunch a small set of investors offered about $15 billion of demand against a planned raise near $1 billion.

**Links:**

- [Databricks — Grows >80% YoY, Surpasses $7B Revenue Run-Rate](https://www.databricks.com/company/newsroom/press-releases/databricks-grows-80-yoy-surpasses-7b-revenue-run-rate-scales)
- [TechCrunch — Databricks wanted to raise $1B, investors wanted $15B](https://techcrunch.com/2026/08/13/databricks-wanted-to-raise-1b-investors-wanted-15b-it-settled-on-5b-at-a-190b-valuation/)

**Commentary:** When enterprises buy agents as production lines, the data platform can collect cash before the model lab does—$190 billion prices a bundle of governance, database, and coworker software, and another delay of the IPO.

---

### 10. OpenAI replaces CRO Denise Dresser with former Wiz president Dali Rajic (Company)

**Summary:** OpenAI said on August 13 that Chief Revenue Officer Denise Dresser is leaving “to pursue other opportunities,” replaced by Dali Rajic, former president and COO of Wiz, which Google bought for $32 billion. Dresser joined from Salesforce in December 2025 and lasted about nine months; President Greg Brockman said Rajic will turn what OpenAI has learned into repeatable enterprise execution. It is the second senior exit in days after COO Brad Lightcap said Tuesday he would start something new; product and business chief Fidji Simo stepped down last month after a severe illness flare. OpenAI says products reach more than one billion weekly users and about two million businesses; it confidentially filed with the SEC in June and this week completed a roughly $7 billion employee tender.

**Links:**

- [TechCrunch — OpenAI hires new CRO as executive shake-up continues](https://techcrunch.com/2026/08/13/openai-hires-new-cro-as-executive-shake-up-continues/)
- [CNBC — OpenAI revenue chief Denise Dresser leaving, second exec in days](https://www.cnbc.com/2026/08/13/openai-denise-dresser-executive-exits.html)

**Commentary:** Swapping a recently hired revenue chief before an IPO is a signal that enterprise bookings worry the board more than the next model drop—the new CRO’s job is to turn a billion weekly users into auditable recurring revenue.

---

### 11. a16z leads Vals AI’s $40M Series A at a $400M valuation (Funding)

**Summary:** San Francisco evaluation startup Vals AI raised $40 million Series A at a $400 million valuation, led by Andreessen Horowitz, with 8VC, Pear VC, and Bloomberg Beta returning and HRT Ventures and Next Ladder Ventures joining. The firm says its evals appear in model cards from OpenAI, Anthropic, Google, Meta, and xAI; revenue is up eightfold versus all of 2025, customers have doubled, and headcount tripled in six months. It launched Vals Smith (coding benchmarks from a customer’s GitHub), frontier-risk suites covering cybersecurity, mental health, and AI safety, and Vals Index 2.0 to extend measurement across more of the economy. Seed funding was about $5 million.

**Links:**

- [Tech Funding News — a16z leads $40M Vals AI round at $400M valuation](https://techfundingnews.com/a16z-leads-40m-vals-ai-round-at-400m-valuation-to-test-ai-on-real-world-tasks/)
- [Crypto Briefing — Vals AI raises $40 million at $400 million valuation in a16z-led round](https://cryptobriefing.com/vals-ai-40m-series-a-a16z/)

**Commentary:** When model launches outrun benchmarks, the independent scorekeeper becomes infrastructure—whoever pays for the eval holds a veto inside the procurement packet.

---

## Today's Summary

- Open weights are being written as a national-security instrument: a U.S. senator wants domestic subsidies and chip curbs, while Vietnam bars classified files from public models.
- The model race has moved to coding agents and runtimes: Z.ai delayed GLM-5.3 weights over cyber capability; DeepSeek is grabbing the workflow layer with Harness and raising prices.
- Security incidents last longer than the news cycle: LiteLLM’s stolen keys still work five months on, showing AI supply-chain “remediation” often stopped at a rotation announcement.
- Capital and deployment are running in parallel: Databricks at $190 billion is doubling down on the enterprise agent stack; Uber is taking a Chinese robotaxi scale story into Europe; Apple is training in China; OpenAI is swapping its revenue chief in the IPO window.

**Daily Framing:** This was a day when open-weight politics, offensive coding models, and enterprise-agent capital stacked on the same calendar—who may open-source, who can find bugs, and who can sell fleets and data platforms into production mattered more than another chat model.

---

*This digest is compiled from real-time search results and is for reference only.*
