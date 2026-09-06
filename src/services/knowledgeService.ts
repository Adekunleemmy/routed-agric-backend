import { prisma } from '../config/prisma.js';
import { AskKnowledgeDTO } from '../types/index.js';
import { answerAgronomicQuestion } from '../integrations/gemini.js';

export class KnowledgeService {
  static async askQuestion(dto: AskKnowledgeDTO) {
    const result = await answerAgronomicQuestion(dto.category, dto.question);
    return {
      category: dto.category,
      question: dto.question,
      answer: result.answer,
      summary: result.summary,
      timestamp: new Date().toISOString()
    };
  }

  static async getSaved(userId: string) {
    const items = await prisma.savedKnowledge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return items.map((i) => ({
      id: i.id,
      userId: i.userId,
      category: i.category,
      title: i.title,
      summary: i.summary,
      fullContent: i.fullContent,
      createdAt: i.createdAt.toISOString()
    }));
  }

  static async saveGuide(
    userId: string,
    dto: { category: string; title: string; summary: string; fullContent: string }
  ) {
    const guide = await prisma.savedKnowledge.create({
      data: {
        userId,
        category: dto.category,
        title: dto.title,
        summary: dto.summary,
        fullContent: dto.fullContent
      }
    });

    return {
      id: guide.id,
      userId: guide.userId,
      category: guide.category,
      title: guide.title,
      summary: guide.summary,
      fullContent: guide.fullContent,
      createdAt: guide.createdAt.toISOString()
    };
  }

  static async deleteSaved(id: string, userId: string) {
    const item = await prisma.savedKnowledge.findUnique({
      where: { id }
    });

    if (!item) throw new Error('Saved guide not found');
    if (item.userId !== userId) throw new Error('Unauthorized');

    await prisma.savedKnowledge.delete({ where: { id } });
    return true;
  }
}
