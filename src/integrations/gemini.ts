import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

export interface DiagnosisOutput {
  possibleProblem: string;
  confidence: 'High' | 'Moderate' | 'Low';
  explanation: string;
  possibleCauses: string[];
  recommendedActions: string[];
  prevention: string[];
}

const genAI = config.gemini.apiKey ? new GoogleGenerativeAI(config.gemini.apiKey) : null;

/**
 * Intelligent fallback heuristic engine for tropical agriculture & Nigerian crops
 * Activated whenever GEMINI_API_KEY is not configured or network call encounters failure.
 */
function agronomicHeuristicDiagnosis(
  crop: string,
  affectedPart: string,
  startedAgo: string,
  description: string
): DiagnosisOutput {
  const query = `${crop} ${description} ${affectedPart}`.toLowerCase();

  if (query.includes('tomato') && (query.includes('curl') || query.includes('white') || query.includes('fly'))) {
    return {
      possibleProblem: 'Whitefly Infestation (Bemisia tabaci) & Tomato Yellow Leaf Curl Virus',
      confidence: 'High',
      explanation:
        'Curling leaves and small white insect activity indicate active sap-sucking whitefly populations vectoring viral geminiviruses.',
      possibleCauses: [
        'High ambient temperatures and dry conditions favoring rapid whitefly multiplication',
        'Adjacent untreated weeds harboring insect reservoirs'
      ],
      recommendedActions: [
        'Deploy yellow sticky boards (1 trap per 10 square meters) at canopy level.',
        'Spray cold-pressed Neem oil (5ml/L of water + mild organic soap) at sunrise.',
        'Prune and destroy heavily curled lower leaves.'
      ],
      prevention: [
        'Use silver reflective mulch during bed preparation to disorient flying vectors.',
        'Intercrop with marigolds as companion repellent plants.'
      ]
    };
  }

  if (query.includes('cassava') || query.includes('mosaic')) {
    return {
      possibleProblem: 'Cassava Mosaic Disease (CMD Begomovirus)',
      confidence: 'High',
      explanation:
        'Chlorotic yellow-green mosaic patterns and distorted leaves indicate viral transmission from infected cuttings or whiteflies.',
      possibleCauses: [
        'Infected stem planting cuttings used during planting',
        'Whitefly insect vector transmission across neighboring plots'
      ],
      recommendedActions: [
        'Immediately rogue (uproot and burn) visibly infected stands to protect neighboring plants.',
        'Propagate exclusively from certified disease-free stem cuttings (e.g. TME 419).'
      ],
      prevention: [
        'Source clean foundation seed from registered agricultural research institutes (e.g., IITA, NRCRI).',
        'Maintain minimum 50-meter separation from untreated wild cassava stands.'
      ]
    };
  }

  if (query.includes('maize') || query.includes('corn') || query.includes('worm') || query.includes('borer')) {
    return {
      possibleProblem: 'Fall Armyworm (Spodoptera frugiperda) Attack',
      confidence: 'High',
      explanation:
        'Ragged leaf perforations and moist frass in the central whorl indicate active caterpillar feeding.',
      possibleCauses: [
        'Nocturnal moth egg-laying on young maize foliage',
        'Lack of early-stage scouting during vegetative growth'
      ],
      recommendedActions: [
        'Apply wood ash or bio-insecticide (Bacillus thuringiensis - Bt) directly into central leaf whorls.',
        'Handpick caterpillars in smallholder plots during early dawn hours.'
      ],
      prevention: [
        'Early planting with the onset of rains and push-pull intercropping with Desmodium legumes.',
        'Regular field scouting starting at V2 growth stage.'
      ]
    };
  }

  if (query.includes('rot') || query.includes('spot') || query.includes('blight') || query.includes('yellow')) {
    return {
      possibleProblem: 'Early/Late Foliar Blight & Fungal Leaf Spot (Alternaria / Phytophthora)',
      confidence: 'Moderate',
      explanation:
        'Concentric brown lesions and yellow halos signify necrotrophic fungal spores thriving under elevated relative humidity.',
      possibleCauses: [
        'Overhead irrigation splashing soil-borne fungal spores onto lower foliage',
        'High humidity and dense planting canopy restricting airflow'
      ],
      recommendedActions: [
        'Remove and incinerate lower infected leaves immediately.',
        'Apply copper hydroxide or mancozeb fungicide at label rate, targeting undersides of foliage.',
        'Switch from overhead sprinklers to drip irrigation at root zone.'
      ],
      prevention: [
        'Practice 3-year crop rotation avoiding Solanaceae family plants consecutively.',
        'Ensure 50-60cm plant spacing for adequate air circulation.'
      ]
    };
  }

  return {
    possibleProblem: 'Suspected Foliar Pathogen / Environmental Micro-Climate Stress',
    confidence: 'Moderate',
    explanation:
      `Symptoms reported on ${crop} (${affectedPart}) indicate physiological stress consistent with micro-climate pathogen proliferation or sap-sucking pest colonization.`,
    possibleCauses: [
      'Prolonged leaf surface moisture promoting fungal/bacterial proliferation',
      'Early stage sap-sucking insect colonization or soil micronutrient imbalance'
    ],
    recommendedActions: [
      'Prune affected foliage with sterilized shears and dispose safely away from field.',
      'Improve inter-plant airflow and reduce overhead spray watering.',
      'Apply an organic copper-based or cold-pressed neem formulation early in the morning.'
    ],
    prevention: [
      'Maintain strict field sanitation and clear decaying vegetative debris.',
      'Implement structured crop rotation schedules with non-host botanical families.'
    ]
  };
}

export async function diagnoseCropDisease(params: {
  crop: string;
  affectedPart: string;
  startedAgo: string;
  description: string;
  imageUrl?: string;
}): Promise<DiagnosisOutput> {
  const { crop, affectedPart, startedAgo, description, imageUrl } = params;

  if (!genAI || !config.gemini.apiKey) {
    return agronomicHeuristicDiagnosis(crop, affectedPart, startedAgo, description);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `You are an expert tropical agronomist specializing in Nigerian and West African agricultural systems.
Analyze the following crop distress report:
- Crop: ${crop}
- Affected Plant Part: ${affectedPart}
- Symptoms Onset: ${startedAgo}
- Detailed Description: ${description}
${imageUrl ? `- Plant Image Reference: ${imageUrl}` : ''}

You must return a valid JSON object strictly matching this schema:
{
  "possibleProblem": "Specific common name and scientific name of disease/pest",
  "confidence": "High" | "Moderate" | "Low",
  "explanation": "Detailed scientific and agronomic explanation of why these symptoms occurred",
  "possibleCauses": ["Array of 2-4 underlying causes"],
  "recommendedActions": ["Array of 3-5 immediate practical steps the farmer can take"],
  "prevention": ["Array of 2-4 long-term preventive cultural practices"]
}
Keep recommendations practical, cost-effective for smallholder and commercial farmers, and safe.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as DiagnosisOutput;

    return {
      possibleProblem: parsed.possibleProblem || 'Undetermined Crop Issue',
      confidence: parsed.confidence || 'Moderate',
      explanation: parsed.explanation || description,
      possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      prevention: Array.isArray(parsed.prevention) ? parsed.prevention : []
    };
  } catch (error) {
    console.warn('[Gemini AI] API call failed, using agronomic heuristic fallback:', error);
    return agronomicHeuristicDiagnosis(crop, affectedPart, startedAgo, description);
  }
}

export async function answerAgronomicQuestion(
  category: string,
  question: string
): Promise<{ answer: string; summary: string }> {
  if (!genAI || !config.gemini.apiKey) {
    const q = question.toLowerCase();
    if (category === 'Crop Production' || q.includes('spac') || q.includes('plant')) {
      return {
        answer: `### Practical Agronomic Guide: ${question}\n\n1. **Soil Preparation**: Ensure well-drained loamy soil with high organic matter. Incorporate cured compost 2 weeks prior to planting.\n2. **Optimal Spacing**: Maintain recommended plant-to-plant and row-to-row spacing to minimize canopy competition and optimize sun absorption.\n3. **Water Management**: Irrigate at root zone during early morning hours, especially during flowering and fruit setting stages.\n4. **Weed Control**: Perform manual weeding at 3 and 7 weeks after planting to eliminate nutrient theft.`,
        summary: 'Key cultivation rules: Loamy soil preparation, precise plant spacing, root-zone morning irrigation, and critical weeding at weeks 3 & 7.'
      };
    }

    if (category === 'Soil & Fertilizer' || q.includes('npk') || q.includes('fertilizer')) {
      return {
        answer: `### Practical Agronomic Guide: ${question}\n\n1. **Soil Testing**: Verify pH balance (ideal 6.0 - 6.8 for most arable crops).\n2. **Application Timing**: Apply basal NPK fertilizer 2-3 weeks after sprouting in a 5cm ring around the stem, avoiding direct contact.\n3. **Organic Booster**: Mulch with seasoned poultry manure or compost to restore microbial activity and enhance moisture holding capacity.`,
        summary: 'Fertilizer application protocol: Ring application 5cm from stem at week 2-3, soil pH optimization (6.0-6.8), and organic mulch integration.'
      };
    }

    return {
      answer: `### Practical Agronomic Guide: ${question}\n\n1. **Core Fundamentals**: Follow verified tropical agronomy guidelines appropriate for your regional agro-ecological zone.\n2. **Nutrient & Water Balance**: Ensure adequate organic soil conditioning, precise irrigation scheduling, and pest scouting.\n3. **Post-Harvest Protection**: Implement proper storage, moisture regulation, and hygienic handling.`,
      summary: 'Essential agricultural best practices: soil testing, calibrated fertilizer application, and integrated crop management.'
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `You are RUUTED's expert Agronomy AI Advisor for Nigerian farmers.
Category: ${category}
Farmer Question: ${question}

Provide actionable, scientifically sound, localized agricultural advice.
Return a JSON object strictly matching this schema:
{
  "answer": "Comprehensive markdown response with numbered practical steps, dosages, and cultural techniques",
  "summary": "1-2 sentence executive summary of the advice"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return {
      answer: parsed.answer,
      summary: parsed.summary
    };
  } catch (err) {
    console.warn('[Gemini AI] Agronomy Q&A failed, using heuristic:', err);
    return {
      answer: `### Agronomic Advisory: ${question}\n\n1. **Field Assessment**: Verify soil and environmental factors.\n2. **Agronomic Best Practice**: Ensure proper spacing, certified seed sourcing, and balanced nutrition.\n3. **Consultation**: Work with local extension agents for regional specifics.`,
      summary: 'Agronomic guidance: adhere to proven crop production standards, field sanitation, and balanced crop nutrition.'
    };
  }
}

export async function continuePestConversation(
  crop: string,
  problem: string,
  userMessage: string
): Promise<string> {
  if (!genAI || !config.gemini.apiKey) {
    const text = userMessage.toLowerCase();
    if (text.includes('chemical') || text.includes('spray')) {
      return 'When applying any contact or systemic spray, do so strictly before 8:00 AM or after 5:30 PM to prevent leaf scorching and to safeguard beneficial pollinator bees. Always consult a local agricultural extension officer before using Class II/III chemicals.';
    }
    if (text.includes('kill') || text.includes('spread') || text.includes('danger')) {
      return 'If isolated early, the risk of total crop loss is low. However, immediate physical containment (removing diseased leaves and setting sticky traps) within 48 hours is critical to prevent field-wide vectoring.';
    }
    return `Regarding your question about "${userMessage}": For ${crop}, ensure you monitor daily morning humidity levels. Always adhere strictly to dosage guidelines on agrochemical labels and wear protective gear.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `You are RUUTED Agronomy AI assisting a farmer.
Crop: ${crop}
Diagnosed Condition: ${problem}
Farmer's follow-up question: "${userMessage}"

Provide clear, professional, practical advice tailored to tropical smallholder farming.`;

    const res = await model.generateContent(prompt);
    return res.response.text();
  } catch (err) {
    return `Regarding "${userMessage}": Always follow safe chemical handling, test on a single plant section first, and inspect the canopy daily.`;
  }
}
