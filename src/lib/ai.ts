import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note, StoredQuiz } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

const handleAIError = (error: any): string => {
  if (error.message?.includes('API_KEY_INVALID')) {
    return "Invalid Gemini API key. Please check your configuration.";
  } else if (error.message?.includes('QUOTA_EXCEEDED')) {
    return "Gemini API quota exceeded. Please check your billing details or try again later.";
  } else if (error.message?.includes('SERVICE_UNAVAILABLE')) {
    return "Gemini service is temporarily unavailable. Please try again later.";
  } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
    return "Rate limit exceeded. Please wait a moment and try again.";
  } else {
    return "Unable to connect to Gemini service. Please try again later.";
  }
};

export const generateSummary = async (content: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a helpful assistant that creates concise summaries of learning notes. Keep summaries under 100 words and focus on key concepts.

Please summarize the following notes:

${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "Unable to generate summary";
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error(handleAIError(error));
  }
};

export const generateTags = async (content: string): Promise<string[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a helpful assistant that generates relevant tags for learning notes. Return only a comma-separated list of 3-5 relevant tags.

Generate tags for the following notes:

${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const tagsString = text || "";
    return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  } catch (error) {
    console.error('Error generating tags:', error);
    throw new Error(handleAIError(error));
  }
};

export const generateQuiz = async (content: string, questionCount: number = 5) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a helpful assistant that creates quiz questions from learning notes. Generate exactly ${questionCount} multiple choice questions with 4 options each. Format as JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}

Create a quiz from these notes:

${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error(handleAIError(error));
  }
};

export const chatWithAssistant = async (message: string, notes: Note[] = [], quizzes: StoredQuiz[] = []): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Build comprehensive context from notes and quizzes
    let context = "";
    
    // Add notes context
    if (notes.length > 0) {
      const recentNotes = notes.slice(0, 10);
      context += "User's Notes:\n";
      recentNotes.forEach((note, index) => {
        context += `${index + 1}. "${note.title}" (Subject: ${note.subject || 'General'})\n`;
        context += `   Summary: ${note.summary || note.content.substring(0, 200)}...\n`;
        if (note.tags && note.tags.length > 0) {
          context += `   Tags: ${note.tags.join(', ')}\n`;
        }
        context += `   Created: ${new Date(note.created_at).toLocaleDateString()}\n\n`;
      });
    }
    
    // Add quiz performance context
    if (quizzes.length > 0) {
      const recentQuizzes = quizzes.slice(0, 10);
      context += "\nUser's Quiz Performance:\n";
      
      recentQuizzes.forEach((quiz, index) => {
        const percentage = Math.round((quiz.score / quiz.total_questions) * 100);
        const performance = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : 'Needs Improvement';
        
        context += `${index + 1}. Quiz on "${quiz.note?.title || 'Unknown Note'}" (Subject: ${quiz.note?.subject || 'General'})\n`;
        context += `   Score: ${quiz.score}/${quiz.total_questions} (${percentage}%) - ${performance}\n`;
        context += `   Date: ${new Date(quiz.created_at).toLocaleDateString()}\n`;
        
        // Add details about incorrect answers for learning insights
        const incorrectQuestions = quiz.questions.filter((question, qIndex) => 
          quiz.user_answers[qIndex] !== question.correct
        );
        
        if (incorrectQuestions.length > 0) {
          context += `   Areas for improvement:\n`;
          incorrectQuestions.slice(0, 3).forEach((question, qIndex) => {
            const userAnswerIndex = quiz.user_answers[quiz.questions.indexOf(question)];
            const userAnswer = userAnswerIndex !== undefined ? question.options[userAnswerIndex] : 'No answer';
            const correctAnswer = question.options[question.correct];
            
            context += `     - Question: "${question.question}"\n`;
            context += `       Your answer: "${userAnswer}"\n`;
            context += `       Correct answer: "${correctAnswer}"\n`;
          });
        }
        context += "\n";
      });
      
      // Add overall performance summary
      const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.total_questions, 0);
      const totalCorrect = quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
      const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      
      context += `Overall Performance Summary:\n`;
      context += `- Total quizzes completed: ${quizzes.length}\n`;
      context += `- Total questions answered: ${totalQuestions}\n`;
      context += `- Overall accuracy: ${overallPercentage}%\n`;
      
      // Identify subjects that need improvement
      const subjectPerformance = quizzes.reduce((acc, quiz) => {
        const subject = quiz.note?.subject || 'General';
        if (!acc[subject]) {
          acc[subject] = { correct: 0, total: 0 };
        }
        acc[subject].correct += quiz.score;
        acc[subject].total += quiz.total_questions;
        return acc;
      }, {} as Record<string, { correct: number; total: number }>);
      
      const weakSubjects = Object.entries(subjectPerformance)
        .map(([subject, perf]) => ({
          subject,
          percentage: Math.round((perf.correct / perf.total) * 100)
        }))
        .filter(item => item.percentage < 70)
        .sort((a, b) => a.percentage - b.percentage);
      
      if (weakSubjects.length > 0) {
        context += `\nSubjects needing attention:\n`;
        weakSubjects.forEach(item => {
          context += `- ${item.subject}: ${item.percentage}% accuracy\n`;
        });
      }
    }
    
    const prompt = `You are a helpful learning assistant specialized in personalized education support. You help users with questions about their notes, learning materials, and quiz performance.

Based on the user's learning data below, provide personalized, actionable advice. When discussing quiz performance, be specific about areas for improvement and suggest study strategies.

${context ? `User's Learning Context:\n${context}` : "No learning data available yet."}

User message: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "I'm sorry, I couldn't process your request.";
  } catch (error) {
    console.error('Error in chat:', error);
    throw new Error(handleAIError(error));
  }
};

export const generateMindMapStructure = async (content: string): Promise<any> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
    const prompt = `Generate a detailed mind map structure (main topic, sub-ideas, and sub-sub-ideas) based on the following note. Focus on extracting key concepts and their relationships. Return the output as a JSON object with a 'mainTopic' string and an 'ideas' array. Each item in 'ideas' should have a 'concept' string and an optional 'subIdeas' array of strings.

Note:
${content}

Expected JSON format:
{
  "mainTopic": "Main Topic Title",
  "ideas": [
    {
      "concept": "First Main Concept",
      "subIdeas": ["Sub-concept 1", "Sub-concept 2"]
    },
    {
      "concept": "Second Main Concept",
      "subIdeas": ["Sub-concept A", "Sub-concept B"]
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error generating mind map structure:', error);
    throw new Error(handleAIError(error));
  }
};