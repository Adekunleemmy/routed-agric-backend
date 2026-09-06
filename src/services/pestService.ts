import { prisma } from '../config/prisma.js';
import { DiagnosePestDTO } from '../types/index.js';
import { diagnoseCropDisease, continuePestConversation } from '../integrations/gemini.js';

export class PestService {
  static async diagnose(userId: string, dto: DiagnosePestDTO) {
    const aiResult = await diagnoseCropDisease({
      crop: dto.crop,
      affectedPart: dto.affectedPart,
      startedAgo: dto.startedAgo,
      description: dto.description,
      imageUrl: dto.imageUrl
    });

    const diagnosis = await prisma.pestDiagnosis.create({
      data: {
        userId,
        crop: dto.crop,
        affectedPart: dto.affectedPart,
        startedAgo: dto.startedAgo,
        description: dto.description,
        imageUrl: dto.imageUrl,
        possibleProblem: aiResult.possibleProblem,
        confidence: aiResult.confidence,
        explanation: aiResult.explanation,
        possibleCauses: aiResult.possibleCauses,
        recommendedActions: aiResult.recommendedActions,
        prevention: aiResult.prevention
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    return {
      id: diagnosis.id,
      userId: diagnosis.userId,
      crop: diagnosis.crop,
      affectedPart: diagnosis.affectedPart,
      startedAgo: diagnosis.startedAgo,
      description: diagnosis.description,
      imageUrl: diagnosis.imageUrl,
      possibleProblem: diagnosis.possibleProblem,
      confidence: diagnosis.confidence,
      explanation: diagnosis.explanation,
      possibleCauses: diagnosis.possibleCauses,
      recommendedActions: diagnosis.recommendedActions,
      prevention: diagnosis.prevention,
      messages: [],
      createdAt: diagnosis.createdAt.toISOString()
    };
  }

  static async getHistory(userId: string) {
    const history = await prisma.pestDiagnosis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    return history.map((d) => ({
      id: d.id,
      userId: d.userId,
      crop: d.crop,
      affectedPart: d.affectedPart,
      startedAgo: d.startedAgo,
      description: d.description,
      imageUrl: d.imageUrl,
      possibleProblem: d.possibleProblem,
      confidence: d.confidence,
      explanation: d.explanation,
      possibleCauses: d.possibleCauses,
      recommendedActions: d.recommendedActions,
      prevention: d.prevention,
      messages: d.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.createdAt.toISOString()
      })),
      createdAt: d.createdAt.toISOString()
    }));
  }

  static async getById(id: string, userId: string) {
    const diagnosis = await prisma.pestDiagnosis.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!diagnosis) {
      throw new Error('Diagnosis not found');
    }

    if (diagnosis.userId !== userId) {
      throw new Error('Unauthorized access to diagnosis');
    }

    return {
      id: diagnosis.id,
      userId: diagnosis.userId,
      crop: diagnosis.crop,
      affectedPart: diagnosis.affectedPart,
      startedAgo: diagnosis.startedAgo,
      description: diagnosis.description,
      imageUrl: diagnosis.imageUrl,
      possibleProblem: diagnosis.possibleProblem,
      confidence: diagnosis.confidence,
      explanation: diagnosis.explanation,
      possibleCauses: diagnosis.possibleCauses,
      recommendedActions: diagnosis.recommendedActions,
      prevention: diagnosis.prevention,
      messages: diagnosis.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.createdAt.toISOString()
      })),
      createdAt: diagnosis.createdAt.toISOString()
    };
  }

  static async addMessage(id: string, userId: string, text: string) {
    const diagnosis = await prisma.pestDiagnosis.findUnique({
      where: { id }
    });

    if (!diagnosis) throw new Error('Diagnosis not found');
    if (diagnosis.userId !== userId) throw new Error('Unauthorized access to diagnosis');

    // 1. Record user question
    const userMsg = await prisma.pestMessage.create({
      data: {
        diagnosisId: id,
        sender: 'user',
        text
      }
    });

    // 2. Query AI Agronomist
    const aiAnswer = await continuePestConversation(diagnosis.crop, diagnosis.possibleProblem, text);

    // 3. Record AI answer
    const aiMsg = await prisma.pestMessage.create({
      data: {
        diagnosisId: id,
        sender: 'ai',
        text: aiAnswer
      }
    });

    return this.getById(id, userId);
  }
}
