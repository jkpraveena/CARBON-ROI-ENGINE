/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LifestyleData, UserProfile, Recommendation } from '../types';
import { DEFAULT_EMISSION_FACTORS } from '../config/emissionFactors';

export interface CarbonFootprintResult {
  transport: number; // kg CO2/month
  energy: number;    // kg CO2/month
  food: number;      // kg CO2/month
  total: number;     // kg CO2/month
}

/**
 * Estimates the monthly carbon footprint based on lifestyle data.
 */
export function estimateCarbonFootprint(data: LifestyleData, customFactors?: typeof DEFAULT_EMISSION_FACTORS): CarbonFootprintResult {
  const factors = customFactors || DEFAULT_EMISSION_FACTORS;

  // 1. Transportation
  // (daily commute one-way * 2 * tripsPerWeek * 52 weeks / 12 months) * mode emission factor
  const monthlyCommuteDistance = data.commuteDistance * 2 * data.tripsPerWeek * 4.33;
  const transportModeFactor = factors.transport[data.transportMode] || 0;
  let transport = monthlyCommuteDistance * transportModeFactor;

  // 2. Energy
  // AC Hours/day * AC factor * 30 days + Electricity bracket flat rate
  const acUsage = data.acHoursPerDay * factors.energy.acPerHour * 30;
  let baseElectricity = factors.energy.billMedium;
  if (data.electricityBillRange === 'Low') {
    baseElectricity = factors.energy.billLow;
  } else if (data.electricityBillRange === 'High') {
    baseElectricity = factors.energy.billHigh;
  }
  let energy = acUsage + baseElectricity;

  // 3. Food
  let baseFood = factors.food.baseMixed;
  if (data.dietType === 'Vegetarian') {
    baseFood = factors.food.baseVegetarian;
  } else if (data.dietType === 'Eggetarian') {
    baseFood = factors.food.baseEggetarian;
  } else if (data.dietType === 'Frequent Meat') {
    baseFood = factors.food.baseFrequentMeat;
  }
  
  const additionalMeat = data.weeklyMeatFreq * factors.food.meatServingImpact * 4.33;
  let food = baseFood + additionalMeat;

  // Optional Advanced Profile Layer Influences
  if (data.advancedCompleted) {
    // 1. Renewable Energy usage (impacts energy directly)
    if (data.renewableEnergy === 'Some') {
      energy = energy * 0.75; // 25% reduction
    } else if (data.renewableEnergy === 'Full') {
      energy = energy * 0.35; // 65% reduction
    }

    // 2. Waste & Recycling Habits (added to energy category as home utility/infrastructure)
    if (data.wasteRecycling === 'Poor') {
      energy += 30;
    } else if (data.wasteRecycling === 'Average') {
      energy += 15;
    } else if (data.wasteRecycling === 'Good') {
      energy += 5;
    } else if (data.wasteRecycling === 'Excellent') {
      energy = Math.max(5, energy - 5); // organic composting & optimal recycling saves carbon
    }

    // 3. Shopping Frequency (clothes, design, electronics - added to consumption/food category)
    if (data.shoppingFrequency === 'Frequent') {
      food += 40;
    } else if (data.shoppingFrequency === 'Moderate') {
      food += 15;
    } else if (data.shoppingFrequency === 'Rarely') {
      food += 0;
    }

    // 4. Food Sourcing Preferences (mostly local vs mostly imported - impacts food directly)
    if (data.foodSourcing === 'Mostly Imported') {
      food += 25;
    } else if (data.foodSourcing === 'Mixed') {
      food += 10;
    } else if (data.foodSourcing === 'Mostly Local') {
      food = Math.max(10, food - 15); // native regional sourcing reduces food-miles transport overhead
    }

    // 5. Sustainability Practices (reusables, etc.)
    if (data.sustainabilityPractices === 'Low') {
      energy += 10;
      food += 5;
    } else if (data.sustainabilityPractices === 'Medium') {
      energy += 5;
    } else if (data.sustainabilityPractices === 'High') {
      energy = Math.max(5, energy - 10);
      food = Math.max(10, food - 10);
    }
  }

  const total = transport + energy + food;

  return {
    transport: Math.round(transport * 10) / 10,
    energy: Math.round(energy * 10) / 10,
    food: Math.round(food * 10) / 10,
    total: Math.round(total * 10) / 10,
  };
}

function hasSupportingData(id: string, data: LifestyleData): boolean {
  if (id === 'rec_transport_bus' || id === 'rec_transport_active' || id === 'rec_student_shuttle') {
    return data.publicTransportPracticality !== undefined && data.publicTransportPracticality !== null;
  }
  if (id === 'rec_energy_ac' || id === 'rec_energy_general') {
    return data.acComfort !== undefined && data.acComfort !== null;
  }
  if (id === 'rec_food_reduction' || id === 'rec_food_local') {
    return data.dietWillingness !== undefined && data.dietWillingness !== null;
  }
  if (id === 'rec_energy_solar') {
    return data.advancedCompleted === true && data.renewableEnergyFeasibility !== undefined && data.renewableEnergyFeasibility !== null;
  }
  if (id === 'rec_waste_compost' || id === 'rec_waste_eco_community') {
    return data.advancedCompleted === true && data.compostFeasibility !== undefined && data.compostFeasibility !== null;
  }
  if (id === 'rec_shopping_circular') {
    return data.advancedCompleted === true && data.shoppingWillingness !== undefined && data.shoppingWillingness !== null;
  }
  if (id === 'rec_food_sourcing_local') {
    return data.advancedCompleted === true && data.localFoodPracticality !== undefined && data.localFoodPracticality !== null;
  }
  if (id === 'rec_practices_zero_waste') {
    return data.advancedCompleted === true && data.reusablesWillingness !== undefined && data.reusablesWillingness !== null;
  }
  if (id === 'rec_practices_eco_electronics') {
    return data.advancedCompleted === true && data.sustainabilityPractices !== undefined && data.sustainabilityPractices !== null;
  }
  return false;
}

/**
 * Generates and ranks personalized recommendations based on emissions and user profile.
 */
export function generateRecommendations(
  data: LifestyleData,
  profile: UserProfile,
  footprint: CarbonFootprintResult,
  customFactors?: typeof DEFAULT_EMISSION_FACTORS
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const factors = customFactors || DEFAULT_EMISSION_FACTORS;

  const isStudent = profile.occupation.toLowerCase().includes('student') || 
                      profile.city.toLowerCase().includes('college') || 
                      profile.city.toLowerCase().includes('university');

  // Recommendation 1: Public Transport Swap (For Car or Bike users commuting reasonably)
  if ((data.transportMode === 'Car' || data.transportMode === 'Bike') && data.commuteDistance > 0 && data.tripsPerWeek > 0) {
    const originalFactor = factors.transport[data.transportMode];
    const busFactor = factors.transport.Bus;
    // Replace 2 trips per week with public transport
    const tripsToReplace = Math.min(2, data.tripsPerWeek);
    const roundtripSavingsPerTrip = data.commuteDistance * 2 * (originalFactor - busFactor);
    const monthlySavings = roundtripSavingsPerTrip * tripsToReplace * 4.33;

    if (monthlySavings > 2) {
      const feasibility = data.transportMode === 'Car' ? ('Medium' as const) : ('High' as const);
      const feasibilityScore = feasibility === 'High' ? 0.9 : 0.7;
      const confidence = 92; // High confidence because transport calculations are very linear

      recommendations.push({
        id: 'rec_transport_bus',
        action: `Replace ${tripsToReplace} weekly ${data.transportMode.toLowerCase()} trips with public bus transport.`,
        category: 'Transport',
        carbonSavings: Math.round(monthlySavings * 10) / 10,
        feasibility,
        feasibilityScore,
        confidence,
        explanation: `Transportation contributes to ${Math.round((footprint.transport / footprint.total) * 100)}% of your footprint. Shifting ${tripsToReplace} trips prevents direct fossil fuel combustion.`,
        mattersReason: `By leaving your ${data.transportMode.toLowerCase()} at home for select trips, you leverage shared bus infrastructure which operates at up to 3x higher relative fuel efficiency per occupant.`,
        roiScore: 0, // calculated below
      });
    }
  }

  // Recommendation 2: Active Travel Swap for shorter distances
  if ((data.transportMode === 'Car' || data.transportMode === 'Bike' || data.transportMode === 'Bus') && data.commuteDistance <= 8 && data.commuteDistance > 0) {
    // Walk or ride bike instead
    const originalFactor = factors.transport[data.transportMode];
    const tripsToReplace = Math.min(3, data.tripsPerWeek);
    const roundtripSavingsPerTrip = data.commuteDistance * 2 * originalFactor; // Active travel has 0 emission factor
    const monthlyWalkSavings = roundtripSavingsPerTrip * tripsToReplace * 4.33;

    if (monthlyWalkSavings > 3) {
      recommendations.push({
        id: 'rec_transport_active',
        action: `Switch to walking or cycling for ${tripsToReplace} shorter weekly commutes.`,
        category: 'Transport',
        carbonSavings: Math.round(monthlyWalkSavings * 10) / 10,
        feasibility: 'High',
        feasibilityScore: 0.95,
        confidence: 90,
        explanation: `Since your average daily distance is reasonably short (${data.commuteDistance} km), walking or cycling completely eliminates travel emissions.`,
        mattersReason: `For short journeys, engines run inefficiently. Switching to voluntary active transit drops single-occupancy travel carbon to absolute zero.`,
        roiScore: 0,
      });
    }
  }

  // Recommendation 3: Localized Campus Shuttle/Carpooling for Students (FR-11)
  if (isStudent && (data.transportMode === 'Car' || data.transportMode === 'Bike') && data.tripsPerWeek >= 2) {
    const originalFactor = factors.transport[data.transportMode];
    const shuttleSavings = data.commuteDistance * 2 * originalFactor * Math.min(3, data.tripsPerWeek) * 4.33;

    if (shuttleSavings > 4) {
      recommendations.push({
        id: 'rec_student_shuttle',
        action: `Use campus shuttle services or student carpools twice a week.`,
        category: 'Transport',
        carbonSavings: Math.round(shuttleSavings * 0.85 * 10) / 10, // Assuming shuttle counts for tiny base offset
        feasibility: 'High',
        feasibilityScore: 0.95,
        confidence: 94,
        explanation: `As a student in ${profile.city || 'campus zone'}, you have immediate access to dedicated campus shuttles. Shuffling commute patterns is highly viable.`,
        mattersReason: `Campus shuttles optimize routes and lower localized parking congestion, translating into high convenience and direct environmental offsets of ${Math.round(shuttleSavings * 0.85)} kg CO2 per month.`,
        roiScore: 0,
      });
    }
  }

  // Recommendation 4: AC Thermostat & Hour trim-down
  if (data.acHoursPerDay > 0) {
    // Trim AC usage by 2 hours daily + slight temp efficiency
    const hrsToTrim = Math.min(2, data.acHoursPerDay);
    const trimSavings = hrsToTrim * factors.energy.acPerHour * 30; // 30 days
    
    // Add 10% thermal efficiency bonus for adjusting temperature setting higher
    const totalAcSavings = trimSavings + (data.acHoursPerDay - hrsToTrim) * 0.05 * factors.energy.acPerHour * 30;

    if (totalAcSavings > 1) {
      recommendations.push({
        id: 'rec_energy_ac',
        action: `Adjust thermostat to 25°C and decrease usage by ${hrsToTrim} hours daily.`,
        category: 'Energy',
        carbonSavings: Math.round(totalAcSavings * 10) / 10,
        feasibility: 'High',
        feasibilityScore: 0.95,
        confidence: 95,
        explanation: `Your daily AC usage accounts for a significant electrical pull. Modifying temperatures drastically reduces home energy load.`,
        mattersReason: `AC compressor cycles consume massive electric currents. Decreasing operation cycles of cooling machines is the highest yield household efficiency step.`,
        roiScore: 0,
      });
    }
  }

  // Recommendation 5: Food habit adjustment: Vegetarian swap
  if (data.dietType === 'Frequent Meat' || data.dietType === 'Mixed' || data.weeklyMeatFreq > 1) {
    // Suggest 3 vegetarian/plant-focused days or 4 meals reduction
    const mealsToReplace = Math.max(2, Math.min(6, data.weeklyMeatFreq));
    const savingsPerMeal = factors.food.meatServingImpact;
    const foodSavings = mealsToReplace * savingsPerMeal * 4.33;

    if (foodSavings > 2) {
      const isFrequent = data.dietType === 'Frequent Meat';
      recommendations.push({
        id: 'rec_food_reduction',
        action: isFrequent
          ? `Exchange ${mealsToReplace} meat dinners weekly with protein-rich vegetarian meals.`
          : `Commit to 'Meatless Mondays' and replace ${mealsToReplace} meals weekly with plant alternatives.`,
        category: 'Food',
        carbonSavings: Math.round(foodSavings * 10) / 10,
        feasibility: isFrequent ? ('Medium' as const) : ('High' as const),
        feasibilityScore: isFrequent ? 0.75 : 0.9,
        confidence: 88,
        explanation: `Replacing agricultural livestock meat with pulses, legumes, and vegetable crop alternatives reduces methane and crop conversion emissions.`,
        mattersReason: `Beef, pork, and high-intensity meat production footprints are exponentially heavier than grain and vegetable crop farming per calorie produced.`,
        roiScore: 0,
      });
    }
  }

  // Advanced Optional Profile Recommendations (FR-Custom)
  if (data.advancedCompleted) {
    // 1. Certified green tariff or solar Panels
    if (data.renewableEnergy === 'None' || data.renewableEnergy === 'Some') {
      recommendations.push({
        id: 'rec_energy_solar',
        action: `Transition to a certified 100% renewable grid tariff or install home solar.`,
        category: 'Energy',
        carbonSavings: data.renewableEnergy === 'None' ? 38.0 : 20.0,
        feasibility: 'Medium',
        feasibilityScore: 0.65,
        confidence: 90,
        explanation: `Since your electricity grid source is currently fossil-heavy, choosing a certified green tariff or solar energy reduces base electric load emissions.`,
        mattersReason: `Renewable tariffs directly finance wind and solar additions to the local grid, displacing coal-based generation.`,
        roiScore: 0,
      });
    }

    // 2. Composting / Organic division
    if (data.wasteRecycling === 'Poor' || data.wasteRecycling === 'Average') {
      recommendations.push({
        id: 'rec_waste_compost',
        action: `Establish organic home composting and stream-divide household waste.`,
        category: 'Waste & Recycling',
        carbonSavings: 18.5,
        feasibility: 'High',
        feasibilityScore: 0.90,
        confidence: 85,
        explanation: `Organic matter decaying anaerobically in landfills releases potent methane gas. Composting aerates waste and yields rich soil instead.`,
        mattersReason: `Optimal sorting prevents valuable recyclables from getting soiled, keeping lifecycle greenhouse gases from skyrocketing.`,
        roiScore: 0,
      });
    }

    // 3. Shopper frequency limit
    if (data.shoppingFrequency === 'Frequent' || data.shoppingFrequency === 'Moderate') {
      recommendations.push({
        id: 'rec_shopping_circular',
        action: `Adopt vintage or second-hand circular purchasing for apparel & electronics.`,
        category: 'Consumer Goods',
        carbonSavings: data.shoppingFrequency === 'Frequent' ? 30.0 : 12.0,
        feasibility: 'High',
        feasibilityScore: 0.85,
        confidence: 80,
        explanation: `New apparel and electronics are manufacturing-heavy and fly via global freight lines. Choosing secondary options cuts industrial carbon.`,
        mattersReason: `Every month you delay buying raw goods prevents heavy metals extraction and high-temperature smelting emissions.`,
        roiScore: 0,
      });
    }

    // 4. Local sourcing preferences
    if (data.foodSourcing === 'Mostly Imported' || data.foodSourcing === 'Mixed') {
      recommendations.push({
        id: 'rec_food_sourcing_local',
        action: `Source seasonal produce from local markets to lower airline food-miles.`,
        category: 'Food',
        carbonSavings: data.foodSourcing === 'Mostly Imported' ? 22.0 : 10.0,
        feasibility: 'High',
        feasibilityScore: 0.90,
        confidence: 88,
        explanation: `Importing out-of-season fruits and cargo relies on fossil-fuel-intensive air transport and massive refrigeration depots.`,
        mattersReason: `Regional seasonal produce uses up to 5x less preservation electricity and requires near-zero long-haul diesel transport.`,
        roiScore: 0,
      });
    }

    // 5. Zero Single Use / Reusables practices
    if (data.sustainabilityPractices === 'Low' || data.sustainabilityPractices === 'Medium') {
      recommendations.push({
        id: 'rec_practices_zero_waste',
        action: `Commit to an uncompromising zero-single-use household standard.`,
        category: 'Sustainability Habits',
        carbonSavings: 12.0,
        feasibility: 'High',
        feasibilityScore: 0.95,
        confidence: 85,
        explanation: `Petroleum plastics and single-use containers contain high embodied extraction and high-temp molding carbon.`,
        mattersReason: `Swapping single-use water bottles and bags with reliable steel and textile counterparts drops petrochemical packaging needs.`,
        roiScore: 0,
      });
    }

    // 6. Eco-Mode defaults on electronics (Advanced Profile - FR-Custom)
    recommendations.push({
      id: 'rec_practices_eco_electronics',
      action: `Transition to 'Eco-Mode' defaults on high-draw home appliances and electronics.`,
      category: 'Sustainability Habits',
      carbonSavings: 8.5,
      feasibility: 'High',
      feasibilityScore: 0.95,
      confidence: 90,
      explanation: `Configuring eco-saver cycles on washers, smart TVs, and active computing systems lowers standby vampire grids.`,
      mattersReason: `Passive vampire loads leak constantly. Restricting unused active chips with intelligent hibernation state profiles scales down regional grid stress.`,
      roiScore: 0,
    });

    // 7. Community Compost Network & regional food swap (Advanced Profile - FR-Custom)
    if (data.compostFeasibility === 'Difficult' || data.compostFeasibility === 'Not Practical' || data.compostFeasibility === 'Possible') {
      recommendations.push({
        id: 'rec_waste_eco_community',
        action: `Sponsor or join a regional community organic drop network / local food cooperative.`,
        category: 'Waste & Recycling',
        carbonSavings: 14.0,
        feasibility: 'Medium',
        feasibilityScore: 0.75,
        confidence: 85,
        explanation: `When private garden facilities are unavailable, neighborhood programs aggregate organic sorting and manage industrial methane offsets.`,
        mattersReason: `Community drop-off bins bypass domestic location constraints, turning local organic scraps into agricultural nutrients with zero personal backyard footprint.`,
        roiScore: 0,
      });
    }
  }

  // If we don't have enough recommendations, add clean general baseline fallbacks safely
  if (recommendations.length < 3) {
    // Base electricity awareness recommendations
    if (data.electricityBillRange !== 'Low') {
      recommendations.push({
        id: 'rec_energy_general',
        action: `Audit vampire appliances & transition to LED bulbs.`,
        category: 'Energy',
        carbonSavings: 14.5,
        feasibility: 'High',
        feasibilityScore: 0.95,
        confidence: 85,
        explanation: `Phantom loads from plugged-in standby computer systems, chargers, and legacy yellow bulbs leak electricity constantly.`,
        mattersReason: `Converting home terminal loops to LED lighting scales down passive grid pull and offers incredibly fast returns on investment.`,
        roiScore: 0,
      });
    }
    
    // Low footprint general validation reinforcement recommendation
    if (data.dietType === 'Vegetarian') {
      recommendations.push({
        id: 'rec_food_local',
        action: `Focus on locally grown local seasonal produce over imported varieties.`,
        category: 'Food',
        carbonSavings: 8.2,
        feasibility: 'High',
        feasibilityScore: 0.9,
        confidence: 80,
        explanation: `While vegetarian diets are incredibly carbon-friendly, long-distance supply chain logistics (air freight) leak secondary emissions.`,
        mattersReason: `Choosing native seasonal items drops heavy transport overheads from supply and storage depots to near zero.`,
        roiScore: 0,
      });
    }
  }

  // Calculate dynamic ROI Scores of potential recommendations
  const scoredRecs = recommendations.map((rec) => {
    // 1. Determine constraint fit score
    let constraintFitScore = 1.0;
    let whyRecommended = '';

    if (rec.id === 'rec_transport_bus') {
      const val = data.publicTransportPracticality || 'Somewhat Practical';
      if (val === 'Very Practical') {
        constraintFitScore = 1.0;
        whyRecommended = 'We prioritised public bus transit because you indicated that public transport is very practical for your daily commute. This makes it an exceptionally easy and effective change to adopt.';
      } else if (val === 'Somewhat Practical') {
        constraintFitScore = 0.8;
        whyRecommended = 'We recommended public bus transit as you indicated public transport is somewhat practical for your commute, presenting a viable and impactful option to reduce single-occupancy travel.';
      } else if (val === 'Difficult') {
        constraintFitScore = 0.4;
        whyRecommended = 'Although public transport is difficult for your commute, shifting coordinates for even a couple of trips still provides high carbon offsets.';
      } else if (val === 'Not Practical') {
        constraintFitScore = 0.1;
        whyRecommended = 'We de-prioritised standard bus transit because public transport is not practical for your daily commute. We recommend exploring active travel or other options instead.';
      }
    } else if (rec.id === 'rec_transport_active') {
      const val = data.publicTransportPracticality || 'Somewhat Practical';
      constraintFitScore = (val === 'Difficult' || val === 'Not Practical') ? 0.9 : 1.0;
      whyRecommended = `We recommended walking and cycling because your average daily commute is reasonably short (${data.commuteDistance} km), making active travel highly feasible and bypassed from public transit restrictions.`;
    } else if (rec.id === 'rec_student_shuttle') {
      const val = data.publicTransportPracticality || 'Somewhat Practical';
      if (val === 'Not Practical' || val === 'Difficult') {
        constraintFitScore = 1.0;
        whyRecommended = 'We prioritised campus shuttle usage because you indicated that public transport is not practical for your commute. Since you already have access to campus transportation, this recommendation provides meaningful carbon reduction without reducing flexibility.';
      } else {
        constraintFitScore = 0.85;
        whyRecommended = 'We recommended student shuttle services or carpools since you have convenient access to student transit, simplifying parking and reducing solo trip footprints.';
      }
    } else if (rec.id === 'rec_energy_ac') {
      const val = data.acComfort || 'Possible';
      if (val === 'Easy') {
        constraintFitScore = 1.0;
        whyRecommended = 'This is highly recommended because adjusting AC thermostat levels is very easy for you. It drastically cuts your electricity footprint with near-zero compromise.';
      } else if (val === 'Possible') {
        constraintFitScore = 0.85;
        whyRecommended = 'We recommended a moderate AC hours adjustment because you comfortable with some reductions, saving substantial grid energy.';
      } else if (val === 'Difficult') {
        constraintFitScore = 0.5;
        whyRecommended = 'Though you find AC modifications difficult, even minor micro-adjustments or smart fan scheduling can still deliver significant energy savings without compromising comfort.';
      } else if (val === 'Not Realistic') {
        constraintFitScore = 0.1;
        whyRecommended = 'We de-prioritised active cooling cuts because reducing AC usage is not realistic for you. We suggest focusing on passive efficiency upgrades instead.';
      }
    } else if (rec.id === 'rec_energy_general') {
      const val = data.acComfort || 'Possible';
      constraintFitScore = (val === 'Difficult' || val === 'Not Realistic') ? 0.95 : 1.0;
      whyRecommended = 'Since active AC cuts might be difficult or unrealistic for you, we highlighted auditing vampire appliances and transit to LEDs. This optimizes electricity base-loads without any thermal comfort sacrifices.';
    } else if (rec.id === 'rec_food_reduction') {
      const val = data.dietWillingness || 'Somewhat Willing';
      if (val === 'Very Willing') {
        constraintFitScore = 1.0;
        whyRecommended = 'We prioritised dietary meat reduction because you are very willing to adjust food habits. Shifting away from heavy meat servings is the single most powerful tool for individual methane reduction.';
      } else if (val === 'Somewhat Willing') {
        constraintFitScore = 0.85;
        whyRecommended = 'We recommended a partial vegetarian meal swap because you are somewhat willing to adapt your diet, balancing food choice comfort with direct ecological benefit.';
      } else if (val === 'Minimal Changes Only') {
        constraintFitScore = 0.4;
        whyRecommended = 'Since you prefer minimal diet changes, we targeted a structured, low-frequency vegetarian swap that keeps meat as your primary choice while proving how small changes compound.';
      } else if (val === 'Not Willing') {
        constraintFitScore = 0.1;
        whyRecommended = 'We de-prioritised recipe modifications since you are not willing to change your diet. We suggest concentrating footprint efforts on transit and home energy.';
      }
    } else if (rec.id === 'rec_food_local') {
      const val = data.dietWillingness || 'Somewhat Willing';
      constraintFitScore = (val === 'Minimal Changes Only' || val === 'Not Willing') ? 0.9 : 1.0;
      whyRecommended = 'Since you expressed limited willingness for major dietary shifts, focusing on local, seasonal produce lets you maintain your eating habits while cutting heavy international transport logistics footprint.';
    } else if (rec.id === 'rec_energy_solar') {
      const feasibility = data.renewableEnergyFeasibility;
      if (feasibility) {
        if (feasibility === 'Already Done') {
          constraintFitScore = 1.0;
          whyRecommended = 'Since renewable energy integration is already completed at your home, going 100% clean power is a proven and natural state.';
        } else if (feasibility === 'Highly Feasible') {
          constraintFitScore = 0.95;
          whyRecommended = 'You indicated switching to renewables is highly feasible, making this a high-ROI, very realistic change.';
        } else if (feasibility === 'Too Expensive') {
          constraintFitScore = 0.4;
          whyRecommended = 'Even if green tariffs or home solar are currently too expensive for you, virtual net-metering plans can match standard grid costs.';
        } else {
          constraintFitScore = 0.1;
          whyRecommended = 'We de-prioritised direct solar transition since you currently have no local access to renewable infrastructure.';
        }
      } else {
        if (data.renewableEnergy === 'None') {
          constraintFitScore = 0.98;
          whyRecommended = 'Transitioning to certified green grid electricity delivers outstanding personal footprint offsets since you currently use 100% standard fossil-fuel grid power.';
        } else {
          constraintFitScore = 0.85;
          whyRecommended = 'Since you already use some solar energy, going 100% clean power is a natural next step to completely eliminate remaining grid emissions.';
        }
      }
    } else if (rec.id === 'rec_waste_compost') {
      const feasibility = data.compostFeasibility;
      if (feasibility) {
        if (feasibility === 'Very Feasible') {
          constraintFitScore = 1.0;
          whyRecommended = 'Establishing organic composting is exceptionally feasible for your space, preventing landfill methane decays with no friction.';
        } else if (feasibility === 'Possible') {
          constraintFitScore = 0.8;
          whyRecommended = 'You marked composting as possible. Starting with countertop food scraps collection bins is an easy gateway to zero-landfill status.';
        } else if (feasibility === 'Difficult') {
          constraintFitScore = 0.45;
          whyRecommended = 'Composting is difficult for your layout, but dropping organic waste at localized community collection hubs still keeps landfill methane low.';
        } else {
          constraintFitScore = 0.1;
          whyRecommended = 'We de-prioritised active organic composting as it is not practical for your household context.';
        }
      } else {
        if (data.wasteRecycling === 'Poor') {
          constraintFitScore = 0.96;
          whyRecommended = 'By introducing standard sorting and organic composting, you will instantly curb solid refuse decaying into landfill methane.';
        } else {
          constraintFitScore = 0.88;
          whyRecommended = 'Upgrading from simple sorting to active zero-landfill organic composting leverages your standard sorting habits with high efficiency.';
        }
      }
    } else if (rec.id === 'rec_shopping_circular') {
      const willingness = data.shoppingWillingness;
      if (willingness) {
        if (willingness === 'Very Willing') {
          constraintFitScore = 1.0;
          whyRecommended = 'Since you are very willing to buy vintage or pre-owned goods, embracing circular shopping will immediately prevent factory production loops.';
        } else if (willingness === 'Somewhat Willing') {
          constraintFitScore = 0.8;
          whyRecommended = 'Buying secondary high-quality furniture, apparel, or electronics is a comfortable way to keep items active and logistics chains offline.';
        } else {
          constraintFitScore = 0.35;
          whyRecommended = 'We de-prioritised circular shopping as reducing your standard retail loop is hard. Focus on high-durability items instead.';
        }
      } else {
        if (data.shoppingFrequency === 'Frequent') {
          constraintFitScore = 0.95;
          whyRecommended = 'As a frequent shopper, embracing vintage circular buying is your most powerful tool to slash factory smelting and upstream supply chain emissions.';
        } else {
          constraintFitScore = 0.82;
          whyRecommended = 'Buying secondary high-quality furniture, apparel, or electronics keeps item lifecycles active, keeping extra shipping cargo offline.';
        }
      }
    } else if (rec.id === 'rec_food_sourcing_local') {
      const practicality = data.localFoodPracticality;
      if (practicality) {
        if (practicality === 'Very Practical') {
          constraintFitScore = 1.0;
          whyRecommended = 'Since local food networks and direct farmers markets are very practical for your neighborhood, switching crops eliminates trans-oceanic refrigeration immediately.';
        } else if (practicality === 'Somewhat Practical') {
          constraintFitScore = 0.8;
          whyRecommended = 'Shifting grocery lists slightly toward in-season produce keeps mixed shopping healthy with lowered long-haul transportation logistics.';
        } else {
          constraintFitScore = 0.35;
          whyRecommended = 'Sourcing local food is difficult, but looking for regional labels in standard supermarkets still keeps long-distance cargo down.';
        }
      } else {
        if (data.foodSourcing === 'Mostly Imported') {
          constraintFitScore = 0.97;
          whyRecommended = 'With a mostly imported culinary base, switching to native food networks removes heavy air-cargo refrigeration footprints immediately.';
        } else {
          constraintFitScore = 0.86;
          whyRecommended = 'Shifting mixed store shopping toward direct community farmers markets drops heavy long-haul logistics footprints.';
        }
      }
    } else if (rec.id === 'rec_practices_zero_waste') {
      const willingness = data.reusablesWillingness;
      if (willingness) {
        if (willingness === 'Ready to commit') {
          constraintFitScore = 1.0;
          whyRecommended = 'Ready to commit to zero single-use standards! Shifting to reusable jars and steel bottles bypasses plastic thermo-molding loops completely.';
        } else if (willingness === 'Willing to try') {
          constraintFitScore = 0.8;
          whyRecommended = 'Willing to try reusable containers and bags is a balanced way to reduce the amount of one-off commercial packaging entering your bin.';
        } else {
          constraintFitScore = 0.35;
          whyRecommended = 'Since bringing your own bags or bottles is too inconvenient, focusing on recycling existing plastic items is a better first step.';
        }
      } else {
        if (data.sustainabilityPractices === 'Low') {
          constraintFitScore = 0.96;
          whyRecommended = 'Adopting basic reusable jars and steel bottles bypasses carbon-heavy plastic thermo-molding loops entirely.';
        } else {
          constraintFitScore = 0.88;
          whyRecommended = 'Upping your reusable game to zero single-use leaves standard high-energy commercial packaging chains out of your story.';
        }
      }
    } else if (rec.id === 'rec_practices_eco_electronics') {
      const val = data.sustainabilityPractices || 'Medium';
      if (val === 'Low') {
        constraintFitScore = 1.0;
        whyRecommended = 'Since you currently have low active sustainability habits, configuring Eco-Mode defaults on appliances is a high-ROI, set-and-forget upgrade with no lifestyle adjustments.';
      } else if (val === 'Medium') {
        constraintFitScore = 0.9;
        whyRecommended = 'Eco-modes align perfectly with your moderate sustainability focus, reducing device power draw automatically without compromising utility.';
      } else {
        constraintFitScore = 0.75;
        whyRecommended = 'An excellent technical micro-adjustment to supplement your high-sustainability profile, maximizing grid electricity offsets.';
      }
    } else if (rec.id === 'rec_waste_eco_community') {
      const val = data.compostFeasibility || 'Possible';
      if (val === 'Difficult' || val === 'Not Practical') {
        constraintFitScore = 1.0;
        whyRecommended = 'Because on-site home composting is difficult or not practical for you, joining a regional co-operative drop program allows you to divert organic waste from landfills with zero yard space required.';
      } else if (val === 'Possible') {
        constraintFitScore = 0.85;
        whyRecommended = 'Joining a community-scale collection hub perfectly complements your existing compost opportunities, aggregating green waste efficiently.';
      } else {
        constraintFitScore = 0.6;
        whyRecommended = 'Since home composting is highly feasible for you, direct backyard composting remains slightly more efficient than neighborhood cooperative logistics, but community hubs remain open!';
      }
    } else {
      constraintFitScore = 1.0;
      whyRecommended = 'Based on your lifestyle and environmental factors, this action matches your available sustainability capabilities perfectly.';
    }

    const hasData = hasSupportingData(rec.id, data);
    const roiScore = rec.carbonSavings * rec.feasibilityScore * (rec.confidence / 100) * constraintFitScore;
    return {
      ...rec,
      constraintFitScore: Math.round(constraintFitScore * 100) / 100,
      personalFitScore: hasData ? Math.round(constraintFitScore * 100) : undefined,
      whyRecommended,
      roiScore: Math.round(roiScore * 10) / 10,
    };
  });

  // Rank by ROI Score descending, return top list
  return scoredRecs.sort((a, b) => b.roiScore - a.roiScore);
}
