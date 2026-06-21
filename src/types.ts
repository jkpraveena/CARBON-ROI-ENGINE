/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppStep =
  | 'LANDING'
  | 'INTRO'
  | 'QA_TRANSPORT'
  | 'QA_ENERGY'
  | 'QA_FOOD'
  | 'QA_CONSTRAINTS'
  | 'ANALYSIS'
  | 'BREAKDOWN'
  | 'HERO_REC'
  | 'RANKINGS';

export interface UserProfile {
  ageGroup: string;
  city: string;
  occupation: string;
  name: string;
  householdSize?: number;
  profileId?: string;
}

export interface LifestyleData {
  commuteDistance: number; // Daily commute distance in Kilometers
  transportMode: 'Car' | 'Bike' | 'Bus' | 'Train' | 'Walking' | 'Cycling';
  tripsPerWeek: number; // Commute trips per week
  acHoursPerDay: number; // AC usage per day in hours
  electricityBillRange: 'Low' | 'Medium' | 'High';
  dietType: 'Vegetarian' | 'Eggetarian' | 'Mixed' | 'Frequent Meat';
  weeklyMeatFreq: number; // Weekly meat servings frequency
  // Personal Constraints Layer
  publicTransportPracticality?: 'Very Practical' | 'Somewhat Practical' | 'Difficult' | 'Not Practical';
  acComfort?: 'Easy' | 'Possible' | 'Difficult' | 'Not Realistic';
  dietWillingness?: 'Very Willing' | 'Somewhat Willing' | 'Minimal Changes Only' | 'Not Willing';
  // Advanced Profile Layer (optional)
  advancedCompleted?: boolean;
  wasteRecycling?: 'Excellent' | 'Good' | 'Average' | 'Poor';
  shoppingFrequency?: 'Rarely' | 'Moderate' | 'Frequent';
  foodSourcing?: 'Mostly Local' | 'Mixed' | 'Mostly Imported';
  sustainabilityPractices?: 'High' | 'Medium' | 'Low';
  renewableEnergy?: 'None' | 'Some' | 'Full';
  // Advanced Profile Constraints (optional)
  compostFeasibility?: 'Very Feasible' | 'Possible' | 'Difficult' | 'Not Practical';
  shoppingWillingness?: 'Very Willing' | 'Somewhat Willing' | 'Hard to Reduce';
  localFoodPracticality?: 'Very Practical' | 'Somewhat Practical' | 'Difficult';
  reusablesWillingness?: 'Ready to commit' | 'Willing to try' | 'Too Inconvenient';
  renewableEnergyFeasibility?: 'Already Done' | 'Highly Feasible' | 'Too Expensive' | 'No Access';
}

export interface Recommendation {
  id: string;
  action: string;
  category: string;
  carbonSavings: number; // Monthly reduction in kg CO2
  feasibility: 'Low' | 'Medium' | 'High';
  feasibilityScore: number; // decimal multiplier 0.1 to 1.0 for ROI
  confidence: number; // percentage confidence (e.g. 92%)
  explanation: string; // The justification of selection
  mattersReason: string; // Detailed reason
  roiScore: number; // ROI Score = Carbon Reduction * Confidence * Feasibility * Constraint Fit
  constraintFitScore?: number; // Constraint Fit Score (e.g. 0.1 to 1.0)
  personalFitScore?: number; // Personal Fit Score out of 100
  whyRecommended?: string; // Explains decision based on user preferences
}

export interface ProgressLog {
  id: string;
  date: string; // ISO string or short date YYYY-MM-DD
  recommendationId: string;
  actionName: string;
  carbonSaved: number; // kg CO2 saved
  notes?: string;
}

export interface CommittedAction {
  recommendationId: string;
  actionName: string;
  carbonSavingsPerMonth: number;
  dateCommitted: string;
  status: 'active' | 'completed';
}
