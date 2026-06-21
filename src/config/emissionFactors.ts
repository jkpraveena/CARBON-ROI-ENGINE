/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmissionFactors {
  transport: {
    Car: number;      // kg CO2 per km
    Bike: number;     // kg CO2 per km (motorcycle/scooter)
    Bus: number;      // kg CO2 per passenger-km
    Train: number;    // kg CO2 per passenger-km
    Walking: number;  // kg CO2 per km
    Cycling: number;  // kg CO2 per km
  };
  energy: {
    acPerHour: number; // kg CO2 per hour of AC operation
    billLow: number;    // kg CO2 per month
    billMedium: number; // kg CO2 per month
    billHigh: number;   // kg CO2 per month
  };
  food: {
    baseVegetarian: number; // kg CO2 per month
    baseEggetarian: number; // kg CO2 per month
    baseMixed: number;      // kg CO2 per month
    baseFrequentMeat: number; // kg CO2 per month
    meatServingImpact: number; // kg CO2 per additional meat serving
  };
}

export const DEFAULT_EMISSION_FACTORS: EmissionFactors = {
  transport: {
    Car: 0.18,
    Bike: 0.08,
    Bus: 0.06,
    Train: 0.04,
    Walking: 0,
    Cycling: 0,
  },
  energy: {
    acPerHour: 0.60,
    billLow: 110,
    billMedium: 240,
    billHigh: 480,
  },
  food: {
    baseVegetarian: 90,
    baseEggetarian: 120,
    baseMixed: 210,
    baseFrequentMeat: 320,
    meatServingImpact: 2.50,
  },
};
