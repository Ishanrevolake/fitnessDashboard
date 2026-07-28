import type { ClientMealPlan, MealPlanDay } from "./types";

export const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const legacyDayMap: Record<string, string> = {
  "day 1": "Monday",
  "day 2": "Tuesday",
  "day 3": "Wednesday",
  "day 4": "Thursday",
  "day 5": "Friday",
  "day 6": "Saturday",
  "day 7": "Sunday",
};

function getDayId(day: string) {
  return `meal-${day.toLowerCase()}`;
}

export function createWeeklyMealDays(): MealPlanDay[] {
  return weekDays.map((day) => ({
    id: getDayId(day),
    day,
    meals: [],
  }));
}

export function normalizeMealPlanDays(days?: MealPlanDay[]) {
  const existingDays = Array.isArray(days) ? days : [];

  return weekDays.map((day) => {
    const matchingDays = existingDays.filter((item) => {
      const normalizedDay = item.day.trim().toLowerCase();
      const mappedDay = legacyDayMap[normalizedDay] ?? item.day;

      return mappedDay.toLowerCase() === day.toLowerCase();
    });
    const firstMatch = matchingDays[0];
    const meals = matchingDays.flatMap((item) => item.meals ?? []);

    return {
      id: firstMatch?.id || getDayId(day),
      day,
      meals: meals.map((meal) => ({
        ...meal,
        items: Array.isArray(meal.items) ? [...meal.items] : [],
        foods: Array.isArray(meal.foods) ? meal.foods.map((food) => ({
          ...food,
          grams: Number(food.grams) || 0,
          calories: Number(food.calories) || 0,
          protein: Number(food.protein) || 0,
          carbs: Number(food.carbs) || 0,
          fat: Number(food.fat) || 0,
          fiber: Number(food.fiber) || 0,
          sugar: Number(food.sugar) || 0,
          sodium: Number(food.sodium) || 0,
        })) : [],
        calories: Number(meal.calories) || 0,
        protein: Number(meal.protein) || 0,
        carbs: Number(meal.carbs) || 0,
        fat: Number(meal.fat) || 0,
      })),
    };
  });
}

export function normalizeClientMealPlan(mealPlan?: ClientMealPlan): ClientMealPlan {
  return {
    focus: mealPlan?.focus || "Custom nutrition plan",
    startDate: mealPlan?.startDate || new Date().toISOString().slice(0, 10),
    trainerNotes: mealPlan?.trainerNotes ?? "",
    days: normalizeMealPlanDays(mealPlan?.days),
  };
}
