import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { getAIConfig, searchLectures } from "../../index";
import { loadMeditationCorpus, type MeditationCorpusEntry } from "./corpus";
import type { MusicPromptParameters } from "../../utils/meditation/generate-music";
import { AUDIO_CONFIG } from "../../config/audio";

export class MeditationGeneratorAgent {
  private openrouter: any;

  constructor() {
    const config = getAIConfig();
    this.openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey || process.env.OPENROUTER_API_KEY!,
    });
  }

  async generate(topic: string, duration: number) {
    console.log(
      `☠️ Initiating ${duration}-minute ritual transmission: ${topic}`,
    );

    console.log(`🌙 Channeling the meditation corpus from the void...`);
    const corpus = await loadMeditationCorpus();
    console.log(`📿 Absorbed ${corpus.length} sacred transmissions`);

    console.log(`👁️ Scanning the akashic records for: ${topic}`);
    let knowledge = "";
    try {
      const config = getAIConfig();
      const results = await searchLectures(
        topic,
        20,
        config.googleGenerativeAIApiKey!,
      );

      knowledge = results.map((r) => r.text).join("\n\n");
      console.log(
        `🔥 Retrieved ${results.length} fragments of forbidden wisdom`,
      );
    } catch (error) {
      console.error("⚠️ The akashic records remain silent:", error);
      knowledge = "Channeling from the primordial void...";
    }

    console.log(`🕉️ Weaving sacred utterances with divine silence...`);
    // Check if we're using v3 for emotion tags
    const useEmotionTags = AUDIO_CONFIG.ttsModel === "eleven_v3";
    console.log(`🎭 Using ${AUDIO_CONFIG.ttsModel} model ${useEmotionTags ? 'with emotion tags' : 'without emotion tags'}`);
    
    const meditationText = await this.createMeditationText(
      topic,
      duration,
      corpus.slice(0, 10),
      knowledge,
      useEmotionTags,
    );

    console.log(
      `🎭 Divining the sonic landscape from the meditation's essence...`,
    );
    const musicParameters = await this.generateMusicParameters(
      topic,
      knowledge,
      meditationText,
    );

    const result = {
      text: meditationText,
      topic,
      duration,
      timestamp: new Date().toISOString(),
      musicParameters,
    };

    console.log(`⚡ The ritual is complete!`);
    console.log(`🗿 Sacred text manifested (${meditationText.length} glyphs):`);
    console.log("🔺".repeat(25));
    console.log(meditationText);
    console.log("🔻".repeat(25));
    console.log(`⏳ Temporal vessel: ${duration} minutes | Focus: "${topic}"`);

    return result;
  }

  private async createMeditationText(
    topic: string,
    duration: number,
    examples: MeditationCorpusEntry[],
    knowledge: string,
    useEmotionTags: boolean = true, // Default to v3 alpha with emotions
  ): Promise<string> {
    const examplesJson = JSON.stringify(examples, null, 2);

    // Calculate target word count based on duration
    // Average speaking rate: ~130 words per minute for slow, meditative speech
    // With pauses, effective rate is ~100 words per minute
    const targetWordCount = duration * 100;
    const maxWordCount = targetWordCount + 50;

    // Build output section based on model capabilities
    const outputSection = useEmotionTags
      ? `<output>
Write the meditation text with <break time="X.Xs" /> tags for pauses AND [emotion] tags for vocal expression.

EMOTION TAGS (use these to guide the voice):
- [calm] or [soothing] - for general meditation tone
- [whispers] - for intimate, gentle guidance
- [softly] - for tender moments
- [compassionate] - for loving-kindness sections
- [powerful] - for empowerment/energy work
- [mysterious] - for esoteric/tantric content
- [sighs] - for release moments (use sparingly, creates actual sigh sound)
- AVOID [breathes deeply] - it creates overlapping breath sounds

Example: "[calm] Close your eyes. <break time="2.5s" /> [whispers] Feel your body settling into stillness. <break time="1.8s" /> [softly] Take a deep breath — <break time="0.8s" />"

CRITICAL:
- Output ONLY plain text with break tags and emotion tags. NO markdown, NO asterisks, NO formatting, NO titles.
- MUST BE ${targetWordCount}-${maxWordCount} WORDS TOTAL for a ${duration}-minute meditation
- Use emotion tags naturally throughout to enhance the meditation experience
- When referencing chakra locations, naturally include the Sanskrit name:
  * If mentioning "root" or "base of spine" → add "Mooladhara"
  * If mentioning "sacral" or "below the navel" → add "Swadhisthana"
  * If mentioning "solar plexus" or "navel" → add "Manipura"
  * If mentioning "heart" or "heart center" → add "Anahata"
  * If mentioning "throat" → add "Vishuddhi"
  * If mentioning "third eye" or "between eyebrows" → add "Ajna"
  * If mentioning "crown" or "top of head" → add "Sahasrara"
  Example: "[softly] Feel the energy at your heart center, the seat of Anahata"
</output>`
      : `<output>
Write the meditation text with <break time="X.Xs" /> tags embedded for pauses, where X.X is seconds.
Add breaks liberally - between sentences, after phrases, wherever the meditation needs to breathe.

CRITICAL:
- Output ONLY plain text with break tags. NO markdown, NO asterisks, NO formatting, NO titles.
- MUST BE ${targetWordCount}-${maxWordCount} WORDS TOTAL for a ${duration}-minute meditation
- When referencing chakra locations, naturally include the Sanskrit name:
  * If mentioning "root" or "base of spine" → add "Mooladhara"
  * If mentioning "sacral" or "below the navel" → add "Swadhisthana"
  * If mentioning "solar plexus" or "navel" → add "Manipura"
  * If mentioning "heart" or "heart center" → add "Anahata"
  * If mentioning "throat" → add "Vishuddhi"
  * If mentioning "third eye" or "between eyebrows" → add "Ajna"
  * If mentioning "crown" or "top of head" → add "Sahasrara"
  Example: "Feel the energy at your heart center, the seat of Anahata"

Example: "Close your eyes. <break time="2.5s" /> Feel your body settling. <break time="1.8s" /> Take a deep breath — <break time="0.8s" /> breathing from your belly <break time="1.2s" /> up to your chest. <break time="4s" />"
</output>`;

    const prompt = `You are a master meditation creator, deeply experienced in tantric and yogic traditions. I'm going to give you examples of meditations, relevant knowledge, and the meditation you need to create.

<style>
Study how these meditations flow, their pacing, and natural pause patterns. Notice how the example meditations use silence. Absorb their natural rhythm and pacing. Let the pauses breathe organically with the meditation's flow.
</style>

<example_meditations>
${examplesJson}
</example_meditations>

<task>
Create EXACTLY a ${duration}-minute meditation on: "${topic}"

DURATION REQUIREMENTS:
- Target length: ${targetWordCount} words (MAXIMUM ${maxWordCount} words)
- This is a ${duration}-minute meditation when spoken slowly with pauses
- DO NOT exceed ${maxWordCount} words under any circumstances
- Keep it concise and focused

Here's relevant knowledge about the topic:
<relevant_knowledge>
${knowledge}
</relevant_knowledge>
</task>

${outputSection}`;

    const { text } = await generateText({
      model: this.openrouter("anthropic/claude-sonnet-4"),
      prompt,
    });

    console.log(`💀 Transmission received (${text.length} runes):`);
    console.log("☠️".repeat(25));
    console.log(text);
    console.log("☠️".repeat(25));
    return text;
  }

  private async generateMusicParameters(
    topic: string,
    knowledge: string,
    meditationText: string,
  ): Promise<MusicPromptParameters> {
    const prompt = `Generate a music prompt for ElevenLabs Music API based on the meditation content.

EXAMPLES (following ElevenLabs format):

Topic: "Ucchista Ganapati"
Meditation excerpt: "Feel the nuclear fire of transformation burning away all that is stale..."
Music prompt: "Dark nuclear ambient meditation soundtrack. Distorted synthesizers, industrial drones, metallic textures. Minor key, beatless, 5 minutes. Instrumental only. Confrontational and alchemical atmosphere."

Topic: "Breath Awareness"
Meditation excerpt: "Follow the natural rhythm of your breath, feeling it flow..."
Music prompt: "Deep flowing ambient meditation. Ethereal pads, singing bowls, subtle wind textures. Minor key, beatless, 5 minutes. Instrumental only. Expansive and calming atmosphere."

Topic: "Shadow Work"
Meditation excerpt: "Descend into the darkness within, confronting what has been hidden..."
Music prompt: "Haunting dark ambient introspection. Reversed sounds, sub-bass drones, dissonant harmonics. Minor key, beatless, 5 minutes. Instrumental only. Psychological depth atmosphere."

NOW GENERATE FOR:

Topic: "${topic}"
Meditation excerpt: "${meditationText.substring(0, 500)}..."

Based on the actual content and tone, generate a concise music prompt following this format:
[Mood descriptors] [genre/style]. [Instruments/textures]. [Key], beatless, [duration]. Instrumental only. [Atmosphere].

Keep it under 50 words. Focus on what TO include, not what to avoid.
Output ONLY the music prompt text:`;

    try {
      const { text: musicPrompt } = await generateText({
        model: this.openrouter("anthropic/claude-sonnet-4"),
        prompt,
        temperature: 0.7,
      });

      console.log(
        `🎼 Generated music prompt: ${musicPrompt.substring(0, 200)}...`,
      );

      const moodMatch = musicPrompt.match(
        /Create a ([^instrumental]+) instrumental/,
      );
      const mood = moodMatch ? moodMatch[1].trim() : "dark, meditative";

      const instrumentsMatch = musicPrompt.match(/Features: ([^.]+)\./);
      const instruments = instrumentsMatch
        ? instrumentsMatch[1].split(",").map((i) => i.trim())
        : ["layered synthesizers", "ambient drones"];

      const atmosphereMatch = musicPrompt.match(
        /Create a ([^atmosphere]+) atmosphere/,
      );
      const atmosphere = atmosphereMatch
        ? atmosphereMatch[1].trim()
        : "hypnotic and deep";

      const avoidMatch = musicPrompt.match(/Avoid: ([^.]+)\./);
      const avoidElements = avoidMatch
        ? avoidMatch[1].split(",").map((a) => a.trim())
        : ["percussion", "vocals", "sudden changes"];

      const parameters: MusicPromptParameters = {
        mood,
        key: "minor",
        instruments,
        tempo: "beatless",
        atmosphere,
        topic: topic,
        avoidElements,
      };

      console.log(`🌑 Extracted parameters:`, parameters);
      return parameters;
    } catch (error) {
      console.error("Failed to generate music parameters:", error);

      return {
        mood: "dark, meditative, ambient, introspective",
        key: "minor",
        instruments: [
          "layered synthesizers",
          "ambient drones",
          "subtle textures",
        ],
        tempo: "beatless",
        atmosphere: "hypnotic and deep",
        topic: topic,
        avoidElements: ["percussion", "vocals", "sudden changes"],
      };
    }
  }
}
