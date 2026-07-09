# Research Resources for MindProtocol's Prompt Generator Model

*Compiled to support development of the AI journaling-prompt generator described in the MindProtocol v2 Concept Document. Organized by the themes the app itself identifies as its scientific foundation, plus the applied NLP/ML literature needed to actually build the generator.*

---

## 1. Neuroscience Foundation — Affect Labeling & the Amygdala–PFC Dynamic

This is the mechanism MindProtocol claims every session activates. These sources are the primary evidence base and should inform *what the prompt is trying to do neurologically*, not just the marketing copy.

- **Lieberman, M. D., Eisenberger, N. I., Crockett, M. J., Tom, S. M., Pfeifer, J. H., & Way, B. M. (2007). "Putting Feelings Into Words: Affect Labeling Disrupts Amygdala Activity in Response to Affective Stimuli." *Psychological Science*, 18(5), 421–428.** https://sanlab.psych.ucla.edu/wp-content/uploads/sites/31/2015/05/Lieberman_AL-2007.pdf
  The foundational fMRI study behind the app's "affect labeling" claim. Labeling an emotion in words reduced amygdala reactivity and increased right ventrolateral prefrontal cortex (RVLPFC) activity, and the two were inversely correlated. **Relevance:** This is the direct empirical basis for designing prompts that push the user toward specific emotional vocabulary rather than vague mood words — the model should be trained/evaluated on whether it elicits precise labeling.

- **Torre, J. B., & Lieberman, M. D. (2018). "Putting Feelings Into Words: Affect Labeling as Implicit Emotion Regulation." *Emotion Review*.** https://www.researchgate.net/publication/323882761
  A broader review (and later systematic reviews building on it) synthesizing dozens of studies on affect labeling as a form of *implicit* (low-effort, non-strategic) emotion regulation. **Relevance:** Useful for justifying why the prompt generator shouldn't overtly instruct "try to feel better" — implicit labeling works partly because it doesn't require explicit regulatory effort.

- **Niles, A. N., Craske, M. G., Lieberman, M. D., & Hur, C. (2015). "Affect labeling enhances exposure effectiveness for public speaking anxiety." *Behaviour Research and Therapy*, 68, 27–36.**
  Shows affect labeling improves outcomes specifically in an applied anxiety-exposure context, not just the lab. **Relevance:** Supports extending labeling-based prompts beyond generic wellness use into specific anxiety-provoking scenarios the diagnostic phase surfaces.

---

## 2. Expressive Writing as a Therapeutic Mechanism

The evidence base for the "70% journaling phase" — and importantly, the more recent literature on *why effects are inconsistent*, which is directly useful for prompt design.

- **Pennebaker, J. W., & Beall, S. K. (1986). "Confronting a traumatic event: Toward an understanding of inhibition and disease." *Journal of Abnormal Psychology*, 95(3), 274–281.**
  The original expressive-writing paradigm (write about deepest thoughts/feelings, 15–20 min, several days). Cited throughout the concept document; worth reading directly rather than via secondary sources.

- **Smyth, J. M. (1998). Meta-analysis of 13 studies, reported in "Health effects of expressive writing on stressful or traumatic experiences." *PMC*.** https://pmc.ncbi.nlm.nih.gov/articles/PMC2736499/
  Established effect size d = 0.47 for expressive writing on health outcomes. **Relevance:** Gives you a quantitative benchmark to compare against when validating whether MindProtocol's sessions produce meaningful slider deltas.

- **Frattaroli, J. (2006). Meta-analysis discussed in "Effects of Expressive Writing on Psychological and Physical Health." *PMC*.** https://pmc.ncbi.nlm.nih.gov/articles/PMC3830620/
  A larger, more conservative meta-analysis (400+ studies) found a smaller overall effect (~.075) with high variance by context — writing helps more in some conditions than others. **Relevance:** Important counterweight to the app's confident framing; the "what still needs work" section of the concept doc should cite this kind of variance data.

- **Chasing elusive expressive writing effects: emotion-acceptance instructions and writer engagement improve outcomes. *Frontiers in Psychology* (2023).** https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1192595/full
  Investigates *why* EW effects are hard to replicate, and finds that instructions explicitly encouraging emotional acceptance, plus longer/more engaged writing, improve outcomes. **Relevance:** Directly actionable for prompt engineering — this is evidence that the exact wording of the prompt (not just the topic) changes efficacy, and "essay length" is a usable engagement proxy the app could track.

- **Efficacy of expressive writing versus positive writing: Systematic review and meta-analysis. *PMC* (2023).** https://pmc.ncbi.nlm.nih.gov/articles/PMC10415981/
  Compares classic expressive writing against "positive writing" (benefit-finding) variants; positive writing produced better mood in general populations while expressive writing drove more cognitive change. **Relevance:** Useful evidence for the app's stated tension between "reframing" and "naming" prompt types — suggests the generator may want to branch by whether the goal is mood lift vs. insight.

---

## 3. CBT, Socratic Questioning & Cognitive Reframing

- **Beck, A. T. (1979). *Cognitive Therapy and the Emotional Disorders*.**
  Foundational text on Socratic questioning as a clinical technique — guiding a person to their own insight rather than telling them the answer. This is the theoretical backbone of the app's "self-diagnosis, not AI-diagnosis" design philosophy and is worth reading in the original rather than only via secondary summaries.

- **"The Art of Socratic Inquiry: A Framework for Proactive Template-Guided Therapeutic Conversation Generation." *arXiv* (2026).** https://arxiv.org/pdf/2602.01598
  Proposes a system (SIF) that separates *strategic intent* (what kind of Socratic move to make) from *surface generation* (the actual wording), using a template library and a fine-tuned "Socratic-QA" dataset. **Relevance:** This is close to a direct architectural blueprint for MindProtocol's prompt generator — decoupling "what type of question this should be" (naming / agency / reframing / self-compassion, per the app's own framework) from "how it's phrased" would make the system more controllable and auditable than end-to-end generation.

- **DiaCBT: A Long-Periodic Dialogue Corpus Guided by Cognitive Conceptualization Diagram for CBT-based Psychological Counseling. *arXiv* (2025).** https://arxiv.org/pdf/2509.02999
  A CBT-structured dialogue dataset built around a clinical "cognitive conceptualization diagram," used to train and evaluate counseling-style generation. **Relevance:** A candidate training/fine-tuning resource, or at minimum a model for how to structure a domain-specific dataset if MindProtocol later wants to move beyond prompting a general LLM toward a fine-tuned prompt-generation model.

- **"Feel the Difference? A Comparative Analysis of Emotional Arcs in Real and LLM-Generated CBT Sessions." *arXiv* (2025).** https://arxiv.org/pdf/2508.20764
  Compares real counseling transcripts to LLM-generated synthetic CBT sessions (e.g., the CACTUS dataset) and finds real sessions have more nuanced emotional trajectories. **Relevance:** A caution flag — if MindProtocol is tempted to bootstrap training data by having an LLM simulate journaling sessions, this paper is evidence that synthetic data may miss the emotional realism needed for a good prompt generator, and should be validated against real user writing, not just LLM-generated proxies.

---

## 4. Self-Compassion

- **Neff, K. D. (2003). "Development and validation of a scale to measure self-compassion." *Self and Identity*, 2, 223–250.** (Scale + permissions: https://self-compassion.org/self-compassion-scales-for-researchers/)
  Defines self-compassion as self-kindness, common humanity, and mindfulness (vs. their opposites), and introduces the Self-Compassion Scale (SCS). **Relevance:** The SCS or its short form could double as an optional outcome measure for the monthly dashboard, and its three-component structure maps well onto the "self-compassion over self-critique" prompt category the app describes.

- **Neff, K. D. (2023). "Self-Compassion: Theory, Method, Research, and Intervention." *Annual Review of Psychology*, 74, 193–217.**
  A recent comprehensive review of two decades of self-compassion research, including its distinction from self-esteem and its links to resilience and healthier motivation (without the narcissism/social-comparison downsides of self-esteem). **Relevance:** Good grounding for why the app frames self-compassion prompts as separate from generic "positive thinking."

---

## 5. Habit Formation

- **Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). "How are habits formed: Modelling habit formation in the real world." *European Journal of Social Psychology*, 40(6), 998–1009.** https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674
  Tracked 96 people forming a new daily habit over 12 weeks; median time to 95% automaticity was 66 days (range 18–254), and missing a single day did not meaningfully disrupt the process. **Relevance:** The concept document cites "21–66 days," but the actual finding is a median of 66 days with huge individual variance and a forgiving pattern around missed days — worth correcting in the app's own materials, and directly supports the "no guilt for missed streaks" design decision.

---

## 6. Personalized Prompt Generation & LLM Personalization (core ML literature)

This is the most directly applicable literature for actually *building* the generator — i.e., taking user state (sliders + diagnostic answers) and producing a tailored prompt.

- **Li, C., Zhang, M., Mei, Q., Kong, W., & Bendersky, M. (2023). "Automatic Prompt Rewriting for Personalized Text Generation." Published as "Learning to Rewrite Prompts for Personalized Text Generation," *ACM Web Conference (WWW) 2024*.** https://dl.acm.org/doi/10.1145/3589334.3645408
  Learns to rewrite a generic prompt into a personalized one conditioned on user history/context, rather than hand-crafting personalization rules. **Relevance:** Structurally very close to what MindProtocol needs — a "base" Socratic/reflective prompt template rewritten based on the 30% diagnostic answers and slider state. Could be adapted directly as a two-stage architecture (generic template → personalized rewrite).

- **Salemi, A., Mysore, S., Bendersky, M., & Zamani, H. (2023). "LaMP: When Large Language Models Meet Personalization." *arXiv:2304.11406*.**
  Introduces a benchmark and retrieval-augmented approach for personalizing LLM outputs to individual users. **Relevance:** Useful as an evaluation methodology reference — MindProtocol will eventually need a way to benchmark "how personalized/relevant is this generated prompt," and LaMP's task framing is a reasonable template.

- **Personalization of Large Language Models: A Survey. *arXiv:2411.00027* (2024).**
  A broad survey covering the current landscape of LLM personalization techniques: prompting, retrieval-augmentation, fine-tuning, and user-embedding approaches. **Relevance:** Good starting point for deciding *how* to personalize (RAG over the user's diagnostic answers vs. fine-tuning vs. structured prompting) before committing to an architecture.

- **Doddapaneni, S., Sayana, K., Jash, A., Sodhi, S., & Kuzmin, D. (2024). "User embedding model for personalized language prompting." *arXiv:2401.04858*.**
  Proposes learning a compact embedding of a user (from behavioral/contextual signals) to condition prompt generation, rather than passing raw user text into the context window every time. **Relevance:** Relevant to the app's stated privacy goals — an on-device user-state embedding (built from slider history + diagnostic answers) could personalize prompts without needing to send raw journal text externally.

---

## 7. Controllable & Emotion-Conditioned Text Generation

For controlling *what kind* of prompt gets generated (naming vs. reframing vs. agency vs. self-compassion) rather than leaving it to the model's discretion.

- **"Controllable Text Generation for Large Language Models: A Survey" (IAAR-Shanghai, GitHub-hosted survey with arXiv companion).** https://github.com/iaar-shanghai/ctgsurvey
  A comprehensive, actively maintained survey of methods for constraining LLM output along attributes like emotion, style, or structure (e.g., non-residual prompting, feedback-aware self-training). **Relevance:** Directly useful for implementing the app's "red-listed" prompt framings (Challenge 2 in the concept doc) — controllable generation techniques are how you'd technically enforce "never ask why did you let this happen" as a hard constraint rather than a hope.

- **Zhang, E. H. Q., & Ive, J. (2025). "Context-Emotion Aware Therapeutic Dialogue Generation: A Multi-component Reinforcement Learning Approach to Language Models for Mental Health Support." *arXiv:2511.11884*.**
  Fine-tunes GPT-2 with a custom multi-component reward function (not just BLEU/ROUGE) that scores clinical appropriateness and emotional alignment. **Relevance:** A concrete example of moving past "just prompt a general-purpose LLM" toward a smaller, purpose-built, locally-deployable model — relevant to the app's on-device/privacy-first architecture goal, since GPT-2-scale models can run locally.

---

## 8. AI Safety in Mental-Health Contexts (crisis detection, backfire risk)

The concept document explicitly names "prompt sensitivity and backfire risk" and "crisis detection" as its hardest open problems. This is the most safety-critical part of the literature review and should not be skipped even under hackathon time pressure.

- **"Between Help and Harm: An Evaluation Study of Mental Health Crisis Handling by Large Language Models." *JMIR Mental Health*, 13, e88435 (2026).** https://mental.jmir.org/2026/1/e88435
  Systematically evaluates how current LLMs handle indirect, informational self-harm queries (e.g., asking about specific methods in oblique terms) and finds they frequently fail to detect the sensitivity of such queries, sometimes providing neutral or instructional answers. **Relevance:** This is essentially a pre-built taxonomy and evaluation framework MindProtocol should test its own diagnostic-question pipeline against before shipping the crisis-detection safeguard described in Challenge 2.

- **Suicide- and crisis-risk detection using large language models in mental-health chatbots. *medRxiv* (2026).** https://www.medrxiv.org/content/10.64898/2026.01.12.26343914v1.full
  Argues crisis-risk detection lacks a clean ground truth (clinicians frequently disagree with each other) and should be treated as a real-time, uncertainty-aware safety problem rather than an offline classification task. **Relevance:** Important for setting realistic expectations for the "Design Safeguard 3 — Crisis Detection" feature — a single accuracy number won't capture whether the system is actually safe; the paper's design principles (favor sensitivity, build in escalation paths) are directly applicable.

- **"AI Chatbot Suicide Risk Detection and Response: Human Validation Study of the Open-Source VERA-MH Safety Evaluation." *ScienceDirect* (2026).**
  Introduces VERA-MH, an open-source evaluation framework for rating chatbot safety in mental-health conversations against clinician judgments, tested across multiple current LLMs. **Relevance:** VERA-MH (being open-source) is a plausible off-the-shelf tool to red-team MindProtocol's own generated prompts before launch, rather than building a safety evaluation pipeline from scratch.

- **"Simulating Psychological Risks in Human-AI Interactions." *arXiv:2511.08880* (2025).**
  Analyzes over 150,000 conversation turns across four major LLMs to catalog 15 distinct failure patterns (e.g., empathy without discernment, normalization of concerning behavior) when models interact with users showing signs of acute psychological distress. **Relevance:** The failure-pattern taxonomy is directly reusable as a checklist for red-teaming the "red-listed prompt framings" the concept document calls for.

---

## 9. Digital Mental-Health App Efficacy, Engagement & Retention

Directly relevant to Challenge 3 ("Habit Retention") and to setting realistic expectations for Objective 3 (long-term resilience gains).

- **Linardon, J. et al. "Efficacy of mental health smartphone apps on stress levels: a meta-analysis of RCTs." *Health Psychology Review* (2024).** https://www.tandfonline.com/doi/full/10.1080/17437199.2024.2379784
  Confirms modest but real efficacy of mental-health apps on stress, while flagging that dropout rates in trials range from 0–72%. **Relevance:** A reasonable efficacy benchmark to design the pre/post slider validation against, and a warning that trial-level engagement numbers may not reflect real-world retention.

- **Baumel, A. et al., discussed in "Smartphone apps for depression and anxiety: a systematic review and meta-analysis of techniques to increase engagement." *npj Digital Medicine* (2021).** https://www.nature.com/articles/s41746-021-00386-8
  Real-world usage data show a median 15-day retention of only 3.9% for mental-health apps generally, but apps with dedicated engagement features perform meaningfully better on both retention and clinical outcomes. **Relevance:** This is the sobering baseline MindProtocol's "no-guilt streak tracker + fixed-time anchor" design is implicitly trying to beat — worth citing directly in the app's own Challenge 3 section as the scale of the problem.

- **"A meta-analysis of persuasive design, engagement, and efficacy in 92 RCTs of mental health apps." *npj Digital Medicine* (2025).** https://www.nature.com/articles/s41746-025-01567-5
  Analyzes which specific persuasive-design techniques (reminders, gamification, tailoring) actually correlate with better clinical outcomes across 92 trials, not just engagement metrics. **Relevance:** A practical design reference for choosing which retention features (of the many possible) are evidence-backed rather than just intuitively appealing.

---

## 10. Background Audio / Binaural Beats

Lower priority for the "prompt generator model" itself, but relevant to the session-design claims in Part 2.

- **"Is non-clinical, personal use of binaural beats audio an effective stress-management strategy? A systematic review of RCTs." *Taylor & Francis* (2024).** https://www.tandfonline.com/doi/full/10.1080/18387357.2024.2374759
  A systematic review specifically of non-clinical, personal-use binaural beats for stress (as opposed to clinical/perioperative settings), finding general support but with call for more rigorous non-clinical trials. **Relevance:** More applicable to MindProtocol's actual use case (a person using the app on their own) than the many perioperative-anxiety RCTs, which dominate this literature but describe a different context.

---

## Suggested Priority Reading Order

1. Lieberman et al. (2007) + Pennebaker & Beall (1986) — the two mechanisms everything else builds on.
2. "The Art of Socratic Inquiry" (2026) — closest existing architecture to what you're building.
3. "Between Help and Harm" (2026) + VERA-MH — non-negotiable before any real users touch the diagnostic/journaling flow.
4. Li et al., "Learning to Rewrite Prompts for Personalized Text Generation" (2024) — most direct technical template for the generator itself.
5. Lally et al. (2010) and the Baumel et al. retention figures — recalibrate the app's habit/retention claims against real data.

*Note: several 2025–2026 papers above (e.g., the JMIR and medRxiv crisis-detection studies, the VERA-MH evaluation, and the Socratic Inquiry framework) are very recent and represent an active, fast-moving research area — worth a fresh search closer to actual model training time, since this space is evolving quickly.*
