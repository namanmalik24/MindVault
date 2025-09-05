// SM-2 Algorithm implementation for spaced repetition
export interface ReviewData {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed: Date;
}

export const calculateNextReview = (
  quality: number, // 0-5 scale (0 = complete blackout, 5 = perfect response)
  previousData?: ReviewData
): ReviewData => {
  const now = new Date();
  
  // Initialize for first review
  if (!previousData) {
    return {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 1,
      nextReview: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day
      lastReviewed: now
    };
  }

  let { easeFactor, interval, repetitions } = previousData;

  // Update ease factor based on quality
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Minimum ease factor is 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // If quality < 3, reset repetitions and interval
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReviewed: now
  };
};

export const getMemoryStrength = (reviewData: ReviewData): number => {
  const now = new Date();
  const daysSinceReview = (now.getTime() - reviewData.lastReviewed.getTime()) / (24 * 60 * 60 * 1000);
  const daysSinceScheduled = (now.getTime() - reviewData.nextReview.getTime()) / (24 * 60 * 60 * 1000);
  
  // Calculate strength based on how close we are to the next review
  let strength = 100;
  
  if (daysSinceScheduled > 0) {
    // Overdue - strength decreases
    strength = Math.max(0, 100 - (daysSinceScheduled * 10));
  } else {
    // Not due yet - strength based on ease factor and time since last review
    const decayRate = 1 / reviewData.easeFactor;
    strength = Math.max(0, 100 - (daysSinceReview * decayRate * 5));
  }
  
  return Math.round(strength);
};

export const isDueForReview = (reviewData: ReviewData): boolean => {
  return new Date() >= reviewData.nextReview;
};