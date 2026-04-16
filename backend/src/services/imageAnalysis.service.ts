import sharp from 'sharp';

type DetectedTag = {
  tag: string;
  confidence: number;
};

const MIN_CONFIDENCE = 0.75;
const MAX_TAGS = 8;

const normalizeTag = (value: string): string => value.toLowerCase().trim();

const scoreFromHue = (hue: number): DetectedTag[] => {
  if (hue <= 25 || hue >= 335) {
    return [
      { tag: 'warm tones', confidence: 0.84 },
      { tag: 'sunset vibe', confidence: 0.78 },
    ];
  }

  if (hue < 70) {
    return [
      { tag: 'golden palette', confidence: 0.8 },
      { tag: 'sunlit scene', confidence: 0.76 },
    ];
  }

  if (hue < 170) {
    return [
      { tag: 'nature tones', confidence: 0.82 },
      { tag: 'fresh greens', confidence: 0.77 },
    ];
  }

  if (hue < 260) {
    return [
      { tag: 'blue palette', confidence: 0.83 },
      { tag: 'cool atmosphere', confidence: 0.79 },
    ];
  }

  return [
    { tag: 'moody tones', confidence: 0.8 },
    { tag: 'city night', confidence: 0.76 },
  ];
};

const detectLightnessTags = (brightness: number): DetectedTag[] => {
  if (brightness > 0.75) {
    return [{ tag: 'bright scene', confidence: 0.81 }];
  }

  if (brightness < 0.32) {
    return [{ tag: 'low light', confidence: 0.82 }];
  }

  return [{ tag: 'balanced exposure', confidence: 0.76 }];
};

const detectSaturationTags = (saturation: number): DetectedTag[] => {
  if (saturation > 0.65) {
    return [{ tag: 'vibrant colors', confidence: 0.8 }];
  }

  if (saturation < 0.24) {
    return [{ tag: 'muted palette', confidence: 0.78 }];
  }

  return [];
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case nr:
      h = (ng - nb) / d + (ng < nb ? 6 : 0);
      break;
    case ng:
      h = (nb - nr) / d + 2;
      break;
    default:
      h = (nr - ng) / d + 4;
      break;
  }

  h /= 6;

  return {
    h: h * 360,
    s,
    l,
  };
};

const parseClarifaiTags = (data: unknown): DetectedTag[] => {
  const concepts = ((data as { outputs?: Array<{ data?: { concepts?: Array<{ name?: string; value?: number }> } }> })
    ?.outputs?.[0]?.data?.concepts ?? []) as Array<{ name?: string; value?: number }>;

  return concepts
    .filter((concept) => typeof concept.name === 'string' && typeof concept.value === 'number')
    .map((concept) => ({
      tag: normalizeTag(String(concept.name)),
      confidence: Number(concept.value),
    }))
    .filter((item) => item.confidence >= MIN_CONFIDENCE)
    .slice(0, MAX_TAGS);
};

const analyzeWithClarifai = async (imageBuffer: Buffer): Promise<DetectedTag[]> => {
  const apiKey = process.env.CLARIFAI_API_KEY?.trim();

  if (!apiKey) {
    return [];
  }

  const modelId = process.env.CLARIFAI_MODEL_ID?.trim() || 'general-image-recognition';
  const userId = process.env.CLARIFAI_USER_ID?.trim() || 'clarifai';
  const appId = process.env.CLARIFAI_APP_ID?.trim() || 'main';

  const response = await fetch(
    `https://api.clarifai.com/v2/users/${encodeURIComponent(userId)}/apps/${encodeURIComponent(appId)}/models/${encodeURIComponent(modelId)}/outputs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [
          {
            data: {
              image: {
                base64: imageBuffer.toString('base64'),
              },
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as unknown;
  return parseClarifaiTags(payload);
};

const analyzeWithColorFallback = async (imageBuffer: Buffer): Promise<DetectedTag[]> => {
  const stats = await sharp(imageBuffer).stats();

  const r = stats.channels[0]?.mean ?? 0;
  const g = stats.channels[1]?.mean ?? 0;
  const b = stats.channels[2]?.mean ?? 0;

  const hsl = rgbToHsl(r, g, b);

  const tags = [
    ...scoreFromHue(hsl.h),
    ...detectLightnessTags(hsl.l),
    ...detectSaturationTags(hsl.s),
    { tag: 'ai-assisted', confidence: 0.99 },
  ];

  return tags
    .filter((item) => item.confidence >= MIN_CONFIDENCE)
    .slice(0, MAX_TAGS)
    .map((item) => ({
      ...item,
      tag: normalizeTag(item.tag),
    }));
};

export const analyzeImage = async (imageBuffer: Buffer): Promise<DetectedTag[]> => {
  const clarifaiTags = await analyzeWithClarifai(imageBuffer);

  if (clarifaiTags.length > 0) {
    return clarifaiTags.slice(0, MAX_TAGS);
  }

  return analyzeWithColorFallback(imageBuffer);
};
