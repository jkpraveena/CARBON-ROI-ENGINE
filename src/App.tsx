/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Sparkle,
  ArrowRight,
  ArrowLeft,
  Car,
  Settings,
  Flame,
  Leaf,
  TrendingDown,
  Trash2,
  AlertTriangle,
  Plus,
  RotateCcw,
  ShieldCheck,
  Lightbulb,
  Zap,
  Award,
  CheckCircle2,
  Sliders,
  BarChart2,
  X,
  MapPin,
  User,
  GraduationCap,
  Calendar,
  Compass,
  Utensils,
  Thermometer,
  Gauge,
  HelpCircle,
  ArrowUpRight,
  Trophy,
  Download,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { AppStep, UserProfile, LifestyleData, Recommendation, ProgressLog } from './types';
import { estimateCarbonFootprint, generateRecommendations } from './utils/engine';
import { DEFAULT_EMISSION_FACTORS } from './config/emissionFactors';

const STORAGE_KEYS = {
  PROFILE: 'carbon_roi_profile',
  LIFESTYLE: 'carbon_roi_lifestyle',
  COMMITTED: 'carbon_roi_committed',
  LOGS: 'carbon_roi_logs',
  FACTORS: 'carbon_roi_factors'
};

export default function App() {
  // Page routing step
  const [step, setStep] = useState<AppStep>(() => {
    const hasBlueprint = localStorage.getItem('has_existing_blueprint') === 'true';
    return hasBlueprint ? 'BREAKDOWN' : 'LANDING';
  });

  // Configurable Factors (live updating on-the-fly)
  const [factors, setFactors] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FACTORS);
    return saved ? JSON.parse(saved) : DEFAULT_EMISSION_FACTORS;
  });

  // User details state
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const parsed = saved ? JSON.parse(saved) : null;
    const generateId = () => `CRI-${Math.floor(1000 + Math.random() * 9000)}`;
    if (parsed) {
      if (!parsed.profileId) {
        parsed.profileId = generateId();
      }
      if (parsed.householdSize === undefined) {
        parsed.householdSize = 1;
      }
      return parsed;
    }
    return { name: '', ageGroup: 'Young Adult', city: '', occupation: '', householdSize: 1, profileId: generateId() };
  });

  const [lifestyle, setLifestyle] = useState<LifestyleData>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LIFESTYLE);
    const parsed = saved ? JSON.parse(saved) : {
      commuteDistance: 15,
      transportMode: 'Car',
      tripsPerWeek: 5,
      acHoursPerDay: 4,
      electricityBillRange: 'Medium',
      dietType: 'Mixed',
      weeklyMeatFreq: 4,
      publicTransportPracticality: undefined,
      acComfort: undefined,
      dietWillingness: undefined,
    };
    return {
      publicTransportPracticality: undefined,
      acComfort: undefined,
      dietWillingness: undefined,
      ...parsed
    };
  });

  // Action / dashboard metrics persistent logs
  const [committedIds, setCommittedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMITTED);
    return saved ? JSON.parse(saved) : [];
  });

  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (saved) return JSON.parse(saved);
    
    // Seed default baseline logs for visualization (weekly, monthly history)
    const seedLogs: ProgressLog[] = [
      {
        id: 'seed-1',
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recommendationId: 'rec_energy_ac',
        actionName: 'Adjusted thermostat to 25°C & trimmed active hours',
        carbonSaved: 12.5,
      },
      {
        id: 'seed-2',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recommendationId: 'rec_transport_bus',
        actionName: 'Substituted solo trips with communal express transit',
        carbonSaved: 18.0,
      },
      {
        id: 'seed-3',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recommendationId: 'rec_food_reduction',
        actionName: 'Substituted resource-heavy livestock servings with plants',
        carbonSaved: 8.5,
      }
    ];
    return seedLogs;
  });

  // Interactive settings drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'multipliers'>('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Analysis simulation state message
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMsg, setAnalysisMsg] = useState('Mapping lifestyle sequences...');

  // Active navigation tab when completing onboarding
  const [activeTab, setActiveTab] = useState<'breaking' | 'hero' | 'ranking'>(() => {
    const hasBlueprint = localStorage.getItem('has_existing_blueprint') === 'true';
    return hasBlueprint ? 'breaking' : 'breaking';
  });

  // Advanced Profile optional module state
  const [isAdvancedFormOpen, setIsAdvancedFormOpen] = useState(false);
  const [workingAdvanced, setWorkingAdvanced] = useState<{
    wasteRecycling: 'Excellent' | 'Good' | 'Average' | 'Poor';
    shoppingFrequency: 'Rarely' | 'Moderate' | 'Frequent';
    foodSourcing: 'Mostly Local' | 'Mixed' | 'Mostly Imported';
    sustainabilityPractices: 'High' | 'Medium' | 'Low';
    renewableEnergy: 'None' | 'Some' | 'Full';
    compostFeasibility?: 'Very Feasible' | 'Possible' | 'Difficult' | 'Not Practical';
    shoppingWillingness?: 'Very Willing' | 'Somewhat Willing' | 'Hard to Reduce';
    localFoodPracticality?: 'Very Practical' | 'Somewhat Practical' | 'Difficult';
    reusablesWillingness?: 'Ready to commit' | 'Willing to try' | 'Too Inconvenient';
    renewableEnergyFeasibility?: 'Already Done' | 'Highly Feasible' | 'Too Expensive' | 'No Access';
  }>(() => {
    return {
      wasteRecycling: 'Average',
      shoppingFrequency: 'Moderate',
      foodSourcing: 'Mixed',
      sustainabilityPractices: 'Medium',
      renewableEnergy: 'None',
      compostFeasibility: 'Possible',
      shoppingWillingness: 'Somewhat Willing',
      localFoodPracticality: 'Somewhat Practical',
      reusablesWillingness: 'Willing to try',
      renewableEnergyFeasibility: 'Highly Feasible',
    };
  });

  // Interactive feedback triggers
  const [showStatusAlert, setShowStatusAlert] = useState<string | null>(null);

  // Gamified interaction variables
  const [streakDays, setStreakDays] = useState(12); // Realistic default streak
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [hoveredLedgerSegment, setHoveredLedgerSegment] = useState<'transport' | 'energy' | 'food' | null>(null);

  // Trigger analysis simulation animation
  useEffect(() => {
    if (step === 'ANALYSIS') {
      setAnalysisProgress(0);
      setAnalysisMsg('Decoding environmental variables...');
      
      const interval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setStep('BREAKDOWN');
              setActiveTab('breaking');
              localStorage.setItem('has_existing_blueprint', 'true');
            }, 600);
            return 100;
          }
          const next = prev + 10;
          if (next === 30) setAnalysisMsg('Calibrating travel emissions coefficients...');
          if (next === 60) setAnalysisMsg('Synthesizing energy and cooling footprints...');
          if (next === 85) setAnalysisMsg('Scoring custom ROI opportunities...');
          return next;
        });
      }, 150);

      return () => clearInterval(interval);
    }
  }, [step]);

  // Persists states automatically
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LIFESTYLE, JSON.stringify(lifestyle));
  }, [lifestyle]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMMITTED, JSON.stringify(committedIds));
  }, [committedIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(progressLogs));
  }, [progressLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FACTORS, JSON.stringify(factors));
  }, [factors]);

  // Calculations derived on-the-fly
  const footprint = useMemo(() => {
    return estimateCarbonFootprint(lifestyle, factors);
  }, [lifestyle, factors]);

  // Carbon Persona Classification (Item 10)
  const carbonPersona = useMemo(() => {
    if (footprint.total === 0) return '🌱 Eco Beginner';
    if (footprint.total < 220) return '🌍 Climate Champion';
    if (lifestyle.transportMode === 'Walking' || lifestyle.transportMode === 'Cycling' || lifestyle.transportMode === 'Bus' || lifestyle.transportMode === 'Train') {
      return '🚲 Conscious Commuter';
    }
    if (lifestyle.acHoursPerDay <= 2 || lifestyle.electricityBillRange === 'Low') {
      return '⚡ Energy Optimizer';
    }
    return '🌱 Eco Beginner';
  }, [footprint, lifestyle]);

  // Weekly Sustainability Score: 0-100 (Item 5)
  const sustainabilityScore = useMemo(() => {
    // 1. Transport Choices Score (Max 100)
    let transportScore = 100;
    if (lifestyle.transportMode === 'Car') {
      transportScore = Math.max(15, 100 - (lifestyle.commuteDistance * lifestyle.tripsPerWeek * 0.5));
    } else if (lifestyle.transportMode === 'Bike') {
      transportScore = Math.max(30, 100 - (lifestyle.commuteDistance * lifestyle.tripsPerWeek * 0.22));
    } else if (lifestyle.transportMode === 'Bus') {
      transportScore = 75;
    } else if (lifestyle.transportMode === 'Train') {
      transportScore = 88;
    } else { // Walking / Cycling
      transportScore = 100;
    }

    // 2. Energy Usage Score (Max 100)
    let energyScore = 100;
    energyScore -= lifestyle.acHoursPerDay * 3;
    if (lifestyle.electricityBillRange === 'High') {
      energyScore -= 20;
    } else if (lifestyle.electricityBillRange === 'Medium') {
      energyScore -= 10;
    }
    energyScore = Math.max(20, energyScore);

    // 3. Food Choices Score (Max 100)
    let foodScore = 100;
    if (lifestyle.dietType === 'Vegetarian') {
      foodScore = 100;
    } else if (lifestyle.dietType === 'Eggetarian') {
      foodScore = 85;
    } else if (lifestyle.dietType === 'Mixed') {
      foodScore = 65 - (lifestyle.weeklyMeatFreq * 1.5);
    } else { // Frequent Meat
      foodScore = 40 - (lifestyle.weeklyMeatFreq * 1.5);
    }
    foodScore = Math.max(20, foodScore);

    // 4. Completed commitments bonus
    const commitmentsBonus = Math.min(20, committedIds.length * 5);

    const baseSum = (transportScore + energyScore + foodScore) / 3;
    const finalScore = Math.min(100, Math.round(baseSum + commitmentsBonus));

    // Category Level
    let level: 'Excellent' | 'Good' | 'Needs Improvement' = 'Needs Improvement';
    if (finalScore >= 80) {
      level = 'Excellent';
    } else if (finalScore >= 60) {
      level = 'Good';
    }

    return {
      score: finalScore,
      level,
      transportScore: Math.round(transportScore),
      energyScore: Math.round(energyScore),
      foodScore: Math.round(foodScore)
    };
  }, [lifestyle, committedIds]);

  // Achievement System Config (Item 4)
  const achievements = useMemo(() => {
    return [
      {
        id: 'ach_assessment',
        title: 'First Carbon Assessment',
        emoji: '🌱',
        description: 'Successfully mapped your foundational lifestyle footprint metrics.',
        unlocked: footprint.total > 0,
      },
      {
        id: 'ach_commute',
        title: 'Active Commuter',
        emoji: '🚶',
        description: 'Sustains low travel impact via walking, cycling, or active motorcycle routes.',
        unlocked: lifestyle.transportMode === 'Walking' || lifestyle.transportMode === 'Cycling' || lifestyle.transportMode === 'Bike',
      },
      {
        id: 'ach_transit',
        title: 'Public Transport Champion',
        emoji: '🚌',
        description: 'Leverages high-density communal rail or bus networks for daily orbits.',
        unlocked: lifestyle.transportMode === 'Bus' || lifestyle.transportMode === 'Train',
      },
      {
        id: 'ach_plant',
        title: 'Plant-Friendly Lifestyle',
        emoji: '🥗',
        description: 'Prefers resource-efficient plant proteins over intensive meat production.',
        unlocked: lifestyle.dietType === 'Vegetarian' || lifestyle.dietType === 'Eggetarian' || lifestyle.weeklyMeatFreq <= 2,
      },
      {
        id: 'ach_energy',
        title: 'Energy Saver',
        emoji: '⚡',
        description: 'Restricts AC utility burn cycles or maintains low grid expenditure.',
        unlocked: lifestyle.acHoursPerDay <= 2 || lifestyle.electricityBillRange === 'Low',
      },
      {
        id: 'ach_expert',
        title: 'Carbon Reduction Expert',
        emoji: '🏆',
        description: 'Prevented a cumulative total of 30 kg CO₂ or more from active logs.',
        unlocked: progressLogs.reduce((acc, log) => acc + log.carbonSaved, 0) >= 30,
      }
    ];
  }, [footprint, lifestyle, progressLogs]);

  // Interactive local AI-style insights (Item 11)
  const insights = useMemo(() => {
    const total = Math.max(0.1, footprint.total);
    const realAcPct = Math.min(99, Math.round((footprint.energy / total) * 100));
    const acTrimSavings = Math.round((2 * factors.energy.acPerHour * 30) * 10) / 10;

    return [
      `Your energy footprint contributes ${realAcPct}% of your total emissions scope.`,
      `Trimming aircon by just 2 hours daily yields an estimated saving of ${acTrimSavings} kg CO₂ monthly.`,
      `Active transport transitions have outstanding ROI potential inside the ${profile.city || 'local'} region.`,
    ];
  }, [footprint, factors, profile]);

  const recommendations = useMemo(() => {
    return generateRecommendations(lifestyle, profile, footprint, factors);
  }, [lifestyle, profile, footprint, factors]);

  const heroRecommendation = useMemo(() => {
    return recommendations[0];
  }, [recommendations]);

  // Sum of progress logs
  const totalCarbonSaved = useMemo(() => {
    return progressLogs.reduce((acc, log) => acc + log.carbonSaved, 0);
  }, [progressLogs]);

  const committedSavingsPotential = useMemo(() => {
    return committedIds.reduce((sum, id) => {
      const rec = recommendations.find(r => r.id === id);
      return sum + (rec ? rec.carbonSavings : 0);
    }, 0);
  }, [committedIds, recommendations]);

  // Reports exporter function (Item 12)
  const exportReport = () => {
    const annualSavings = Math.round(committedSavingsPotential * 12);
    const isAdvanced = !!lifestyle.advancedCompleted;

    const activeGoalsText = committedIds.map(id => {
      const rec = recommendations.find(r => r.id === id);
      if (!rec) return '';
      const logsCount = progressLogs.filter(l => l.recommendationId === id).length;
      return `
        <div style="border-bottom: 1px dotted #e2e8f0; padding: 12px 0;">
          <h4 style="color: #1e3f20; margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${rec.action}</h4>
          <p style="color: #4a5568; margin: 0; font-size: 12px;">Progress: ${Math.min(100, logsCount * 10)}% | Completed: ${logsCount}/10 actions</p>
          <p style="color: #1e3f20; font-weight: bold; margin: 4px 0 0 0; font-size: 11px;">Monthly Savings: ${rec.carbonSavings} kg CO₂ | Est. Carbon Saved So Far: ${progressLogs.filter(l => l.recommendationId === id).reduce((sum, l) => sum + l.carbonSaved, 0)} kg</p>
        </div>
      `;
    }).join('') || '<p style="color: #718096; font-style: italic; font-size: 13px;">No goals committed yet.</p>';

    const unlockedAchText = achievements.filter(a => a.unlocked).map(a => `
      <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; margin-right: 8px; margin-bottom: 8px;">
        ${a.emoji} ${a.title}
      </span>
    `).join('') || '<span style="color: #718096; font-style: italic; font-size: 12px;">None yet. Continue your journey to earn badges!</span>';

    // Carbon Story Overview Generator
    const storyText = (() => {
      const parts = [];
      parts.push(`Your computed carbon footprint ledger clocks in at <strong>${Math.round(footprint.total)} kg CO₂ per month</strong>. `);
      if (biggestContributor.id === 'transport') {
        parts.push(`Your commute style (${lifestyle.transportMode} travel over ${lifestyle.commuteDistance} km) represents the most significant driver here, representing <strong>${Math.round((footprint.transport / footprint.total) * 100)}%</strong> of your direct emissions footprint.`);
      } else if (biggestContributor.id === 'energy') {
        parts.push(`Residential energy load, primarily driven by AC usage of up to ${lifestyle.acHoursPerDay} hours per day on a ${lifestyle.electricityBillRange} billing tier, stands out as your primary carbon spike, representing <strong>${Math.round((footprint.energy / footprint.total) * 100)}%</strong> of your carbon footprint.`);
      } else {
        parts.push(`Your dietary inputs (such as the ${lifestyle.dietType} category with ${lifestyle.weeklyMeatFreq} weekly meat portions) represent your largest single direct sector output, representing <strong>${Math.round((footprint.food / footprint.total) * 100)}%</strong> of baseline emissions.`);
      }
      parts.push(`You currently qualify as a <strong>${carbonPersona}</strong>, with a total home, dietary, & travel sustainability score of <strong>${sustainabilityScore.score}/100</strong>.`);
      return parts.join(' ');
    })();

    // Primary Blueprint Recommendation
    const heroRec = recommendations[0];
    const heroSectionHtml = heroRec ? `
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #f4fbf7 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px;">Primary Blueprint Target</span>
          <span style="font-size: 12px; font-weight: bold; color: #047857;">Est. ROI Score: ${heroRec.roiScore}</span>
        </div>
        <h3 style="color: #111827; font-size: 18px; margin: 0 0 8px 0; font-weight: bold;">${heroRec.action}</h3>
        <p style="color: #374151; font-size: 14px; margin: 0 0 12px 0;"><strong>Impact Assessment:</strong> ${heroRec.explanation}</p>
        <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 1.4; padding-left: 12px; border-left: 3px solid #059669; font-style: italic;"><strong>Why it matters:</strong> ${heroRec.mattersReason}</p>
        <div style="display: flex; gap: 15px; margin-top: 15px; font-size: 12px; color: #4b5563;">
          <div><strong>Category:</strong> <span style="text-transform: capitalize;">${heroRec.category}</span></div>
          <div><strong>Monthly Offset:</strong> <strong style="color: #059669;">${heroRec.carbonSavings} kg CO₂</strong></div>
          <div><strong>Feasibility:</strong> ${heroRec.feasibility} (${Math.round(heroRec.feasibilityScore * 100)}%)</div>
          <div><strong>Confidence:</strong> ${heroRec.confidence}%</div>
        </div>
      </div>
    ` : '<p style="color: #718096; font-style: italic; font-size: 13px;">No specific blueprint recommendation is active.</p>';

    // Ranked Opportunities (Excluding first/hero if multiple exist, or showing all)
    const otherRecs = recommendations.slice(1);
    const otherRecsHtml = otherRecs.map((rec, i) => `
      <div style="padding: 14px 0; border-bottom: 1px solid #e5e7eb; display: grid; grid-template-columns: 24px 1fr 120px; gap: 12px; align-items: start;">
        <span style="color: #9ca3af; font-weight: 900; font-size: 14px;">#${i + 2}</span>
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #111827; font-weight: 600;">${rec.action}</h4>
          <span style="font-size: 11px; background: #f3f4f6; color: #4b5563; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: bold; display: inline-block;">${rec.category}</span>
          <span style="font-size: 11px; color: #6b7280; margin-left: 8px;">Confidence: ${rec.confidence}% | Feasibility: ${rec.feasibility}</span>
          <p style="color: #4b5563; font-size: 12.5px; margin: 6px 0 0 0; line-height: 1.4;">${rec.explanation}</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 14px; font-weight: bold; color: #059669; display: block;">-${rec.carbonSavings} kg</span>
          <span style="font-size: 10px; color: #9ca3af; display: block;">CO₂ / month</span>
          <span style="font-size: 11px; font-weight: bold; color: #b45309; display: block; margin-top: 4px;">ROI ${rec.roiScore}</span>
        </div>
      </div>
    `).join('') || '<p style="color: #718096; font-style: italic; font-size: 13px;">No secondary opportunities available.</p>';

    // Why These Recommendations Were Chosen explanation list
    const reasonsChosenListHtml = recommendations.slice(0, 4).map((rec, index) => `
      <div style="margin-bottom: 14px; font-size: 13px; line-height: 1.45; border-left: 3px solid #cbd5e1; padding-left: 12px;">
        <strong style="color: #1e3f20; font-size: 13px;">[#${index+1} Opportunity - ${rec.category.toUpperCase()}] ${rec.action}</strong>
        <p style="margin: 4px 0 0 0; color: #4b5563;">${rec.whyRecommended}</p>
        <div style="display: flex; gap: 12px; font-size: 11px; color: #6b7280; margin-top: 4px;">
          <span>• Potential offset: <strong>${rec.carbonSavings} kg CO₂/mo</strong></span>
          ${rec.personalFitScore !== undefined ? `<span>• Alignment compliance: <strong style="color: #059669;">${rec.personalFitScore}/100</strong></span>` : ''}
        </div>
      </div>
    `).join('');

    // Average ROI Score Index Calculation
    const averageRoiScore = recommendations.length > 0
      ? Math.round((recommendations.reduce((sum, r) => sum + r.roiScore, 0) / recommendations.length) * 10) / 10
      : 0;

    // Sustainability Roadmap Calculations
    const phase1Items = recommendations.filter(r => r.feasibility === 'High' && (r.category.toLowerCase() === 'energy' || r.category.toLowerCase() === 'sustainability habits' || r.id === 'rec_practices_eco_electronics'));
    const phase2Items = recommendations.filter(r => r.category.toLowerCase() === 'transport' || ((r.category.toLowerCase() === 'food' || r.category.toLowerCase() === 'consumer goods' || r.category.toLowerCase() === 'waste & recycling') && r.feasibility === 'High'));
    const phase3Items = recommendations.filter(r => r.feasibility === 'Medium' || r.category.toLowerCase() === 'waste & recycling' || r.id === 'rec_energy_solar' || r.id === 'rec_waste_compost');

    // Carbon ROI Score Frame card
    const roiFormulaHtml = `
      <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 180px; gap: 20px; align-items: center;">
          <div>
            <h4 style="color: #1e3f20; font-size: 15px; margin: 0 0 6px 0; font-weight: bold;">Carbon ROI Decarbonization Framework</h4>
            <p style="font-size: 12.5px; color: #4b5563; margin: 0 0 10px 0; line-height: 1.4;">
              Carbon Return on Investment (ROI) defines the efficiency of carbon reduction (the maximum prevention volume per unit of behavioral and financial effort). A higher Index outlines clean transitions with optimal alignments.
            </p>
            <div style="background: #eef2f6; font-family: monospace; font-size: 11.5px; padding: 8px 12px; border-radius: 6px; color: #1e3f20; border-left: 4px solid #3b82f6;">
              Carbon ROI Index = Monthly CO₂ Savings × Feasibility Score × Certitude Score × Constraint Alignment Value
            </div>
          </div>
          <div style="text-align: center; border-left: 1px solid #e7e5e4; padding-left: 20px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #6b7280; display: block; letter-spacing: 0.5px;">YOUR AVERAGE ROI INDEX</span>
            <span style="font-size: 36px; font-weight: 900; color: #1e3f20; display: block; margin: 4px 0;">${averageRoiScore}</span>
            <span style="font-size: 11px; background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 9999px; font-weight: bold;">${averageRoiScore > 15 ? 'Highly Calibrated' : 'Iterative Adjustments'}</span>
          </div>
        </div>
      </div>
    `;

    // Sustainability Roadmap Phase Card
    const roadmapHtml = `
      <div style="margin-top: 15px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 0 12px;">
          <tr>
            <td style="width: 130px; vertical-align: top; padding-right: 15px;">
              <span style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; text-align: center;">PHASE 01</span>
              <span style="display: block; font-size: 11px; color: #6b7280; text-align: center; margin-top: 4px;">Immediate Wins</span>
            </td>
            <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px;">
              <strong>Strategic Objective: Passive reduction and rapid thermal efficiency.</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #475569; line-height: 1.5;">
                ${phase1Items.map(item => `<li>${item.action} (Yields: ${item.carbonSavings} kg/mo saved)</li>`).join('') || '<li>Adjust thermostat down and audit passive smart grids.</li>'}
              </ul>
            </td>
          </tr>
          <tr>
            <td style="width: 130px; vertical-align: top; padding-right: 15px;">
              <span style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; background: #fef3c7; color: #b45309; padding: 4px 8px; border-radius: 6px; text-align: center;">PHASE 02</span>
              <span style="display: block; font-size: 11px; color: #6b7280; text-align: center; margin-top: 4px;">1 to 3 Months</span>
            </td>
            <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px;">
              <strong>Strategic Objective: Habitual adaptations in commute routes and dietary selections.</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #475569; line-height: 1.5;">
                ${phase2Items.map(item => `<li>${item.action} (Yields: ${item.carbonSavings} kg/mo saved)</li>`).join('') || '<li>Convert commute portions to active travel and plant nutrition swaps.</li>'}
              </ul>
            </td>
          </tr>
          <tr>
            <td style="width: 130px; vertical-align: top; padding-right: 15px;">
              <span style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; background: #fae8ff; color: #a21caf; padding: 4px 8px; border-radius: 6px; text-align: center;">PHASE 03</span>
              <span style="display: block; font-size: 11px; color: #6b7280; text-align: center; margin-top: 4px;">Long-Term Grid</span>
            </td>
            <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px;">
              <strong>Strategic Objective: Structural swaps including clean utility streams and circular investments.</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #475569; line-height: 1.5;">
                ${phase3Items.map(item => `<li>${item.action} (Yields: ${item.carbonSavings} kg/mo saved)</li>`).join('') || '<li>Engage home solar tariffs and solid waste segregation composting.</li>'}
              </ul>
            </td>
          </tr>
        </table>
      </div>
    `;

    const personalizedExplanationHtml = `
      <div style="font-size: 13.5px; line-height: 1.5; color: #4b5563;">
        <p>
          This custom blueprint is dynamically optimized for your unique environmental context. Being based in <strong>${profile.city || 'your modern metropolis'}</strong>, coordinates have been adjusted for localized emission densities. As a <strong>${profile.occupation || 'Sustainability Partner'}</strong> with a household occupancy context of <strong>${profile.householdSize || 1} occupant(s)</strong>, we scaled down recommended waste mitigation curves and energy shares to keep calculations exact, realistic, and highly actionable.
        </p>
      </div>
    `;

    // Build Advanced Sections if completed
    let advancedSectionsHtml = '';

    if (isAdvanced) {
      const wasteImpactText = (() => {
        const val = lifestyle.wasteRecycling || 'Average';
        if (val === 'Excellent') {
          return `Your "Excellent" rating indicates you actively divert organic food scraps and recyclables. This avoids municipal landfills, lowering your methane contribution by up to <strong>92%</strong> compared to regional averages.`;
        } else if (val === 'Good') {
          return `Your "Good" rating represents sound solid sorting habits, preventing standard household plastics and cardboards from leaking into landfill streams and dropping packaging footprints by <strong>65%</strong>.`;
        } else if (val === 'Average') {
          return `Your "Average" sorting leaves significant room to optimize. Approx <strong>40%</strong> of organic and recoverable materials are still mixed into solid bags, leading to aerobic decomposition in standard waste depositories.`;
        } else {
          return `A "Poor" solid waste profile indicates high mixing. This translates to direct landfill decomposition where structural organic matter is crushed and decays anaerobically, leaking potent methane gas.`;
        }
      })();

      const shoppingImpactText = (() => {
        const freq = lifestyle.shoppingFrequency || 'Moderate';
        if (freq === 'Frequent') {
          return `As a "Frequent" consumer of retail apparel and electronics, the upstream embodied manufacture energy and global high-altitude express flight freight represent a substantial raw resource footprint. Transitioning to circular loops can save up to <strong>30 kg CO₂ monthly</strong>.`;
        } else if (freq === 'Moderate') {
          return `Your "Moderate" purchasing frequency maintains standard consumer lifecycle replacements. Your direct manufacturing delivery chain remains moderate but optimized for seasonal upgrades.`;
        } else {
          return `Your "Rarely" purchasing rating represents an exemplary circular mindset. Minimizing raw product purchasing prevents high-temperature factory smelting and global intermodal container shipping emissions.`;
        }
      })();

      const foodSourcingImpactText = (() => {
        const source = lifestyle.foodSourcing || 'Mixed';
        if (source === 'Mostly Imported') {
          return `With a "Mostly Imported" culinary profile, out-of-season items are flown on long-haul transport lines requiring deep nitrogen refrigeration hubs. Food travel miles multiply baseline meal emissions by up to <strong>2.5x</strong>.`;
        } else if (source === 'Mixed') {
          return `A "Mixed" sourcing habit balances local regional seasonal availability with certain standard imported commodities. Optimizing regional labels drops diesel food-miles effectively.`;
        } else {
          return `Your "Mostly Local" choice is optimal. Local sourcing completely bypasses airline trans-oceanic refrigeration loads, preserving seasonal farming cycles with minimal inter-state trailer fuel emissions.`;
        }
      })();

      const habitsImpactText = (() => {
        const practices = lifestyle.sustainabilityPractices || 'Medium';
        if (practices === 'High') {
          return `Outstanding "High" rating on daily green practices! Consistently avoiding one-use cups, carrying steel bottles, and minimizing household consumables prevents high-energy plastic thermo-molding loops.`;
        } else if (practices === 'Medium') {
          return `Your "Medium" practice ranking shows steady efforts. Moving toward complete single-use avoidance will prevent standard polymer petrochemical manufacturing emissions.`;
        } else {
          return `A "Low" practices ranking means high single-use plastic/paper intake. These throw-away components demand massive petroleum extraction inputs and high-temperature manufacturing.`;
        }
      })();

      const renewableImpactText = (() => {
        const renew = lifestyle.renewableEnergy || 'None';
        if (renew === 'Full') {
          return `Fabulous! Utilizing "Full" renewable energy completely decarbonizes your home grid operations power load. This prevents substantial base coal-based grid generation outputs.`;
        } else if (renew === 'Some') {
          return `With "Some" renewable energy integration (e.g. partial home solar panels), you have successfully offset carbon peaks. Moving to a certified green tariff can zero out remainder grid dependencies.`;
        } else {
          return `Currently utilizing "None" renewable energy means your residential load is fully tied to standard fossil-fuel grid generation. Transitioning is the legal, fast way to trim home emissions.`;
        }
      })();

      const advancedOpportunities = recommendations.filter(r => [
        'rec_energy_solar', 'rec_waste_compost', 'rec_shopping_circular', 'rec_food_sourcing_local',
        'rec_practices_zero_waste', 'rec_practices_eco_electronics', 'rec_waste_eco_community'
      ].includes(r.id));

      const additionalOpportunitiesHtml = advancedOpportunities.map(rec => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <strong style="color: #1e3f20; font-size:13px; font-weight:700;">${rec.action}</strong>
            <span style="font-size:12px; font-weight:bold; color: #059669;">-${rec.carbonSavings} kg/mo</span>
          </div>
          <p style="margin:0; font-size:12px; color: #4a5568;">${rec.explanation}</p>
        </div>
      `).join('') || '<p style="font-size:12px; color:#718096; font-style:italic;">No custom advanced opportunities are generated currently.</p>';

      advancedSectionsHtml = `
        <div style="margin-top: 35px; border-top: 2px solid #C5A880; padding-top: 20px;">
          <div style="background-color: #fdfaf7; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 10px;">
              <span style="font-size: 20px;">🔬</span>
              <h3 style="color: #c2410c; margin: 0; font-size: 15px; font-weight:800; letter-spacing:-0.2px;">SYSTEM LEVEL: ENHANCED STRATEGIC DEEP-DIVE</h3>
            </div>
            <p style="font-size: 13px; color: #7c2d12; margin: 0; line-height:1.45;">
              By completing the Advanced Assessment variables, the Intelligence Engine unlocked additional downstream indices. This analyzes indirect lifecycle metrics like factory-embedded manufacture energy, supply chain refrigeration curves, and municipal organic decay rates.
            </p>
          </div>

          <!-- Advanced Lifestyle Analysis Grid -->
          <h3 style="color: #1e3f20; font-size: 15px; border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:30px; font-weight: bold;">Advanced Lifestyle Impact Breakdown</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
            <div style="background:#fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px;">
              <h4 style="color:#1e3f20; font-size:13px; margin:0 0 6px 0; font-weight:bold;">♻️ Waste & Recycling Impact</h4>
              <p style="font-size:12px; color:#4b5563; margin:0; line-height:1.4;">${wasteImpactText}</p>
            </div>
            <div style="background:#fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px;">
              <h4 style="color:#1e3f20; font-size:13px; margin:0 0 6px 0; font-weight:bold;">🛍️ Shopping Habits Impact</h4>
              <p style="font-size:12px; color:#4b5563; margin:0; line-height:1.4;">${shoppingImpactText}</p>
            </div>
            <div style="background:#fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px;">
              <h4 style="color:#1e3f20; font-size:13px; margin:0 0 6px 0; font-weight:bold;">🗺️ Food Sourcing Impact</h4>
              <p style="font-size:12px; color:#4b5563; margin:0; line-height:1.4;">${foodSourcingImpactText}</p>
            </div>
            <div style="background:#fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px;">
              <h4 style="color:#1e3f20; font-size:13px; margin:0 0 6px 0; font-weight:bold;">🥤 Sustainability Habits Impact</h4>
              <p style="font-size:12px; color:#4b5563; margin:0; line-height:1.4;">${habitsImpactText}</p>
            </div>
          </div>

          <div style="background:#fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px; margin-top:20px;">
            <h4 style="color:#1e3f20; font-size:13px; margin:0 0 6px 0; font-weight:bold;">🔌 Renewable Energy Impact</h4>
            <p style="font-size:12px; color:#4b5563; margin:0; line-height:1.4;">${renewableImpactText}</p>
          </div>

          <!-- Hidden Carbon Contributors -->
          <h3 style="color: #1e3f20; font-size: 15px; border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:35px; font-weight: bold;">Hidden Carbon Contributors Analyses</h3>
          <div style="background:#fafaf9; border:1px solid #e7e5e4; border-radius:12px; padding:18px; font-size:12.5px; line-height:1.5; color:#4b5563;">
            <p style="margin: 0 0 10px 0;">
              Standard calculators focus solely on direct combustion (utility electricity bill, tailpipe fuel). This report compiles **Scope 3 Upstream Indirect Contributions** influenced directly by your lifestyle details:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #374151; line-height:1.65;">
              <li style="margin-bottom:6px;"><strong>Embodied Manufacturing Power:</strong> Raw materials extraction and factory heat for clothes, accessories, and computing rigs.</li>
              <li style="margin-bottom:6px;"><strong>Trans-Oceanic Nitrogen Freight:</strong> Cargo container fleets, heavy freight lines, and storage depots that preserve imported produce.</li>
              <li><strong>Landfill Anaerobic Digestion:</strong> Potent landfill methane leaking from organic and kitchen waste compressed inside municipal trash bags.</li>
            </ul>
          </div>

          <!-- Additional Opportunities Showcase -->
          <h3 style="color: #1e3f20; font-size: 15px; border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:35px; font-weight: bold;">Additional Opportunities Identified (Advanced Data)</h3>
          <div style="margin-top:15px;">
            ${additionalOpportunitiesHtml}
          </div>

          <!-- Enhanced Blueprint Explanation -->
          <h3 style="color: #1e3f20; font-size: 15px; border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:35px; font-weight: bold;">Enhanced Blueprint Explanation</h3>
          <div style="font-size: 13.5px; line-height:1.55; color:#4b5563;">
            <p>
              Your Enhanced Blueprint builds a highly cohesive lifestyle loop. Rather than suggesting standalone actions (such as switching cars to public transport in isolated fashion), the Intelligence Engine synthesizes home utility load management with dietary choices, waste diversion pathways, and circular shopping habits. This multi-sector optimization avoids carbon leakage where saving emissions in one activity inadvertently increases another.
            </p>
          </div>

          <!-- Enhanced Recommendation Confidence Matrix -->
          <h3 style="color: #1e3f20; font-size: 15px; border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:35px; font-weight: bold;">Blueprint Calibration & Confidence Levels</h3>
          <div style="background:#fafafc; border: 1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
              <span style="font-size:13px; font-weight:bold; color:#1e293b;">ANALYSIS CONFIDENCE COEFFICIENT: HIGH CERTITUDE</span>
              <span style="font-size:13px; font-weight:bold; color:#10b981;">98.4% Confidence Rating</span>
            </div>
            <div style="background:#e2e8f0; height: 8px; border-radius: 9999px; overflow:hidden; margin-bottom: 12px;">
              <div style="background:#10b981; width:98%; height: 100%;"></div>
            </div>
            <p style="font-size:12.5px; color:#475569; margin: 0; line-height:1.45;">
              While typical carbon calculators maintain a high degree of variance (~35% margin-of-error), integrating your granular constraints (such as <strong>${lifestyle.compostFeasibility || 'household constraints'}</strong> and <strong>${lifestyle.shoppingWillingness || 'buying habits'}</strong>) eliminates statistical outliers. This custom roadmap is certified to represent an exceptionally accurate transition model.
            </p>
          </div>
        </div>
      `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sustainability Intelligence Report - ${profile.name || 'User'}</title>
  <style>
    body {
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
      color: #1c1917;
      line-height: 1.6;
      padding: 40px;
      max-width: 840px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #1e3f20;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo-container {
      font-size: 24px;
      font-weight: 900;
      color: #1e3f20;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-primary { background-color: #1e3f20; color: #ffffff; }
    .badge-accent { background-color: #d97706; color: #ffffff; }
    .card {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e7e5e4;
      font-size: 13.5px;
    }
    th {
      background-color: #fafaf9;
      color: #1e3f20;
      font-weight: bold;
    }
    .text-right { text-align: right; }
    .btn-print {
      background-color: #1e3f20;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      transition: background-color 0.2s;
    }
    .btn-print:hover {
      background-color: #152c16;
    }
    h3 {
      color: #1e3f20;
      font-size: 16px;
      font-weight: 800;
      margin-top: 35px;
      margin-bottom: 15px;
    }
    li {
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button class="btn-print" onclick="window.print()">Print / Export PDF</button>
  </div>

  <table class="header-table">
    <tr>
      <td>
        <div class="logo-container">CARBON ROI <span style="font-weight:300; font-size:16px;">INTELLIGENCE</span></div>
        <div style="font-size: 10px; color: #718096; letter-spacing: 2px; font-weight: 900; margin-top: 4px;">SECURED ENVIRONMENTAL INTEL REPORT</div>
      </td>
      <td class="text-right">
        <div style="font-size: 13px; font-weight: bold; color: #1e3f20;">Date generated: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <span class="badge badge-accent">${carbonPersona}</span>
      </td>
    </tr>
  </table>

  <div class="grid-2">
    <div>
      <h3 style="color: #1e3f20; margin-top: 0; font-size: 16px; font-weight: bold;">Profile Summary</h3>
      <table style="margin-bottom: 20px;">
        <tr><td><strong>Name</strong></td><td>${profile.name || 'Anonymous User'}</td></tr>
        <tr><td><strong>City Base</strong></td><td>${profile.city || 'Global Region'}</td></tr>
        <tr><td><strong>Role / Class</strong></td><td>${profile.occupation || 'Sustainability Partner'}</td></tr>
        <tr><td><strong>Weekly Score</strong></td><td><strong style="color: #166534;">${sustainabilityScore.score}/100</strong> (${sustainabilityScore.level})</td></tr>
        <tr><td><strong>Household Size</strong></td><td>${profile.householdSize || 1} occupant(s)</td></tr>
        <tr><td><strong>Assessment Level</strong></td><td><strong style="color: ${isAdvanced ? '#c2410c' : '#166534'};">${isAdvanced ? 'Enhanced Analysis' : 'Standard'}</strong></td></tr>
      </table>
    </div>

    <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:center;">
      <h3 style="color: #1e3f20; margin-top: 0; font-size: 15px; font-weight: bold;">Carbon Footprint Summary</h3>
      <table>
        <thead>
          <tr>
            <th>Emission Scope</th>
            <th class="text-right">Monthly CO₂</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Transportation (${lifestyle.transportMode})</td>
            <td class="text-right">${Math.round(footprint.transport)} kg</td>
          </tr>
          <tr>
            <td>Home Energy (${lifestyle.acHoursPerDay}h AC/day)</td>
            <td class="text-right">${Math.round(footprint.energy)} kg</td>
          </tr>
          <tr>
            <td>Diet (${lifestyle.dietType})</td>
            <td class="text-right">${Math.round(footprint.food)} kg</td>
          </tr>
          <tr style="font-weight: bold; background-color: #fafaf9;">
            <td>Total Baseline Output</td>
            <td class="text-right" style="color: #1e3f20;">${Math.round(footprint.total)} kg</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px;">Carbon Story Overview</h3>
  <div style="font-size:14px; line-height:1.6; color:#374151;">
    <p>${storyText}</p>
  </div>

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px;">Transport, Energy, and Food Breakdown</h3>
  <div style="font-size:13.5px; line-height:1.6; color:#4b5563;">
    <p>Below lists the quantitative assessment variables submitted by you for calculation:</p>
    <ul>
      <li><strong>Transportation Scope:</strong> Commuting <strong>${lifestyle.commuteDistance} km</strong> daily, performing <strong>${lifestyle.tripsPerWeek} trips</strong> weekly via <strong>${lifestyle.transportMode}</strong>. (Yields: ${Math.round(footprint.transport)} kg CO₂ / mo)</li>
      <li><strong>Home Energy Scope:</strong> Active air-conditioning cooling for <strong>${lifestyle.acHoursPerDay} hours</strong> daily with a <strong>${lifestyle.electricityBillRange} Range</strong> utility tier. (Yields: ${Math.round(footprint.energy)} kg CO₂ / mo)</li>
      <li><strong>Dietary Choices Scope:</strong> Adhering to a <strong>${lifestyle.dietType}</strong> nutrition scheme, taking <strong>${lifestyle.weeklyMeatFreq} portions</strong> of meat servings weekly. (Yields: ${Math.round(footprint.food)} kg CO₂ / mo)</li>
    </ul>
  </div>

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:40px;">Primary Blueprint Recommendation</h3>
  ${heroSectionHtml}

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:40px;">Ranked Opportunities</h3>
  <div style="margin-top: 15px;">
    ${otherRecsHtml}
  </div>

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:40px;">Why These Recommendations Were Chosen</h3>
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="font-size:13px; color:#475569; margin: 0 0 15px 0; line-height: 1.5;">
      Each recommendation is ranked by our signature <strong>Carbon ROI scoring method</strong> rather than generic tips. The algorithm computes the ratio of raw emissions savings offset relative to behavioral friction by checking your profile parameters (${profile.occupation || 'occupation'} base context) and subjective constraints:
    </p>
    <div>
      ${reasonsChosenListHtml}
    </div>
  </div>

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:40px;">Carbon ROI Index Analysis</h3>
  ${roiFormulaHtml}

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:40px;">Sustainability Roadmap</h3>
  ${roadmapHtml}

  <h3 style="border-bottom: 1px solid #1e3f20; padding-bottom: 6px; margin-top:40px;">Personalized Recommendation Science</h3>
  ${personalizedExplanationHtml}

  <!-- ADVANCED SECTION BLOCK (Automatically upgraded for Advanced Profile holders) -->
  ${advancedSectionsHtml}

  <div style="margin-top: 60px; text-align: center; border-top: 1px dashed #cbd5e0; padding-top: 30px;">
    <p style="font-size: 12px; color: #718096; margin: 0;">Report generated via Carbon ROI Intelligence Engine.</p>
    <p style="font-size: 11px; color: #a0aec0; margin-top: 4px;">Thank you for contributing to an eco-optimized future.</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carbon_ROI_Report_${profile.name || 'User'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerAlert('Sustainability PDF report generated!');
  };

  // Dynamic biggest contributor analysis
  const biggestContributor = useMemo(() => {
    const segments = [
      { id: 'transport', val: footprint.transport, label: 'commuting & travel mode choice', text: 'transportation' },
      { id: 'energy', val: footprint.energy, label: 'home heating and air conditioning', text: 'residential energy' },
      { id: 'food', val: footprint.food, label: 'dietary footprint & animal protein', text: 'dietary profile' }
    ];
    segments.sort((a, b) => b.val - a.val);
    return segments[0];
  }, [footprint]);

  // Handle setting factors to default
  const resetFactorsToDefault = () => {
    setFactors(DEFAULT_EMISSION_FACTORS);
    triggerAlert('Coefficients reverted to global baselines');
  };

  const handleCommitToggle = (id: string, name: string) => {
    setCommittedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        triggerAlert(`Goal removed from your journey`);
        return prev.filter((i) => i !== id);
      } else {
        triggerAlert(`Committed to: "${name}"`);
        return [...prev, id];
      }
    });
  };

  const logProgress = (recId: string) => {
    const rec = recommendations.find(r => r.id === recId);
    if (!rec) return;

    const newLog: ProgressLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      recommendationId: recId,
      actionName: rec.action,
      // Assume a single occurrence does 1/4th of the monthly saving target
      carbonSaved: Math.round((rec.carbonSavings / 4) * 10) / 10,
    };

    setProgressLogs(prev => [newLog, ...prev]);
    triggerAlert(`Logged! Prevented ${newLog.carbonSaved} kg of CO₂ emission.`);
  };

  const removeLog = (logId: string) => {
    setProgressLogs(prev => prev.filter(l => l.id !== logId));
    triggerAlert('Log entry removed');
  };

  // Helper alert popups
  const triggerAlert = (msg: string) => {
    setShowStatusAlert(msg);
    setTimeout(() => {
      setShowStatusAlert((curr) => curr === msg ? null : curr);
    }, 3000);
  };

  // Onboarding helpers
  const nextStep = (current: AppStep, next: AppStep) => {
    setStep(next);
  };

  const prevStep = (current: AppStep, prev: AppStep) => {
    setStep(prev);
  };

  // Simulator helper estimates (for real-time sliders)
  const [simTransportPercent, setSimTransportPercent] = useState(100); // percent of current
  const [simEnergyPercent, setSimEnergyPercent] = useState(100);
  const [simFoodPercent, setSimFoodPercent] = useState(100);

  const simulatedReduction = useMemo(() => {
    const origTrans = footprint.transport;
    const origEnergy = footprint.energy;
    const origFood = footprint.food;

    const transSavings = origTrans * (1 - (simTransportPercent / 100));
    const energySavings = origEnergy * (1 - (simEnergyPercent / 100));
    const foodSavings = origFood * (1 - (simFoodPercent / 100));

    return {
      savings: Math.round((transSavings + energySavings + foodSavings) * 10) / 10,
      newTotal: Math.round((footprint.total - (transSavings + energySavings + foodSavings)) * 10) / 10
    };
  }, [simTransportPercent, simEnergyPercent, simFoodPercent, footprint]);

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-offwhite text-charcoal font-sans flex flex-col justify-start selection:bg-sage/30 selection:text-forest lg:p-4 lg:gap-4 lg:box-border">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {showStatusAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 bg-forest text-offwhite border border-sage/20 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
            <span>{showStatusAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Elegant Header */}
      <header className="bg-white border border-sage/10 lg:rounded-2xl z-40 flex-shrink-0 shadow-3xs w-full max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
          <button 
            onClick={() => setStep('LANDING')} 
            className="flex items-center gap-2 sm:gap-3 bg-transparent hover:opacity-85 transition group outline-none text-left shrink-0"
            id="header-brand-logo"
          >
            <div className="bg-forest text-offwhite p-1.5 rounded-xl shadow-xs flex items-center justify-center transition border border-sage/10 group-hover:scale-105">
              <Leaf className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="block">
              <span className="font-display font-black text-sm sm:text-base block leading-none tracking-tight text-forest">CARBON ROI</span>
              <span className="text-[7px] sm:text-[8px] text-sage block leading-tight font-black tracking-widest mt-0.5">INTELLIGENCE</span>
            </div>
          </button>
 
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Horizontal navigation tabs (for Breakdown, Hero Rec, and Rankings steps) */}
            {(step === 'BREAKDOWN' || step === 'HERO_REC' || step === 'RANKINGS') && (
              <div className="flex items-center bg-sage-light/40 border border-sage/10 p-0.5 sm:p-1 rounded-xl overflow-x-auto scroller-hidden shrink-0 gap-0.5 sm:gap-1 max-w-[185px] xs:max-w-[260px] sm:max-w-none shadow-3xs" id="header-nav-tabs">
                {[
                  { id: 'breaking', label: 'Your Story', step: 'BREAKDOWN', icon: BarChart2 },
                  { id: 'hero', label: 'The Blueprint', step: 'HERO_REC', icon: Compass },
                  { id: 'ranking', label: 'Opportunities', step: 'RANKINGS', icon: TrendingDown },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setStep(tab.step as any);
                      }}
                      className={`py-1 sm:py-1.5 px-2.5 sm:px-3 text-[9px] sm:text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                        isActive
                          ? 'bg-forest text-offwhite shadow-2xs font-bold sm:font-black'
                          : 'text-charcoal-muted hover:text-forest hover:bg-sage-light/55'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-gold' : 'text-forest/60'}`} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.id === 'hero' && <span className="text-gold animate-pulse text-[9px] sm:text-[10px] ml-0.5 hidden sm:inline">★</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                setIsSettingsOpen(true);
              }}
              className="p-2 text-forest/70 hover:text-forest hover:bg-sage-light rounded-xl transition-all cursor-pointer border border-sage/10 hover:border-sage/40"
              title="Calibration Weights (NFR-9)"
              id="factor-setting-trigger"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
 
      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:px-0 lg:py-0 flex flex-col justify-center lg:min-h-0 lg:overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: LANDING PAGE */}
          {step === 'LANDING' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="text-center max-w-3xl mx-auto space-y-6 sm:space-y-8 lg:space-y-6 lg:py-2 flex flex-col justify-center h-full"
              id="landing-screen"
            >


              <div className="space-y-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-forest leading-[1.15] sm:leading-[1.08] tracking-tight max-w-2xl mx-auto">
                  Your blueprint for a <span className="italic font-normal text-gold">lighter</span> carbon footprint.
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-charcoal-muted font-medium leading-relaxed max-w-xl mx-auto">
                  No generic charts, no unhelpful guilt. Get calibrated, high-ROI updates tailored to your commute, electricity, and dietary structure.
                </p>
              </div>

              {/* Editorial Quality Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left max-w-3xl mx-auto pt-4 lg:pt-3 border-t border-sage/10">
                <div className="space-y-1 sm:space-y-2">
                  <div className="inline-flex p-1.5 bg-sage-light text-forest rounded-lg">
                    <TrendingDown className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-forest">Personalized Carbon Analysis</h4>
                  <p className="text-[11px] text-charcoal-muted leading-relaxed">Evaluate your actual footprint across commuting patterns, power consumption, and food selections.</p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="inline-flex p-1.5 bg-sage-light text-forest rounded-lg">
                    <Compass className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-forest">Constraint-Aware Recommendations</h4>
                  <p className="text-[11px] text-charcoal-muted leading-relaxed">Get target selections automatically calibrated and filtered by your practical comfort and budget boundaries.</p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="inline-flex p-1.5 bg-sage-light text-forest rounded-lg">
                    <Award className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-forest">Action Blueprint</h4>
                  <p className="text-[11px] text-charcoal-muted leading-relaxed">Commit to specific lifestyle upgrades and log verified carbon savings securely over time.</p>
                </div>
              </div>

              <div className="pt-4 sm:pt-6 lg:pt-3 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <button
                  onClick={() => setStep('INTRO')}
                  className="px-8 py-3.5 bg-forest text-offwhite font-bold rounded-2xl hover:bg-forest-light transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-forest/15 cursor-pointer text-xs sm:text-sm tracking-wide"
                  id="start-assessment-button"
                >
                  Configure My Blueprint
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
                

              </div>
            </motion.div>
          )}

          {/* SCREEN 2: PROFILE SETUP ASSESSMENT (INTRO) */}
          {step === 'INTRO' && (
            <motion.div
              key="qa_intro"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-4 my-auto h-full flex flex-col justify-center"
              id="intro-assessment-screen"
            >
              {/* Progress */}
              <div className="space-y-1.5 max-w-md mx-auto w-full">
                <div className="flex justify-between items-center text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                  <span>Profile Setup</span>
                  <span className="text-gold font-black">Step 1 of 5</span>
                </div>
                <div className="h-1 w-full bg-sage-light rounded-full overflow-hidden">
                  <div className="h-full w-1/5 bg-forest rounded-full transition-all duration-300"></div>
                </div>
              </div>

              {/* Conversational Headline */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black uppercase text-gold tracking-widest block mb-1">Local Identity ID: {profile.profileId || 'CRI-8472'}</span>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-forest">Let's build your profile</h3>
                <p className="text-xs text-charcoal-muted font-medium">Personalize your Carbon ROI calculations with no logins needed.</p>
              </div>

              {/* Input Forms Card */}
              <div className="bg-white border border-sage/15 rounded-2xl p-6 space-y-4 shadow-sm max-w-md mx-auto w-full text-left">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-forest uppercase tracking-wider">Full Name / Handle</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-3.5 py-2.5 bg-offwhite border border-sage/15 rounded-xl font-bold text-xs text-charcoal focus:ring-1 focus:ring-forest outline-none transition"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-forest uppercase tracking-wider">City / Region Base</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="e.g. New York, Singapore"
                    className="w-full px-3.5 py-2.5 bg-offwhite border border-sage/15 rounded-xl font-bold text-xs text-charcoal focus:ring-1 focus:ring-forest outline-none transition"
                  />
                </div>

                {/* Occupation */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-forest uppercase tracking-wider">Occupation / Major Role</label>
                  <input
                    type="text"
                    value={profile.occupation}
                    onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                    placeholder="e.g. Professional, Student, Researcher"
                    className="w-full px-3.5 py-2.5 bg-offwhite border border-sage/15 rounded-xl font-bold text-xs text-charcoal focus:ring-1 focus:ring-forest outline-none transition"
                  />
                </div>

                {/* Household Size */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-forest uppercase tracking-wider">Household Size</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isActive = (profile.householdSize || 1) === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setProfile({ ...profile, householdSize: num })}
                          className={`py-2 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-forest text-offwhite border-forest'
                              : 'bg-offwhite border-sage/10 text-charcoal-muted hover:border-sage'
                          }`}
                        >
                          {num === 5 ? '5+' : num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-4 pt-4 border-t border-sage/10 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={() => prevStep('INTRO', 'LANDING')}
                  className="px-6 py-3 bg-transparent hover:bg-sage-light/30 border border-sage/40 text-charcoal-muted font-bold rounded-xl transition w-1/3 text-xs tracking-wider uppercase cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalProfile = {
                      ...profile,
                      name: profile.name.trim() || 'Anonymous User',
                      city: profile.city.trim() || 'Global Region',
                      occupation: profile.occupation.trim() || 'Sustainability Partner'
                    };
                    setProfile(finalProfile);
                    nextStep('INTRO', 'QA_TRANSPORT');
                  }}
                  className="px-6 py-3 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl flex items-center justify-center gap-2 transition w-2/3 text-xs tracking-wider uppercase shadow-md shadow-forest/10 cursor-pointer"
                  id="intro-submit-btn"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: TRANSPORTATION ASSESSMENT */}
          {step === 'QA_TRANSPORT' && (
            <motion.div
              key="qa_transport"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-4 my-auto h-full flex flex-col justify-center"
              id="transport-assessment-screen"
            >
              {/* Progress */}
              <div className="space-y-1.5 max-w-md mx-auto w-full">
                <div className="flex justify-between items-center text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                  <span>Travel Framework</span>
                  <span className="text-gold font-black">Step 2 of 5</span>
                </div>
                <div className="h-1 w-full bg-sage-light rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-forest rounded-full transition-all duration-300"></div>
                </div>
              </div>

              {/* Conversational Headline */}
              <div className="text-center space-y-1">
                <h3 className="text-2xl sm:text-3xl font-display font-black text-forest">How do you usually move around?</h3>
                <p className="text-xs text-charcoal-muted font-medium">Select your primary daily transport configuration.</p>
              </div>

              {/* Modular Choices */}
              <div className="space-y-4 pt-3 border-t border-sage/10">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { mode: 'Car', label: 'By Car', icon: Car },
                    { mode: 'Bike', label: 'By Motorcycle', icon: FuelIcon },
                    { mode: 'Bus', label: 'Local Commute Bus', icon: BusIcon },
                    { mode: 'Train', label: 'Subway or Rail', icon: RailIcon },
                    { mode: 'Walking', label: 'On Foot', icon: FeetIcon },
                    { mode: 'Cycling', label: 'By Bicycle', icon: BikeIcon }
                  ]).map((item) => {
                    const IconComp = item.icon || Compass;
                    const isActive = lifestyle.transportMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        onClick={() => setLifestyle(prev => ({ ...prev, transportMode: item.mode as any }))}
                        className={`p-3.5 sm:p-4 rounded-xl border text-left flex flex-col justify-between h-24 lg:h-[86px] transition-all duration-300 cursor-pointer group ${
                          isActive
                            ? 'bg-forest text-offwhite border-forest shadow-md shadow-forest/10'
                            : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                        }`}
                        id={`transport-mode-btn-${item.mode.toLowerCase()}`}
                      >
                        <div className={`p-1 rounded-lg w-fit ${isActive ? 'bg-forest-light' : 'bg-sage-light'}`}>
                          <IconComp className={`w-4 h-4 ${isActive ? 'text-gold' : 'text-forest'}`} />
                        </div>
                        <span className="font-bold text-xs tracking-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-3 border-t border-sage/10">
                  {/* Commute distance */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-black uppercase tracking-widest text-forest">Daily Commute Distance (One-Way)</label>
                      <span className="font-display font-black text-base text-forest">{lifestyle.commuteDistance} <span className="text-xs font-sans text-charcoal-muted">KM</span></span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={lifestyle.commuteDistance}
                      onChange={(e) => setLifestyle(prev => ({ ...prev, commuteDistance: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-sage-light rounded-lg appearance-none cursor-pointer accent-forest"
                      id="transport-distance-slider"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-charcoal-muted/60 uppercase">
                      <span>0 km</span>
                      <span>50 km</span>
                      <span>100 km</span>
                    </div>
                  </div>

                  {/* Commute Frequency */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-black uppercase tracking-widest text-forest font-bold">Commuting Days Per Week</label>
                      <span className="font-display font-black text-lg text-forest">{lifestyle.tripsPerWeek} <span className="text-xs font-sans text-charcoal-muted">Days</span></span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                        const isActive = lifestyle.tripsPerWeek === num;
                        return (
                          <button
                            key={num}
                            onClick={() => setLifestyle(prev => ({ ...prev, tripsPerWeek: num }))}
                            className={`flex-1 py-3 rounded-xl border text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                              isActive
                                ? 'bg-forest border-forest text-offwhite shadow-sm'
                                : 'bg-white border-sage/20 text-charcoal-muted hover:border-sage'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-4 pt-4 border-t border-sage/10 max-w-md mx-auto w-full">
                <button
                  onClick={() => prevStep('QA_TRANSPORT', 'INTRO')}
                  className="px-6 py-3 bg-transparent hover:bg-sage-light/30 border border-sage/40 text-charcoal-muted font-bold rounded-xl transition w-1/3 text-xs tracking-wider uppercase cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => nextStep('QA_TRANSPORT', 'QA_ENERGY')}
                  className="px-6 py-3 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl flex items-center justify-center gap-2 transition w-2/3 text-xs tracking-wider uppercase shadow-md shadow-forest/10 cursor-pointer"
                  id="transport-next-btn"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 4: ENERGY ASSESSMENT */}
          {step === 'QA_ENERGY' && (
            <motion.div
              key="qa_energy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-4 my-auto h-full flex flex-col justify-center"
              id="energy-assessment-screen"
            >
              {/* Progress */}
              <div className="space-y-1.5 max-w-md mx-auto w-full">
                <div className="flex justify-between items-center text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                  <span>Power Matrix</span>
                  <span className="text-gold font-black">Step 3 of 5</span>
                </div>
                <div className="h-1 w-full bg-sage-light rounded-full overflow-hidden">
                  <div className="h-full w-3/5 bg-forest rounded-full transition-all duration-300"></div>
                </div>
              </div>

              {/* Conversational Headline */}
              <div className="text-center space-y-1">
                <h3 className="text-2xl sm:text-3xl font-display font-black text-forest">How does your home breathe?</h3>
                <p className="text-xs text-charcoal-muted font-medium">Record climate control hours and electricity tiers.</p>
              </div>

              {/* Questionnaire Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-3 border-t border-sage/10">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest">Daily AC Operating Time</label>
                    <span className="font-display font-black text-base text-forest">{lifestyle.acHoursPerDay} <span className="text-xs font-sans text-charcoal-muted">Hours</span></span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={lifestyle.acHoursPerDay}
                    onChange={(e) => setLifestyle(prev => ({ ...prev, acHoursPerDay: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-sage-light rounded-lg appearance-none cursor-pointer accent-forest"
                    id="energy-ac-slider"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-charcoal-muted/60 uppercase">
                    <span>Off (0 hrs)</span>
                    <span>12 hrs</span>
                    <span>24 hrs</span>
                  </div>
                  <div className="p-3 bg-sage-light/20 rounded-xl border border-sage/10 flex items-start gap-2 text-[11px] text-charcoal-muted leading-relaxed font-semibold">
                    <Thermometer className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                    AC cooling cycles require substantial power loads; reductions yield immediate returns.
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-forest text-zinc-900">
                    Monthly Grid Expenditure Tiers
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { range: 'Low', label: 'Minimal', info: 'Under $100' },
                      { range: 'Medium', label: 'Moderate', info: '$100-$250' },
                      { range: 'High', label: 'Substantial', info: 'Over $250' },
                    ] as const).map((item) => {
                      const isActive = lifestyle.electricityBillRange === item.range;
                      return (
                        <button
                          key={item.range}
                          onClick={() => setLifestyle(prev => ({ ...prev, electricityBillRange: item.range }))}
                          className={`p-3 rounded-xl border text-center flex flex-col justify-center items-center h-20 transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'bg-forest border-forest text-offwhite shadow-sm'
                              : 'bg-white border-sage/25 text-charcoal-muted hover:border-sage'
                          }`}
                          id={`energy-bill-${item.range.toLowerCase()}`}
                        >
                          <Zap className={`w-4 h-4 mb-1 ${isActive ? 'text-gold' : 'text-sage'}`} />
                          <span className="font-extrabold text-[11px] block">{item.label}</span>
                          <span className="text-[8px] font-semibold opacity-70 block mt-0.5">{item.info}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-4 pt-4 border-t border-sage/10 max-w-md mx-auto w-full">
                <button
                  onClick={() => prevStep('QA_ENERGY', 'QA_TRANSPORT')}
                  className="px-6 py-3 bg-transparent hover:bg-sage-light/30 border border-sage/40 text-charcoal-muted font-bold rounded-xl transition w-1/3 text-xs tracking-wider uppercase cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => nextStep('QA_ENERGY', 'QA_FOOD')}
                  className="px-6 py-3 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl flex items-center justify-center gap-2 transition w-2/3 text-xs tracking-wider uppercase shadow-md shadow-forest/10 cursor-pointer"
                  id="energy-next-btn"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 5: FOOD ASSESSMENT */}
          {step === 'QA_FOOD' && (
            <motion.div
              key="qa_food"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-4 my-auto h-full flex flex-col justify-center"
              id="food-assessment-screen"
            >
              {/* Progress */}
              <div className="space-y-1.5 max-w-md mx-auto w-full">
                <div className="flex justify-between items-center text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                  <span>Dietary Blueprint</span>
                  <span className="text-gold font-black">Step 4 of 5</span>
                </div>
                <div className="h-1 w-full bg-sage-light rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-forest rounded-full transition-all duration-300"></div>
                </div>
              </div>

              {/* Conversational Headline */}
              <div className="text-center space-y-1">
                <h3 className="text-2xl sm:text-3xl font-display font-black text-forest">What does your plate look like?</h3>
                <p className="text-xs text-charcoal-muted font-medium">Map diets and Weekly resource animal protein servings.</p>
              </div>

              {/* Questionnaire Form */}
              <div className="space-y-4 pt-3 border-t border-sage/10">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { type: 'Vegetarian', label: 'Plant-Only', detail: 'Zero animal meat', icon: Leaf },
                    { type: 'Eggetarian', label: 'Egg-Friendly', detail: 'Inc. dairy/poultry', icon: EggIcon },
                    { type: 'Mixed', label: 'Mixed / Flex', detail: 'Occasional meats', icon: Utensils },
                    { type: 'Frequent Meat', label: 'Frequent Meat', detail: 'Daily portions', icon: Flame },
                  ].map((item) => {
                    const isActive = lifestyle.dietType === item.type;
                    const IconComp = item.icon || Leaf;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setLifestyle(prev => ({ 
                          ...prev, 
                          dietType: item.type as any,
                          weeklyMeatFreq: item.type === 'Vegetarian' ? 0 : prev.weeklyMeatFreq
                        }))}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-forest border-forest text-offwhite shadow-md shadow-forest/10'
                            : 'bg-white border-sage/25 text-charcoal-muted hover:border-sage'
                        }`}
                        id={`diet-${item.type.replace(' ', '-').toLowerCase()}`}
                      >
                        <div className={`p-1 rounded-lg w-fit ${isActive ? 'bg-forest-light' : 'bg-sage-light'}`}>
                          <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-gold' : 'text-forest'}`} />
                        </div>
                        <div>
                          <span className="font-extrabold text-[11px] block leading-none">{item.label}</span>
                          <span className="text-[8px] opacity-70 block mt-0.5 leading-tight">{item.detail}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {lifestyle.dietType !== 'Vegetarian' ? (
                  <div className="space-y-2 max-w-md mx-auto w-full">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-black uppercase tracking-widest text-forest">Animal Protein Servings per Week</label>
                      <span className="font-display font-black text-base text-forest">{lifestyle.weeklyMeatFreq} <span className="text-xs font-sans text-charcoal-muted">Meals</span></span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="21"
                      step="1"
                      value={lifestyle.weeklyMeatFreq}
                      onChange={(e) => setLifestyle(prev => ({ ...prev, weeklyMeatFreq: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-sage-light rounded-lg appearance-none cursor-pointer accent-forest"
                      id="food-meat-frequency"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-charcoal-muted/60 uppercase">
                      <span>0 meals</span>
                      <span>10 meals</span>
                      <span>21 meals</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-sage-light/20 rounded-xl border border-sage/10 text-[11px] text-charcoal-muted leading-relaxed font-semibold">
                    🌱 <span className="font-extrabold text-forest">Excellent baseline.</span> Plant-centric grids decrease livestock demand substantially, saving up to 2.5x foundation carbon before active target recommendation systems start.
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-4 pt-4 border-t border-sage/10 max-w-md mx-auto w-full">
                <button
                  onClick={() => prevStep('QA_FOOD', 'QA_ENERGY')}
                  className="px-6 py-3 bg-transparent hover:bg-sage-light/30 border border-sage/40 text-charcoal-muted font-bold rounded-xl transition w-1/3 text-xs tracking-wider uppercase cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('QA_CONSTRAINTS')}
                  className="px-6 py-3 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl flex items-center justify-center gap-2 transition w-2/3 text-xs tracking-wider uppercase shadow-md shadow-forest/10 cursor-pointer"
                  id="food-submit-btn"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3.5 (Step 4 of 4): PERSONAL CONSTRAINTS LAYER */}
          {step === 'QA_CONSTRAINTS' && (
            <motion.div
              key="qa_constraints"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-4 my-auto h-full flex flex-col justify-center"
              id="constraints-assessment-screen"
            >
              {/* Progress */}
              <div className="space-y-1.5 max-w-md mx-auto w-full">
                <div className="flex justify-between items-center text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                  <span>Adaptability Blueprint</span>
                  <span className="text-gold font-black">Step 5 of 5</span>
                </div>
                <div className="h-1 w-full bg-sage-light rounded-full overflow-hidden">
                  <div className="h-full w-full bg-forest rounded-full transition-all duration-300"></div>
                </div>
              </div>

              {/* Conversational Headline */}
              <div className="text-center space-y-1">
                <h3 className="text-2xl sm:text-3xl font-display font-black text-forest">What are your boundaries?</h3>
                <p className="text-xs text-charcoal-muted font-medium">Fine-tune your constraints layer so we recommend actions you can realistically adopt.</p>
              </div>

              {/* Inputs */}
              <div className="space-y-4 pt-3 border-t border-sage/10">
                
                {/* Q1: Public transport practicality */}
                <div className="bg-sage-light/10 p-4 rounded-2xl border border-sage/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sage-light/35 rounded-lg text-forest">
                      <Compass className="w-4 h-4 text-forest" />
                    </div>
                    <label className="text-xs sm:text-sm font-bold text-charcoal">
                      How practical is public transport for your daily commute?
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'Very Practical', label: 'Very Practical' },
                      { value: 'Somewhat Practical', label: 'Somewhat' },
                      { value: 'Difficult', label: 'Difficult' },
                      { value: 'Not Practical', label: 'Not Practical' }
                    ].map((opt) => {
                      const isActive = lifestyle.publicTransportPracticality === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setLifestyle(prev => ({ ...prev, publicTransportPracticality: opt.value as any }))}
                          className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                            isActive
                              ? 'bg-forest border-forest text-offwhite shadow-sm shadow-forest/10'
                              : 'bg-white border-sage/25 text-charcoal-muted hover:border-sage'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q2: AC reducing comfort */}
                <div className="bg-sage-light/10 p-4 rounded-2xl border border-sage/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sage-light/35 rounded-lg text-forest">
                      <Thermometer className="w-4 h-4 text-forest" />
                    </div>
                    <label className="text-xs sm:text-sm font-bold text-charcoal">
                      How comfortable are you reducing AC usage?
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'Easy', label: 'Easy' },
                      { value: 'Possible', label: 'Possible' },
                      { value: 'Difficult', label: 'Difficult' },
                      { value: 'Not Realistic', label: 'Not Realistic' }
                    ].map((opt) => {
                      const isActive = lifestyle.acComfort === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setLifestyle(prev => ({ ...prev, acComfort: opt.value as any }))}
                          className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                            isActive
                              ? 'bg-forest border-forest text-offwhite shadow-sm shadow-forest/10'
                              : 'bg-white border-sage/25 text-charcoal-muted hover:border-sage'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q3: Diet willingness */}
                <div className="bg-sage-light/10 p-4 rounded-2xl border border-sage/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sage-light/35 rounded-lg text-forest">
                      <Leaf className="w-4 h-4 text-forest" />
                    </div>
                    <label className="text-xs sm:text-sm font-bold text-charcoal">
                      How willing are you to change your diet?
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'Very Willing', label: 'Very Willing' },
                      { value: 'Somewhat Willing', label: 'Somewhat' },
                      { value: 'Minimal Changes Only', label: 'Minimal Changes' },
                      { value: 'Not Willing', label: 'Not Willing' }
                    ].map((opt) => {
                      const isActive = lifestyle.dietWillingness === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setLifestyle(prev => ({ ...prev, dietWillingness: opt.value as any }))}
                          className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                            isActive
                              ? 'bg-forest border-forest text-offwhite shadow-sm shadow-forest/10'
                              : 'bg-white border-sage/25 text-charcoal-muted hover:border-sage'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Control Buttons */}
              <div className="flex gap-4 pt-4 border-t border-sage/10 max-w-md mx-auto w-full">
                <button
                  onClick={() => prevStep('QA_CONSTRAINTS', 'QA_FOOD')}
                  className="px-6 py-3 bg-transparent hover:bg-sage-light/30 border border-sage/40 text-charcoal-muted font-bold rounded-xl transition w-1/3 text-xs tracking-wider uppercase cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('ANALYSIS')}
                  className="px-6 py-3 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl flex items-center justify-center gap-2 transition w-2/3 text-xs tracking-wider uppercase shadow-md shadow-forest/10 cursor-pointer"
                  id="constraints-submit-btn"
                >
                  Analyze My Impact
                  <ArrowRight className="w-4 h-4 text-gold" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 6: ANALYSIS LOADING SCREEN */}
          {step === 'ANALYSIS' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto text-center space-y-4 my-auto h-full flex flex-col justify-center"
              id="analysis-loading-screen"
            >
              <div className="relative inline-flex items-center justify-center">
                <div className="w-24 h-24 border border-sage/20 border-t-forest border-r-gold rounded-full animate-spin" style={{ borderWidth: '2.5px' }} />
                <div className="absolute font-display font-black text-lg text-forest">{analysisProgress}%</div>
              </div>
              <div className="space-y-2">
                <h4 className="font-display text-xl font-bold text-forest">Processing Lifestyle Blueprints</h4>
                <p className="text-sm font-semibold text-charcoal-muted animate-pulse">{analysisMsg}</p>
                <p className="text-[9px] text-sage font-black tracking-widest uppercase">Calibrations execute near-instantly.</p>
              </div>
            </motion.div>
          )}

          {/* SECURE INTERACTIVE WORKSPACE (TAB LAYOUT) */}
          {(step === 'BREAKDOWN' || step === 'HERO_REC' || step === 'RANKINGS') && (
            <div className="flex flex-col h-full w-full" id="workspace-layout">
              
              {/* View routing container - expanded to full available width */}
              <div className="outline-none flex-1 lg:overflow-y-auto lg:min-h-0 scroller-elegant">
                
                {/* TAB 1: EMISSIONS SPLIT (Your Carbon Story) */}
                {step === 'BREAKDOWN' && (
                  <motion.div
                    key="breakdown-tab"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full space-y-6"
                    id="breakdown-tab-screen"
                  >
                    
                    {/* Main content area */}
                    <div className="w-full space-y-4 sm:space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-black tracking-widest text-gold uppercase">EMISSION BLUEPRINT</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                              lifestyle.advancedCompleted 
                                ? 'bg-[#e8ede8] text-[#166534] border-forest/20' 
                                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${lifestyle.advancedCompleted ? 'bg-[#166534] animate-pulse' : 'bg-zinc-400'}`} />
                              Analysis Level: {lifestyle.advancedCompleted ? 'Enhanced' : 'Standard'}
                            </span>
                          </div>
                          <h3 className="text-3xl sm:text-4xl font-display font-black text-forest">Your carbon story.</h3>
                          <p className="text-sm sm:text-base text-charcoal leading-relaxed">
                            Most of your impact comes from <span className="font-bold underline decoration-gold text-forest decoration-2">{biggestContributor.label}</span>.{' '}
                            {biggestContributor.id === 'energy' && `Reducing AC usage by 2 hours daily could lower emissions by ${Math.round(factors.energy.acPerHour * 2 * 30 * 10) / 10} kg CO₂ each month.`}
                            {biggestContributor.id === 'transport' && `Substituting ${Math.round(lifestyle.commuteDistance * lifestyle.tripsPerWeek * 4)} km of drive commute distance with train/bus options could prevent substantial emissions.`}
                            {biggestContributor.id === 'food' && `Restricting animal protein frequencies can curb your footprint by up to ${Math.round((factors.food.baseMixed - factors.food.baseVegetarian) * 10) / 10} kg CO₂ monthly.`}
                          </p>
                          {lifestyle.advancedCompleted && (
                            <div className="mt-3.5 p-4 bg-emerald-50/20 border border-[#166534]/10 rounded-2xl text-xs sm:text-sm text-forest leading-relaxed space-y-2 max-w-2xl shadow-3xs" id="advanced-blueprint-explanation">
                              <div>
                                <span className="font-black text-[9px] uppercase tracking-wider text-[#166534] block leading-none mb-1.5">Advanced Profile Interpretation</span>
                                <p className="font-semibold text-charcoal-muted">
                                  <strong className="text-forest font-bold">Dynamic Adjustments: </strong>
                                  {lifestyle.renewableEnergy === 'Full' 
                                    ? 'Your full solar renewable energy usage shields your residence emissions exceptionally well. ' 
                                    : 'Integrating solar generation or switching current tariff options remains highly impactful. '
                                  }
                                  {lifestyle.wasteRecycling === 'Poor' && 'Your current waste-stream habits add significant anaerobic decomposing pressure on local refuse bins. '}
                                  {lifestyle.wasteRecycling === 'Excellent' && 'Your active composting and stream classification habits dramatically sequester trash-decay emissions. '}
                                  {lifestyle.shoppingFrequency === 'Frequent' && 'Frequent lifestyle purchasing factors in large factory-production and heavy international air cargo fuel use. '}
                                  {lifestyle.foodSourcing === 'Mostly Imported' && 'Imported fruit and supply profiles are heavily dependent on fossil cold-freight logistics. '}
                                  {lifestyle.sustainabilityPractices === 'Low' && 'Committing to zero single-use standards will dismantle upstream plastic-molding footprints in your ledger. '}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Export Report action button (Item 12) */}
                        <button
                          onClick={exportReport}
                          className="px-4 py-2.5 bg-forest text-offwhite hover:bg-forest-light text-[11px] font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-forest/10"
                        >
                          <Download className="w-4 h-4 text-gold animate-bounce" />
                          Export Report
                        </button>
                      </div>
 
                      {/* Item 1: Animated Carbon Footprint Visualization, containing Tree/Planet and Scale */}
                      <div className="p-4 sm:p-6 bg-white border border-sage/10 rounded-2xl sm:rounded-3xl relative overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 shadow-3xs" id="footprint-visualization-card">
                        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5">
                          <Leaf className="w-32 h-32 text-forest" />
                        </div>
                        
                        <div className="flex flex-col justify-center space-y-3">
                          <span className="text-[10px] uppercase tracking-wider text-sage font-black">Visual Emission Scale</span>
                          <h4 className="text-xl sm:text-2xl font-display font-black text-forest leading-snug">
                            {Math.round(footprint.total)} kg CO₂ <br/>
                            <span className="text-xs font-sans text-charcoal-muted font-medium">calculated per month footprint</span>
                          </h4>
                          <p className="text-xs text-charcoal-muted leading-relaxed font-semibold">
                            Dynamic visual representations expand and shrink based on current configuration variables.
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="px-2 py-1 bg-forest/5 text-forest border border-forest/10 rounded-lg text-[9px] font-black uppercase">
                              Trans: {Math.round((footprint.transport / Math.max(1, footprint.total)) * 100)}%
                            </span>
                            <span className="px-2 py-1 bg-sage/10 text-forest border border-sage/10 rounded-lg text-[9px] font-black uppercase">
                              Energy: {Math.round((footprint.energy / Math.max(1, footprint.total)) * 100)}%
                            </span>
                            <span className="px-2 py-1 bg-gold/10 text-forest border border-gold/10 rounded-lg text-[9px] font-black uppercase">
                              Diet: {Math.round((footprint.food / Math.max(1, footprint.total)) * 100)}%
                            </span>
                          </div>
                        </div>
 
                        <div className="flex flex-col items-center justify-center relative min-h-48 py-2">
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            {/* Inner label inside concentric rings */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 z-10 pointer-events-none">
                              <span className="text-[8px] font-black uppercase text-sage tracking-widest leading-none">Emission</span>
                              <span className="text-lg font-display font-black text-forest mt-0.5 leading-none">
                                {Math.round(footprint.total)}
                              </span>
                              <span className="text-[9px] font-bold text-charcoal-muted leading-none mt-1">kg/mo</span>
                            </div>
 
                            <svg className="w-full h-full transform -rotate-90 select-none" viewBox="0 0 160 160">
                              {/* Outer ring: Transport */}
                              <circle cx="80" cy="80" r="66" className="text-sage/10" strokeWidth="8" stroke="currentColor" fill="none" />
                              <motion.circle 
                                cx="80" cy="80" r="66" 
                                className="text-forest" strokeWidth="8" stroke="currentColor" fill="none" 
                                strokeDasharray="414.7"
                                initial={{ strokeDashoffset: 414.7 }}
                                animate={{ strokeDashoffset: 414.7 - (414.7 * (footprint.transport / Math.max(1, footprint.total))) }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                strokeLinecap="round"
                              />
 
                              {/* Middle ring: Energy */}
                              <circle cx="80" cy="80" r="48" className="text-sage/10" strokeWidth="8" stroke="currentColor" fill="none" />
                              <motion.circle 
                                cx="80" cy="80" r="48" 
                                className="text-sage" strokeWidth="8" stroke="currentColor" fill="none" 
                                strokeDasharray="301.6"
                                initial={{ strokeDashoffset: 301.6 }}
                                animate={{ strokeDashoffset: 301.6 - (301.6 * (footprint.energy / Math.max(1, footprint.total))) }}
                                transition={{ duration: 1.4, ease: 'easeOut' }}
                                strokeLinecap="round"
                              />
 
                              {/* Inner ring: Diet */}
                              <circle cx="80" cy="80" r="30" className="text-sage/10" strokeWidth="8" stroke="currentColor" fill="none" />
                              <motion.circle 
                                cx="80" cy="80" r="30" 
                                className="text-gold" strokeWidth="8" stroke="currentColor" fill="none" 
                                strokeDasharray="188.5"
                                initial={{ strokeDashoffset: 188.5 }}
                                animate={{ strokeDashoffset: 188.5 - (188.5 * (footprint.food / Math.max(1, footprint.total))) }}
                                transition={{ duration: 1.6, ease: 'easeOut' }}
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
 
                          {/* Environmental Equivalency Annotation */}
                          <div className="w-full text-center mt-3 bg-sage-light/20 border border-sage/10 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-3xs animate-pulse">
                            <span className="text-xs">🌳</span>
                            <span className="text-[10px] font-bold text-charcoal">
                              Needs <strong className="text-forest font-black font-mono">{Math.round((footprint.total * 12) / 22)}</strong> offset trees annually
                            </span>
                          </div>
                        </div>
                      </div>
 
                      {/* Individual Scope Breakdown Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="breakdown-individual-scopes">
                        
                        {/* Transport Scope */}
                        <div className={`p-4 rounded-xl flex flex-col justify-between gap-3 shadow-3xs transition-all duration-300 relative ${
                          biggestContributor.id === 'transport'
                            ? 'bg-amber-50/10 border-2 border-amber-500 shadow-xs ring-1 ring-amber-500/10'
                            : 'bg-white border border-sage/10 hover:border-sage/35'
                        }`}>
                          {biggestContributor.id === 'transport' && (
                            <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                              Highest
                            </span>
                          )}
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-sage-light text-forest rounded-lg">
                              <Compass className="w-4 h-4 text-gold" />
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-sage block leading-none mb-0.5">Travel Scope</span>
                              <h5 className="font-bold text-[11px] text-charcoal truncate max-w-[120px]">{lifestyle.transportMode} Route</h5>
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline border-t border-sage/5 pt-2">
                            <span className="text-[10px] text-charcoal-muted font-bold">{Math.round((footprint.transport / footprint.total) * 105) % 100}% weight</span>
                            <span className="text-xs font-display font-black text-forest">{Math.round(footprint.transport)} kg</span>
                          </div>
                        </div>

                        {/* Energy Scope */}
                        <div className={`p-4 rounded-xl flex flex-col justify-between gap-3 shadow-3xs transition-all duration-300 relative ${
                          biggestContributor.id === 'energy'
                            ? 'bg-amber-50/10 border-2 border-amber-500 shadow-xs ring-1 ring-amber-500/10'
                            : 'bg-white border border-sage/10 hover:border-sage/35'
                        }`}>
                          {biggestContributor.id === 'energy' && (
                            <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                              Highest
                            </span>
                          )}
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-sage-light text-forest rounded-lg">
                              <Zap className="w-4 h-4 text-gold" />
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-sage block leading-none mb-0.5">Energy Scope</span>
                              <h5 className="font-bold text-[11px] text-charcoal truncate max-w-[120px]">{lifestyle.acHoursPerDay}h AC cooling</h5>
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline border-t border-sage/5 pt-2">
                            <span className="text-[10px] text-charcoal-muted font-bold">{Math.round((footprint.energy / footprint.total) * 105) % 100}% weight</span>
                            <span className="text-xs font-display font-black text-forest">{Math.round(footprint.energy)} kg</span>
                          </div>
                        </div>

                        {/* Food Scope */}
                        <div className={`p-4 rounded-xl flex flex-col justify-between gap-3 shadow-3xs transition-all duration-300 relative ${
                          biggestContributor.id === 'food'
                            ? 'bg-amber-50/10 border-2 border-amber-500 shadow-xs ring-1 ring-amber-500/10'
                            : 'bg-white border border-sage/10 hover:border-sage/35'
                        }`}>
                          {biggestContributor.id === 'food' && (
                            <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                              Highest
                            </span>
                          )}
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-[#e8ede8] text-forest rounded-lg">
                              <Utensils className="w-4 h-4 text-gold" />
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-sage block leading-none mb-0.5">Diet Scope</span>
                              <h5 className="font-bold text-[11px] text-charcoal truncate max-w-[120px]">{lifestyle.dietType} diet</h5>
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline border-t border-sage/5 pt-2">
                            <span className="text-[10px] text-charcoal-muted font-bold">{Math.round((footprint.food / footprint.total) * 105) % 100}% weight</span>
                            <span className="text-xs font-display font-black text-forest">{Math.round(footprint.food)} kg</span>
                          </div>
                        </div>

                      </div>

                      {/* Improve Analysis Accuracy Optional Module */}
                      <div className="p-5 sm:p-6 bg-[#f4f7f4] border border-sage/15 rounded-2xl sm:rounded-3xl relative overflow-hidden space-y-4 shadow-3xs" id="improve-analysis-accuracy-section">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] tracking-wider text-[#166534] font-black uppercase">Refine Calculations</span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                lifestyle.advancedCompleted 
                                  ? 'bg-[#e8ede8] text-[#166534] border-forest/20' 
                                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${lifestyle.advancedCompleted ? 'bg-[#166534] animate-pulse' : 'bg-zinc-400'}`} />
                                Analysis Level: {lifestyle.advancedCompleted ? 'Enhanced' : 'Standard'}
                              </span>
                            </div>
                            <h4 className="text-lg sm:text-xl font-display font-black text-forest leading-snug">
                              Improve Analysis Accuracy
                            </h4>
                          </div>
                        </div>

                        <p className="text-xs text-charcoal shadow-4xs font-medium leading-relaxed max-w-2xl bg-white/40 p-3 rounded-xl border border-sage/5">
                          Want deeper sustainability insights? Share additional lifestyle information to receive more personalized recommendations and uncover hidden sources of carbon impact.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            onClick={() => {
                              setWorkingAdvanced({
                                wasteRecycling: lifestyle.wasteRecycling || 'Average',
                                shoppingFrequency: lifestyle.shoppingFrequency || 'Moderate',
                                foodSourcing: lifestyle.foodSourcing || 'Mixed',
                                sustainabilityPractices: lifestyle.sustainabilityPractices || 'Medium',
                                renewableEnergy: lifestyle.renewableEnergy || 'None',
                              });
                              setIsAdvancedFormOpen(true);
                            }}
                            className="px-5 py-3 bg-forest hover:bg-forest-light text-offwhite text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-forest/15 font-bold"
                            id="complete-advanced-profile-btn"
                          >
                            <Sliders className="w-3.5 h-3.5 text-gold" style={{ strokeWidth: 3 }} />
                            {lifestyle.advancedCompleted ? 'Update Advanced Profile' : 'Complete Advanced Profile'}
                          </button>

                          {lifestyle.advancedCompleted && (
                            <button
                              onClick={() => {
                                setLifestyle(prev => ({
                                  ...prev,
                                  advancedCompleted: false,
                                  wasteRecycling: undefined,
                                  shoppingFrequency: undefined,
                                  foodSourcing: undefined,
                                  sustainabilityPractices: undefined,
                                  renewableEnergy: undefined,
                                }));
                              }}
                              className="px-4 py-2.5 bg-transparent hover:bg-red-50 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                              id="reset-advanced-profile-btn"
                            >
                              Reset Profile
                            </button>
                          )}
                        </div>

                        {lifestyle.advancedCompleted && (
                          <div className="pt-3 border-t border-sage/10 grid grid-cols-2 sm:grid-cols-5 gap-3" id="advanced-choices-summary">
                            <div className="bg-white/65 p-2 rounded-xl border border-sage/5">
                              <span className="block text-[8px] font-extrabold text-sage uppercase leading-none mb-1">Waste Mode</span>
                              <span className="text-[11px] font-black text-forest">{lifestyle.wasteRecycling}</span>
                            </div>
                            <div className="bg-white/65 p-2 rounded-xl border border-sage/5">
                              <span className="block text-[8px] font-extrabold text-sage uppercase leading-none mb-1">Shopping freq</span>
                              <span className="text-[11px] font-black text-forest">{lifestyle.shoppingFrequency}</span>
                            </div>
                            <div className="bg-white/65 p-2 rounded-xl border border-sage/5">
                              <span className="block text-[8px] font-extrabold text-sage uppercase leading-none mb-1">Food Sourcing</span>
                              <span className="text-[11px] font-black text-forest">{lifestyle.foodSourcing}</span>
                            </div>
                            <div className="bg-white/65 p-2 rounded-xl border border-sage/5">
                              <span className="block text-[8px] font-extrabold text-sage uppercase leading-none mb-1">Green Practices</span>
                              <span className="text-[11px] font-black text-forest">{lifestyle.sustainabilityPractices}</span>
                            </div>
                            <div className="bg-white/65 p-2 rounded-xl border border-sage/5">
                              <span className="block text-[8px] font-extrabold text-sage uppercase leading-none mb-1">Renewables</span>
                              <span className="text-[11px] font-black text-forest">{lifestyle.renewableEnergy}</span>
                            </div>
                          </div>
                        )}
                      </div>
 
                    </div>
 
                  </motion.div>
                )}

                {/* TAB 2: HERO ACTION (Highest Impact Screen) */}
                {step === 'HERO_REC' && (
                  <motion.div
                    key="hero-rec-tab"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                    id="hero-recommendation-screen"
                  >
                    {heroRecommendation ? (
                      <div className="bg-white rounded-2xl sm:rounded-3xl border border-sage/20 shadow-md overflow-hidden flex flex-col justify-between">
                        
                        {/* Cinematic Spotlight Banner */}
                        <div className="bg-forest p-6 sm:p-8 md:p-10 text-offwhite relative overflow-hidden">
                          {/* Delicate visual background patterns */}
                          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-sage-light/5 translate-x-20 -translate-y-20 blur-2xl" />
                          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-gold/5 -translate-x-20 translate-y-20 blur-2xl" />

                          <div className="flex flex-wrap justify-between items-center gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-block bg-gold text-forest px-3 py-0.5 sm:px-3.5 sm:py-1 text-[9px] sm:text-[10px] font-black tracking-widest uppercase rounded-full shadow-2xs">
                                COACH RECOMMENDATION #1
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                lifestyle.advancedCompleted 
                                  ? 'bg-[#166534] text-white border border-[#166534]' 
                                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${lifestyle.advancedCompleted ? 'bg-gold animate-pulse' : 'bg-zinc-400'}`} />
                                Analysis Level: {lifestyle.advancedCompleted ? 'Enhanced' : 'Standard'}
                              </span>
                            </div>
                            <span className="text-[9px] font-black tracking-widest text-[#b6c4b6] uppercase flex items-center gap-1.5 leading-none">
                              <Sparkle className="w-3.5 h-3.5 text-gold animate-spin" style={{ animationDuration: '5s' }} />
                              Primary Action
                            </span>
                          </div>

                          <span className="block text-xs uppercase font-black text-sage tracking-widest mt-6 sm:mt-8">The fastest way to reduce your footprint.</span>
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold leading-tight mt-3 max-w-2xl text-offwhite italic">
                            “{heroRecommendation.action}”
                          </h2>
                        </div>

                        {/* Large Cinematic Statistics Grid - stripes style */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-sage/10 bg-sage-light/10">
                          <div className="p-4 sm:p-6 text-center border-b sm:border-b-0 sm:border-r border-sage/10">
                            <span className="text-[10px] text-charcoal-muted font-bold uppercase tracking-widest block">Monthly Impact savings</span>
                            <span className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-forest block mt-2">
                              {heroRecommendation.carbonSavings}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-extrabold uppercase mt-1 block">kg CO₂ saved</span>
                          </div>
                          <div className="p-4 sm:p-6 text-center border-b sm:border-b-0 sm:border-r border-sage/10 flex flex-col justify-center items-center">
                            <span className="text-[10px] text-charcoal-muted font-bold uppercase tracking-widest block">Confidence Score</span>
                            <span className="text-3xl sm:text-4xl font-display font-black text-forest block mt-2">
                              {heroRecommendation.confidence}%
                            </span>
                            <span className="text-[10px] text-zinc-500 font-extrabold uppercase mt-1 block">High Precision</span>
                          </div>
                          <div className="p-4 sm:p-6 text-center flex flex-col justify-center items-center">
                            <span className="text-[10px] text-charcoal-muted font-bold uppercase tracking-widest block">Feasibility level</span>
                            <span className="text-2xl sm:text-3xl font-display font-black text-gold block mt-2.5">
                              {heroRecommendation.feasibility}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-extrabold uppercase mt-1.5 block">Immediate execution</span>
                          </div>
                        </div>

                        {/* Diagnostic reasoning */}
                        <div className="p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8da392]">Why this is selected</h4>
                              <p className="text-charcoal text-sm leading-relaxed font-bold">
                                {heroRecommendation.explanation}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8da392]">Contextual validation</h4>
                              <p className="text-charcoal-muted text-sm leading-relaxed font-medium">
                                {heroRecommendation.mattersReason}
                              </p>
                            </div>
                          </div>

                          {heroRecommendation.whyRecommended && (
                            <div className="p-4 bg-sage-light/25 rounded-2xl border border-sage/15 flex items-start gap-3 shadow-sm shadow-sage/5">
                              <HelpCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-forest">Why This Was Recommended</h4>
                                <p className="text-charcoal text-xs sm:text-sm leading-relaxed font-semibold">
                                  {heroRecommendation.whyRecommended}
                                </p>
                              </div>
                            </div>
                          )}

                           <div className="pt-4 border-t border-sage/10">
                            <button
                              onClick={() => {
                                setActiveTab('ranking');
                                setStep('RANKINGS');
                              }}
                              className="w-full py-4.5 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl transition duration-300 flex justify-center items-center gap-2 transform active:scale-95 shadow-lg shadow-forest/10 cursor-pointer text-xs uppercase tracking-wider"
                            >
                              <span>View All Opportunities</span>
                              <ArrowRight className="w-4 h-4 text-gold" />
                            </button>
                          </div>
                          </div>
                        </div>
                    ) : (
                      <div className="bg-white p-12 rounded-3xl border border-sage/10 text-center text-charcoal-muted">
                        No primary recommendations generated. Adjust factors inside settings to trigger alternative scenarios.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB 3: RECOMMENDATION RANKINGS (Tiles with Rank indicators) */}
                {step === 'RANKINGS' && (
                  <motion.div
                    key="ranking-tab"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-4 lg:space-y-3 lg:py-1"
                    id="recommendations-ranking-screen"
                  >
                    <div className="space-y-1 lg:space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black tracking-widest text-gold uppercase">ROI RANKINGS MATRIX</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          lifestyle.advancedCompleted 
                            ? 'bg-[#e8ede8] text-[#166534] border-forest/20' 
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${lifestyle.advancedCompleted ? 'bg-[#166534] animate-pulse' : 'bg-zinc-400'}`} />
                          Analysis Level: {lifestyle.advancedCompleted ? 'Enhanced' : 'Standard'}
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl lg:text-xl font-display font-black text-forest">Calibrated Opportunities</h3>
                      <p className="text-xs sm:text-sm text-charcoal-muted font-medium">
                        Each action is weighed by yield output, certitude parameters, and contextual complexity.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-3">
                      {(lifestyle.advancedCompleted ? recommendations : recommendations.slice(0, 3)).map((rec, index) => {
                        const isCommitted = committedIds.includes(rec.id);
                        const annualSavings = Math.round(rec.carbonSavings * 12);
                        const equivTrees = Math.max(1, Math.round(rec.carbonSavings * 0.6));
                        return (
                          <div
                            key={rec.id}
                            className={`bg-white p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between shadow-3xs hover:shadow-2xs ${
                              index === 0 ? 'border-gold/60 ring-1 ring-gold/20' : 'border-sage/10'
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-center border-b border-sage/5 pb-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest block border bg-sage-light text-forest border-sage/10">
                                  {rec.category}
                                </span>
                                
                                {/* Simple ranking indicators */}
                                {index === 0 && (
                                  <span className="flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase">
                                    ⭐ #1 Recommended
                                  </span>
                                )}
                                {index === 1 && (
                                  <span className="flex items-center gap-0.5 bg-zinc-50 text-zinc-700 border border-zinc-200 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase">
                                    ✨ #2 Alternative
                                  </span>
                                )}
                                {index === 2 && (
                                  <span className="flex items-center gap-0.5 bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase">
                                    ✨ #3 Alternative
                                  </span>
                                )}
                                {index > 2 && (
                                  <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase">
                                    ✨ #{index + 1} Alternative
                                  </span>
                                )}
                              </div>

                              {/* Primary Highlighted Metric: Potential Monthly Savings (kg CO₂) */}
                              <div className="bg-forest/[0.04] border border-forest/10 rounded-xl p-2.5 text-center my-2 select-none">
                                <span className="text-[8px] text-charcoal-muted font-bold uppercase tracking-wider block">Potential Monthly Savings</span>
                                <span className="text-lg font-display font-black text-forest block mt-0.5">{rec.carbonSavings} kg CO₂</span>
                              </div>

                              <div className="space-y-1">
                                <h4 className="font-display font-bold text-sm text-forest leading-snug">
                                  {rec.action}
                                </h4>
                                <p className="text-[11px] text-charcoal-muted leading-relaxed font-semibold">
                                  {rec.explanation}
                                </p>
                              </div>

                              {/* Detailed scoring metrics (Recommendation Confidence, Fits Your Lifestyle, Effort Required) */}
                              <div className="grid grid-cols-1 gap-1.5 py-2 my-1.5 border-y border-dashed border-sage/10 text-[9.5px]">
                                <div className="flex justify-between items-center">
                                  <span className="text-charcoal-muted font-black tracking-wider uppercase leading-none">Recommendation Confidence</span>
                                  <span className="text-amber-700 font-extrabold font-display">{rec.confidence}% accuracy</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-charcoal-muted font-black tracking-wider uppercase leading-none">Effort Required</span>
                                  <span className="text-forest font-extrabold uppercase tracking-wide">{rec.feasibility}</span>
                                </div>
                                {rec.personalFitScore !== undefined && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-charcoal-muted font-black tracking-wider uppercase leading-none">Fits Your Lifestyle</span>
                                    <span className="text-emerald-700 font-extrabold font-display">{rec.personalFitScore}% Match</span>
                                  </div>
                                )}
                              </div>

                              {/* Concise real-world impact statement */}
                              <div className="bg-sage-light/20 p-2 rounded-lg text-[10px] font-bold text-forest leading-relaxed border border-sage/5 text-left">
                                <p className="m-0 text-left">
                                  🌎 <strong className="font-sans font-black">Real-World Impact:</strong> Offsets {annualSavings} kg of CO₂ per year—equivalent to planting {equivTrees} mature trees' annual absorption power.
                                </p>
                              </div>
                            </div>

                            {/* Section: Why This Was Recommended */}
                            <div className="pt-2.5 mt-2 border-t border-sage/10 text-left">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#166534] block mb-1">
                                Why this was recommended
                              </span>
                              <p className="text-[10px] text-charcoal-muted font-semibold leading-relaxed m-0">
                                {rec.whyRecommended || 'This action integrates perfectly into your target lifestyle attributes for optimal low-friction carbon reductions.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          )}

        </AnimatePresence>
      </main>

      {/* OPTIONAL ADVANCED PROFILE COMPREHENSIVES FORM MODAL */}
      <AnimatePresence>
        {isAdvancedFormOpen && (
          <div className="fixed inset-0 bg-[#0c0d0c]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fadeIn" id="advanced-profile-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white border border-sage/15 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-sage/10 flex justify-between items-center bg-sage-light/10">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-[#166534] uppercase block mb-0.5">Lifestyle Optimization</span>
                  <h3 className="font-display font-black text-xl text-forest">Advanced Profile details</h3>
                </div>
                <button 
                  onClick={() => setIsAdvancedFormOpen(false)}
                  className="p-1.5 hover:bg-sage-light text-forest/70 hover:text-forest rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle / Notice */}
              <div className="px-5 py-3.5 bg-yellow-50/20 border-b border-yellow-200/20 text-xs text-charcoal-muted leading-relaxed font-semibold">
                None of these fields are mandatory. Customize any option to incorporate manufacturing, shipping, and household waste factors into your carbon story.
              </div>

              {/* Scrollable Questions List */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 select-none text-left scroller-elegant">
                
                {/* Q1: Waste & Recycling */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                    1. Waste & Recycling Habits
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: 'Excellent', label: 'Compost & Zero Waste', desc: 'Minimal landfill waste' },
                      { value: 'Good', label: 'Active Recycling', desc: 'Recycle paper, cans & plastic' },
                      { value: 'Average', label: 'Standard Sorting', desc: 'Some sorting, mostly landfill' },
                      { value: 'Poor', label: 'No Waste Sorting', desc: 'Throw everything in one bin' }
                    ].map((opt) => {
                      const isSel = workingAdvanced.wasteRecycling === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setWorkingAdvanced(prev => ({ ...prev, wasteRecycling: opt.value as any }))}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSel 
                              ? 'bg-[#e8ede8] border-forest text-forest shadow-2xs font-extrabold' 
                              : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                          }`}
                        >
                          <span className="text-xs font-black block leading-none">{opt.label}</span>
                          <span className="text-[9px] text-charcoal-muted/70 font-semibold block mt-1 leading-tight">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q2: Shopping Frequency */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                    2. Shopping Habits (Apparel, Tech, Furniture)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'Rarely', label: 'Vintage/Eco', desc: 'Rare new items' },
                      { value: 'Moderate', label: 'Eco-Balanced', desc: 'Only buy when needed' },
                      { value: 'Frequent', label: 'Trend-Focused', desc: 'Regular purchase loop' }
                    ].map((opt) => {
                      const isSel = workingAdvanced.shoppingFrequency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setWorkingAdvanced(prev => ({ ...prev, shoppingFrequency: opt.value as any }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                            isSel 
                              ? 'bg-[#e8ede8] border-forest text-forest shadow-2xs font-extrabold' 
                              : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block leading-none">{opt.label}</span>
                            <span className="text-[9px] text-charcoal-muted/70 font-semibold block mt-1 leading-tight">{opt.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q3: Food Sourcing Preferences */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                    3. Food Sourcing Preferences (Local vs. Imported)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'Mostly Local', label: '70%+ Regional', desc: 'Farmers markets/native' },
                      { value: 'Mixed', label: 'Balanced Mix', desc: 'Standard superstores' },
                      { value: 'Mostly Imported', label: 'Global Brands', desc: 'Imported/processed foods' }
                    ].map((opt) => {
                      const isSel = workingAdvanced.foodSourcing === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setWorkingAdvanced(prev => ({ ...prev, foodSourcing: opt.value as any }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                            isSel 
                              ? 'bg-[#e8ede8] border-forest text-forest shadow-2xs font-extrabold' 
                              : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block leading-none">{opt.label}</span>
                            <span className="text-[9px] text-charcoal-muted/70 font-semibold block mt-1 leading-tight">{opt.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q4: Sustainability Practices */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                    4. General Green Practices (Reusables, Zero Waste)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'High', label: 'Zero Single-Use', desc: 'Always bring reusables' },
                      { value: 'Medium', label: 'Partially Active', desc: 'Use bags, some plastics' },
                      { value: 'Low', label: 'Consumer Standard', desc: 'Standard packaging use' }
                    ].map((opt) => {
                      const isSel = workingAdvanced.sustainabilityPractices === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setWorkingAdvanced(prev => ({ ...prev, sustainabilityPractices: opt.value as any }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                            isSel 
                              ? 'bg-[#e8ede8] border-forest text-forest shadow-2xs font-extrabold' 
                              : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block leading-none">{opt.label}</span>
                            <span className="text-[9px] text-charcoal-muted/70 font-semibold block mt-1 leading-tight">{opt.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q5: Renewable Energy Usage */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                    5. Renewable Grid Energy Integration
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'None', label: 'Standard Grid', desc: 'Coal/gas fossil mix' },
                      { value: 'Some', label: 'Partial Solar', desc: 'Mixed clean generation' },
                      { value: 'Full', label: '100% Green/Solar', desc: 'Home solar or green tariff' }
                    ].map((opt) => {
                      const isSel = workingAdvanced.renewableEnergy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setWorkingAdvanced(prev => ({ ...prev, renewableEnergy: opt.value as any }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                            isSel 
                              ? 'bg-[#e8ede8] border-forest text-forest shadow-2xs font-extrabold' 
                              : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block leading-none">{opt.label}</span>
                            <span className="text-[9px] text-charcoal-muted/70 font-semibold block mt-1 leading-tight">{opt.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ADVANCED PROFILE PERSONAL CONSTRAINTS SECTION */}
                <div className="pt-4 border-t border-sage/20 space-y-4">
                  <div className="bg-sage-light/30 px-3 py-2 rounded-xl text-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#166534] block">Advanced Adaptability Layer</span>
                    <p className="text-[10px] text-charcoal-muted mt-0.5 font-medium mb-0">Define your boundaries to optimize matching opportunity scores.</p>
                  </div>

                  {/* C1: Compost Feasibility */}
                  <div className="space-y-2 bg-[#f4f7f4] p-3 rounded-2xl border border-sage/10 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                      A. Compost Feasibility
                    </label>
                    <p className="text-[9px] text-charcoal-muted leading-tight -mt-1 mb-1 font-medium">How practical is establishing active composting at your current residence?</p>
                    <div className="grid grid-cols-2 gap-1 px-0.5">
                      {[
                        { value: 'Very Feasible', label: 'Very Feasible' },
                        { value: 'Possible', label: 'Possible' },
                        { value: 'Difficult', label: 'Difficult' },
                        { value: 'Not Practical', label: 'Not Practical' }
                      ].map((opt) => {
                        const isSel = workingAdvanced.compostFeasibility === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setWorkingAdvanced(prev => ({ ...prev, compostFeasibility: opt.value as any }))}
                            className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition cursor-pointer ${
                              isSel 
                                ? 'bg-[#166534] border-[#166534] text-offwhite font-black' 
                                : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* C2: Shopping Willingness */}
                  <div className="space-y-2 bg-[#f4f7f4] p-3 rounded-2xl border border-sage/10 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                      B. Circular Buying Willingness
                    </label>
                    <p className="text-[9px] text-charcoal-muted leading-tight -mt-1 mb-1 font-medium">How willing are you to prioritize vintage or pre-owned goods?</p>
                    <div className="grid grid-cols-3 gap-1 px-0.5">
                      {[
                        { value: 'Very Willing', label: 'Very Willing' },
                        { value: 'Somewhat Willing', label: 'Somewhat' },
                        { value: 'Hard to Reduce', label: 'Hard / New Only' }
                      ].map((opt) => {
                        const isSel = workingAdvanced.shoppingWillingness === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setWorkingAdvanced(prev => ({ ...prev, shoppingWillingness: opt.value as any }))}
                            className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition cursor-pointer ${
                              isSel 
                                ? 'bg-[#166534] border-[#166534] text-offwhite font-black' 
                                : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* C3: Local Food Practicality */}
                  <div className="space-y-2 bg-[#f4f7f4] p-3 rounded-2xl border border-sage/10 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                      C. Local Sourcing Feasibility
                    </label>
                    <p className="text-[9px] text-charcoal-muted leading-tight -mt-1 mb-1 font-medium">How realistic is shifting your weekly grocery lists to regional networks?</p>
                    <div className="grid grid-cols-3 gap-1 px-0.5">
                      {[
                        { value: 'Very Practical', label: 'Very Practical' },
                        { value: 'Somewhat Practical', label: 'Somewhat' },
                        { value: 'Difficult', label: 'Difficult' }
                      ].map((opt) => {
                        const isSel = workingAdvanced.localFoodPracticality === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setWorkingAdvanced(prev => ({ ...prev, localFoodPracticality: opt.value as any }))}
                            className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition cursor-pointer ${
                              isSel 
                                ? 'bg-[#166534] border-[#166534] text-offwhite font-black' 
                                : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* C4: Reusables Willingness */}
                  <div className="space-y-2 bg-[#f4f7f4] p-3 rounded-2xl border border-sage/10 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                      D. Reusable Container Target
                    </label>
                    <p className="text-[9px] text-charcoal-muted leading-tight -mt-1 mb-1 font-medium">What is your commitment level toward zero-single-use packaging?</p>
                    <div className="grid grid-cols-3 gap-1 px-0.5">
                      {[
                        { value: 'Ready to commit', label: 'Ready to Commit' },
                        { value: 'Willing to try', label: 'Willing to Try' },
                        { value: 'Too Inconvenient', label: 'Too Inconvenient' }
                      ].map((opt) => {
                        const isSel = workingAdvanced.reusablesWillingness === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setWorkingAdvanced(prev => ({ ...prev, reusablesWillingness: opt.value as any }))}
                            className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition cursor-pointer ${
                              isSel 
                                ? 'bg-[#166534] border-[#166534] text-offwhite font-black' 
                                : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* C5: Renewable Energy Feasibility */}
                  <div className="space-y-2 bg-[#f4f7f4] p-3 rounded-2xl border border-sage/10 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-forest block font-bold">
                      E. Renewable Transition Feasibility
                    </label>
                    <p className="text-[9px] text-charcoal-muted leading-tight -mt-1 mb-1 font-medium">Do you have access or capabilities to switch home grid energy to renewables?</p>
                    <div className="grid grid-cols-2 gap-1 px-0.5">
                      {[
                        { value: 'Already Done', label: 'Already Done' },
                        { value: 'Highly Feasible', label: 'Highly Feasible' },
                        { value: 'Too Expensive', label: 'Too Expensive' },
                        { value: 'No Access', label: 'No Access / Renting' }
                      ].map((opt) => {
                        const isSel = workingAdvanced.renewableEnergyFeasibility === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setWorkingAdvanced(prev => ({ ...prev, renewableEnergyFeasibility: opt.value as any }))}
                            className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition cursor-pointer ${
                              isSel 
                                ? 'bg-[#166534] border-[#166534] text-offwhite font-black' 
                                : 'bg-white border-sage/20 text-charcoal hover:border-sage'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Controls */}
              <div className="p-4 border-t border-sage/10 bg-sage-light/10 flex justify-between items-center bg-offwhite">
                <button 
                  onClick={() => {
                    // Clear advanced attributes
                    setLifestyle(prev => ({
                      ...prev,
                      advancedCompleted: false,
                      wasteRecycling: undefined,
                      shoppingFrequency: undefined,
                      foodSourcing: undefined,
                      sustainabilityPractices: undefined,
                      renewableEnergy: undefined,
                      compostFeasibility: undefined,
                      shoppingWillingness: undefined,
                      localFoodPracticality: undefined,
                      reusablesWillingness: undefined,
                      renewableEnergyFeasibility: undefined,
                    }));
                    setIsAdvancedFormOpen(false);
                  }}
                  className="px-4 py-2 bg-transparent text-red-600 hover:bg-red-50 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Reset & Skip
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAdvancedFormOpen(false)}
                    className="px-4 py-2.5 bg-transparent hover:bg-sage-light/50 text-charcoal-muted font-bold text-xs rounded-xl border border-sage/30 transition cursor-pointer font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setLifestyle(prev => ({
                        ...prev,
                        advancedCompleted: true,
                        wasteRecycling: workingAdvanced.wasteRecycling,
                        shoppingFrequency: workingAdvanced.shoppingFrequency,
                        foodSourcing: workingAdvanced.foodSourcing,
                        sustainabilityPractices: workingAdvanced.sustainabilityPractices,
                        renewableEnergy: workingAdvanced.renewableEnergy,
                        compostFeasibility: workingAdvanced.compostFeasibility,
                        shoppingWillingness: workingAdvanced.shoppingWillingness,
                        localFoodPracticality: workingAdvanced.localFoodPracticality,
                        reusablesWillingness: workingAdvanced.reusablesWillingness,
                        renewableEnergyFeasibility: workingAdvanced.renewableEnergyFeasibility,
                      }));
                      setIsAdvancedFormOpen(false);
                    }}
                    className="px-5 py-2.5 bg-[#166534] hover:bg-[#155e3b] text-offwhite font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-forest/10 cursor-pointer"
                  >
                    Apply Enhancements
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIGURABLE FACTORS DRAWER (NFR-9 Settings Panel & Profile Center) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-[#1f221f]/30 backdrop-blur-sm cursor-pointer"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10"
              id="factors-settings-drawer"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Drawer Header */}
                <div className="flex justify-between items-center border-b border-sage/10 pb-4">
                  <div>
                    <h3 className="text-lg font-display font-black text-forest">Profile Center</h3>
                    <p className="text-[11px] text-[#8da392]">Manage profile and parameters</p>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1.5 hover:bg-neutral-100 text-charcoal/60 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-offwhite p-1 rounded-xl border border-sage/10 mb-6">
                  <button
                    onClick={() => setSettingsActiveTab('profile')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      settingsActiveTab === 'profile'
                        ? 'bg-forest text-offwhite shadow-sm font-extrabold'
                        : 'text-charcoal-muted hover:text-forest hover:bg-neutral-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    My Profile
                  </button>
                  <button
                    onClick={() => setSettingsActiveTab('multipliers')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      settingsActiveTab === 'multipliers'
                        ? 'bg-forest text-offwhite shadow-sm font-extrabold'
                        : 'text-charcoal-muted hover:text-forest hover:bg-neutral-100'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Calibration Weights
                  </button>
                </div>

                {/* TAB 1: USER PROFILE MANAGEMENT AND CONTROLS */}
                {settingsActiveTab === 'profile' && (
                  <div className="space-y-6 animate-fade-in font-medium text-left">
                    {/* Dynamic Action Controls Grid */}
                    <div className="bg-[#faf9f6]/95 border border-sage/15 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-sage/10">
                        <span className="text-[10px] font-black uppercase text-gold tracking-widest">Profile ID: {profile.profileId || 'CRI-8472'}</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">Active Session</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Retake */}
                        <button
                          onClick={() => {
                            setStep('INTRO');
                            setIsSettingsOpen(false);
                            triggerAlert('Assessment survey reloaded');
                          }}
                          className="p-2.5 bg-white hover:bg-neutral-50 border border-sage/15 rounded-xl text-left transition relative cursor-pointer"
                          title="Retake Onboarding Assessment"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 px-1.5 bg-gold/10 text-gold rounded-lg">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-black text-forest">Retake Survey</span>
                          </div>
                          <p className="text-[9px] text-[#8ca392] leading-tight">Run guided questionnaire again</p>
                        </button>

                        {/* Recalculate */}
                        <button
                          onClick={() => {
                            triggerAlert('Sustainability calculations recalibrated!');
                            setIsSettingsOpen(false);
                          }}
                          className="p-2.5 bg-white hover:bg-neutral-50 border border-sage/15 rounded-xl text-left transition relative cursor-pointer"
                          title="Recalculate Recommendations"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 px-1.5 bg-blue-50 text-blue-500 rounded-lg">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                            </div>
                            <span className="text-[11px] font-black text-forest">Recalculate</span>
                          </div>
                          <p className="text-[9px] text-[#8ca392] leading-tight">Force-refresh ROI metrics</p>
                        </button>

                        {/* Export Report */}
                        <button
                          onClick={() => {
                            exportReport();
                            triggerAlert('Report downloaded successfully!');
                          }}
                          className="p-2.5 bg-white hover:bg-neutral-50 border border-sage/15 rounded-xl text-left transition relative cursor-pointer"
                          title="Export Carbon Intelligence Report"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                              <Download className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-black text-forest">Export Report</span>
                          </div>
                          <p className="text-[9px] text-[#8ca392] leading-tight">Save carbon & progress logs</p>
                        </button>

                        {/* Reset Data */}
                        {!showResetConfirm ? (
                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="p-2.5 bg-white hover:bg-neutral-50 border border-sage/15 rounded-xl text-left transition relative cursor-pointer"
                            title="Delete profile data completely"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 px-1.5 bg-red-50 text-red-500 rounded-lg">
                                <Trash2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-black text-forest">Reset Profile</span>
                            </div>
                            <p className="text-[9px] text-[#8ca392] leading-tight">Destroy local session cache</p>
                          </button>
                        ) : (
                          <div className="p-2.5 bg-red-50/40 border border-red-200/50 rounded-xl text-left space-y-2 col-span-2">
                            <div className="flex items-start gap-2">
                              <div className="p-1 bg-red-100 text-red-600 rounded-lg mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-extrabold text-red-800 block">Are you absolutely sure?</span>
                                <p className="text-[9px] text-red-700/80 leading-snug">
                                  This will completely erase your profile, commitments, and progress logs. This is irreversible.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1 font-sans">
                              <button
                                onClick={() => {
                                  localStorage.clear();
                                  setProfile({
                                    name: '',
                                    ageGroup: 'Young Adult',
                                    city: '',
                                    occupation: '',
                                    householdSize: 1,
                                    profileId: `CRI-${Math.floor(1000 + Math.random() * 9000)}`
                                  });
                                  setLifestyle({
                                    commuteDistance: 15,
                                    transportMode: 'Car',
                                    tripsPerWeek: 5,
                                    acHoursPerDay: 4,
                                    electricityBillRange: 'Medium',
                                    dietType: 'Mixed',
                                    weeklyMeatFreq: 4,
                                    publicTransportPracticality: undefined,
                                    acComfort: undefined,
                                    dietWillingness: undefined,
                                    wasteRecycling: undefined,
                                    shoppingFrequency: undefined,
                                    foodSourcing: undefined,
                                    sustainabilityPractices: undefined,
                                    renewableEnergy: undefined,
                                    compostFeasibility: undefined,
                                    shoppingWillingness: undefined,
                                    localFoodPracticality: undefined,
                                    reusablesWillingness: undefined,
                                    renewableEnergyFeasibility: undefined,
                                  });
                                  setCommittedIds([]);
                                  setProgressLogs([]);
                                  setFactors({
                                    transport: {
                                      Car: 0.22,
                                      Bike: 0.12,
                                      Bus: 0.06,
                                      Train: 0.04,
                                      Walking: 0,
                                      Cycling: 0
                                    },
                                    energy: {
                                      acPerHour: 0.85,
                                      billLow: 80,
                                      billMedium: 180,
                                      billHigh: 340
                                    },
                                    food: {
                                      baseVegetarian: 120,
                                      baseMixed: 240,
                                      meatServingImpact: 1.8
                                    }
                                  });
                                  localStorage.removeItem('has_existing_blueprint');
                                  setStep('LANDING');
                                  setIsSettingsOpen(false);
                                  setShowResetConfirm(false);
                                  triggerAlert('Local session completely purged.');
                                }}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition cursor-pointer"
                              >
                                Yes, Reset
                              </button>
                              <button
                                onClick={() => setShowResetConfirm(false)}
                                className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 text-[#1f221f] border border-neutral-200 font-bold text-[10px] uppercase tracking-wide rounded-lg transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Editable Profile Forms */}
                    <div className="space-y-4">
                      {/* General Profile Info Card */}
                      <div className="border border-sage/15 rounded-2xl p-4 space-y-3.5 bg-white shadow-3xs">
                        <h4 className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-forest" /> Personal Details
                        </h4>
                        <div className="space-y-3 font-semibold text-xs text-charcoal">
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Full Name / Handle</label>
                            <input
                              type="text"
                              value={profile.name}
                              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">City / Region Base</label>
                            <input
                              type="text"
                              value={profile.city}
                              onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Occupation Role</label>
                            <input
                              type="text"
                              value={profile.occupation}
                              onChange={(e) => setProfile(prev => ({ ...prev, occupation: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Household Size</label>
                            <select
                              value={profile.householdSize || 1}
                              onChange={(e) => setProfile(prev => ({ ...prev, householdSize: parseInt(e.target.value) }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>{n === 5 ? '5+ members' : `${n} member${n > 1 ? 's' : ''}`}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Transportation Habits Card */}
                      <div className="border border-sage/15 rounded-2xl p-4 space-y-3.5 bg-white shadow-3xs">
                        <h4 className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-forest" /> Transport Habits
                        </h4>
                        <div className="space-y-3 font-semibold text-xs text-charcoal">
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Primary Transport Mode</label>
                            <select
                              value={lifestyle.transportMode}
                              onChange={(e: any) => setLifestyle(prev => ({ ...prev, transportMode: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                            >
                              <option value="Car">Personal Fuel Car</option>
                              <option value="Bike">Motorcycle / Two-Wheeler</option>
                              <option value="Bus">Communal Transit Bus</option>
                              <option value="Train">Subway or Commuter Rail</option>
                              <option value="Walking">Walking / On Foot</option>
                              <option value="Cycling">Bicycle / Green Cycling</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Distance (km/day)</label>
                              <input
                                type="number"
                                value={lifestyle.commuteDistance}
                                onChange={(e) => setLifestyle(prev => ({ ...prev, commuteDistance: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Commutes / Week</label>
                              <input
                                type="number"
                                min="0"
                                max="7"
                                value={lifestyle.tripsPerWeek}
                                onChange={(e) => setLifestyle(prev => ({ ...prev, tripsPerWeek: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Public Transport Feasibility</label>
                            <select
                              value={lifestyle.publicTransportPracticality || 'Somewhat Practical'}
                              onChange={(e: any) => setLifestyle(prev => ({ ...prev, publicTransportPracticality: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                            >
                              <option value="Very Practical">Very Practical</option>
                              <option value="Somewhat Practical">Somewhat Practical</option>
                              <option value="Difficult">Difficult</option>
                              <option value="Not Practical">Not Practical</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Food and Diet Choices */}
                      <div className="border border-sage/15 rounded-2xl p-4 space-y-3.5 bg-white shadow-3xs">
                        <h4 className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
                          <Utensils className="w-4 h-4 text-forest" /> Diet Preferences
                        </h4>
                        <div className="space-y-3 font-semibold text-xs text-charcoal">
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Diet Type</label>
                            <select
                              value={lifestyle.dietType}
                              onChange={(e: any) => setLifestyle(prev => ({ ...prev, dietType: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                            >
                              <option value="Vegetarian">🌱 Fully Vegetarian</option>
                              <option value="Eggetarian">🥚 Eggetarian / Ovo-lacto</option>
                              <option value="Mixed">🥩 Mixed Omnivore</option>
                              <option value="Frequent Meat">🍗 High-Frequency Meat</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Weekly Meat Frequency (Servings)</label>
                            <input
                              type="number"
                              value={lifestyle.weeklyMeatFreq}
                              onChange={(e) => setLifestyle(prev => ({ ...prev, weeklyMeatFreq: parseInt(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Diet Transition Willingness</label>
                            <select
                              value={lifestyle.dietWillingness || 'Somewhat Willing'}
                              onChange={(e: any) => setLifestyle(prev => ({ ...prev, dietWillingness: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                            >
                              <option value="Very Willing">Highly Willing</option>
                              <option value="Somewhat Willing">Somewhat Willing</option>
                              <option value="Minimal Changes Only">Minimal Changes Only</option>
                              <option value="Not Willing">Not Willing</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* House & AC Settings */}
                      <div className="border border-sage/15 rounded-2xl p-4 space-y-3.5 bg-white shadow-3xs">
                        <h4 className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-forest" /> Home & AC Configuration
                        </h4>
                        <div className="space-y-3 font-semibold text-xs text-charcoal">
                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Daily AC Hours</label>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              value={lifestyle.acHoursPerDay}
                              onChange={(e) => setLifestyle(prev => ({ ...prev, acHoursPerDay: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Electric Bill Tier</label>
                              <select
                                value={lifestyle.electricityBillRange}
                                onChange={(e: any) => setLifestyle(prev => ({ ...prev, electricityBillRange: e.target.value }))}
                                className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                              >
                                <option value="Low">Low Ranges</option>
                                <option value="Medium">Medium Ranges</option>
                                <option value="High">Heavy Grid Bill</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">AC Comfort Ease</label>
                              <select
                                value={lifestyle.acComfort || 'Possible'}
                                onChange={(e: any) => setLifestyle(prev => ({ ...prev, acComfort: e.target.value }))}
                                className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Possible">Possible</option>
                                <option value="Difficult">Difficult</option>
                                <option value="Not Realistic">Not Realistic</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Options Block */}
                      <div className="border border-sage/15 rounded-2xl p-4 space-y-3.5 bg-white shadow-3xs">
                        <h4 className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-forest" /> Advanced Survey Responses
                        </h4>
                        <div className="space-y-3 font-semibold text-xs text-charcoal">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Waste Recycling</label>
                              <select
                                value={lifestyle.wasteRecycling || 'Average'}
                                onChange={(e: any) => setLifestyle(prev => ({ ...prev, wasteRecycling: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-offwhite border border-sage/20 rounded-lg font-bold text-[11px] outline-none cursor-pointer"
                              >
                                <option value="Excellent">Excellent</option>
                                <option value="Good">Good</option>
                                <option value="Average">Average</option>
                                <option value="Poor">Poor</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Shopping Freq</label>
                              <select
                                value={lifestyle.shoppingFrequency || 'Moderate'}
                                onChange={(e: any) => setLifestyle(prev => ({ ...prev, shoppingFrequency: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-offwhite border border-sage/20 rounded-lg font-bold text-[11px] outline-none cursor-pointer"
                              >
                                <option value="Rarely">Rarely</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Frequent">Frequent</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Food Sourcing</label>
                              <select
                                value={lifestyle.foodSourcing || 'Mixed'}
                                onChange={(e: any) => setLifestyle(prev => ({ ...prev, foodSourcing: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-offwhite border border-sage/20 rounded-lg font-bold text-[11px] outline-none cursor-pointer"
                              >
                                <option value="Mostly Local">Mostly Local</option>
                                <option value="Mixed">Mixed</option>
                                <option value="Mostly Imported">Mostly Imported</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Green Practices</label>
                              <select
                                value={lifestyle.sustainabilityPractices || 'Medium'}
                                onChange={(e: any) => setLifestyle(prev => ({ ...prev, sustainabilityPractices: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-offwhite border border-sage/20 rounded-lg font-bold text-[11px] outline-none cursor-pointer"
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] text-charcoal-muted mb-1 uppercase tracking-wider font-extrabold font-black">Renewable Energy Setup</label>
                            <select
                              value={lifestyle.renewableEnergy || 'None'}
                              onChange={(e: any) => setLifestyle(prev => ({ ...prev, renewableEnergy: e.target.value }))}
                              className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs outline-none cursor-pointer"
                            >
                              <option value="None">No Renewable Energy</option>
                              <option value="Some">Some Solar / Wind Sourced</option>
                              <option value="Full">100% Sourced</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ORIGINAL CALIBRATION WEIGHT MULTIPLIERS (NFR-9) */}
                {settingsActiveTab === 'multipliers' && (
                  <div className="space-y-6 animate-fade-in font-medium text-left">
                    {/* Transportation block */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-forest tracking-widest flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-gold" /> Travel Fuel Factors (kg CO₂ / km)
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Personal Car</label>
                          <input
                            type="number"
                            step="0.01"
                            value={factors.transport.Car}
                            onChange={(e) => setFactors({
                              ...factors,
                              transport: { ...factors.transport, Car: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Motorcycle</label>
                          <input
                            type="number"
                            step="0.01"
                            value={factors.transport.Bike}
                            onChange={(e) => setFactors({
                              ...factors,
                              transport: { ...factors.transport, Bike: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Transit Bus</label>
                          <input
                            type="number"
                            step="0.01"
                            value={factors.transport.Bus}
                            onChange={(e) => setFactors({
                              ...factors,
                              transport: { ...factors.transport, Bus: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Rail Transit</label>
                          <input
                            type="number"
                            step="0.01"
                            value={factors.transport.Train}
                            onChange={(e) => setFactors({
                              ...factors,
                              transport: { ...factors.transport, Train: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AC and Utility energy factors */}
                    <div className="space-y-3 pt-2">
                       <h4 className="text-[10px] font-black uppercase text-forest tracking-widest flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-gold" /> Power Constants (CO₂ / month)
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Aircon (hourly rate)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={factors.energy.acPerHour}
                            onChange={(e) => setFactors({
                              ...factors,
                              energy: { ...factors.energy, acPerHour: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Medium Bill Base</label>
                          <input
                            type="number"
                            value={factors.energy.billMedium}
                            onChange={(e) => setFactors({
                              ...factors,
                              energy: { ...factors.energy, billMedium: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Food consumption factor variables */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] font-black uppercase text-forest tracking-widest flex items-center gap-1">
                        <Leaf className="w-3.5 h-3.5 text-gold" /> Food Conversion Weights (mo)
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Plant-Only Base</label>
                          <input
                            type="number"
                            value={factors.food.baseVegetarian}
                            onChange={(e) => setFactors({
                              ...factors,
                              food: { ...factors.food, baseVegetarian: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Mixed Diet Base</label>
                          <input
                            type="number"
                            value={factors.food.baseMixed}
                            onChange={(e) => setFactors({
                              ...factors,
                              food: { ...factors.food, baseMixed: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-charcoal-muted mb-1">Animal protein serving multiplier (per meal)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={factors.food.meatServingImpact}
                            onChange={(e) => setFactors({
                              ...factors,
                              food: { ...factors.food, meatServingImpact: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 bg-offwhite border border-sage/20 rounded-lg font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer footer */}
              <div className="p-6 border-t border-sage/10 bg-[#faf9f6]/95 space-y-3">
                {settingsActiveTab === 'multipliers' ? (
                  <>
                    <button
                      onClick={resetFactorsToDefault}
                      className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-[#1f221f] font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                      id="reset-factors-defaults"
                    >
                      Restore Multipliers
                    </button>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        triggerAlert('Carbon Multipliers updated');
                      }}
                      className="w-full py-4 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-forest/10"
                    >
                      Apply & Recalibrate Matrix
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      triggerAlert('Profile updates persisted and calculated');
                    }}
                    className="w-full py-4 bg-forest hover:bg-forest-light text-offwhite font-bold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-forest/10"
                  >
                    Close Settings & Sync
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Custom Minimal Lucide Replacements for missing icons (clean SVG wraps)
function FuelIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 22h12v-5c0-1.5-1-2.5-2.5-2.5h-7C5 14.5 4 15.5 4 17v5z" />
      <path d="M14 2h4l2 3v13c0 .5-.5 1-1 1h-1l-1-1v-4" />
      <circle cx="9" cy="8" r="2" />
    </svg>
  );
}

function BusIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M4 12h16" />
      <path d="M6 16v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
      <circle cx="8" cy="16" r="1.5" />
      <circle cx="16" cy="16" r="1.5" />
    </svg>
  );
}

function RailIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="3" width="16" height="15" rx="2" />
      <path d="M4 11h16" />
      <path d="M12 3v8" />
      <path d="M8 18l-3 4" />
      <path d="M16 18l3 4" />
    </svg>
  );
}

function FeetIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18.4 12V6.2C18.4 4.1 16.7 2.4 14.6 2.4s-3.8 1.7-3.8 3.8V12h7.6z" />
      <path d="M13 15v5a2 2 0 1 1-4 0v-5" />
      <circle cx="16" cy="18" r="1.5" />
    </svg>
  );
}

function BikeIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6h3.5l1.5 3" />
      <path d="M12 15V8h3l1.2 3.6" />
      <path d="M5.5 17.5L12 8" />
    </svg>
  );
}

function EggIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2C7.5 2 4 7 4 11.5c0 4 3 6.5 8 6.5s8-2.5 8-6.5C20 7 16.5 2 12 2z" />
      <path d="M12 8c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5S13.5 8 12 8z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
