export type FoodLibraryItem = {
  id: string;
  name: string;
  basis: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

type FoodRow = [string, string, number, number, number, number, number?, number?, number?];

const rows: FoodRow[] = [
  ["Eggs", "whole, raw", 155, 13, 11, 1.1, 0, 1.1, 124],
  ["Canned tuna", "in water, drained", 116, 26, .8, 0, 0, 0, 247],
  ["Salmon", "raw, Atlantic", 208, 20, 13, 0, 0, 0, 59],
  ["Cod", "raw", 82, 18, .7, 0, 0, 0, 54],
  ["Haddock", "raw", 90, 20, .6, 0, 0, 0, 68],
  ["Shrimp", "raw", 99, 24, .3, .2, 0, 0, 111],
  ["Prawns", "raw", 99, 24, .3, .2, 0, 0, 148],
  ["Chickpeas", "cooked, boiled", 164, 8.9, 2.6, 27.4, 7.6, 4.8, 7],
  ["Kidney beans", "cooked, boiled", 127, 8.7, .5, 22.8, 6.4, .3, 2],
  ["Mung beans", "cooked, boiled", 105, 7, .4, 19.2, 7.6, 2, 2],
  ["Dhal (red lentils)", "cooked, boiled", 116, 9, .4, 20.1, 7.9, 1.8, 2],
  ["Basmati rice", "cooked, white", 121, 3.5, .4, 25.2, .4, .1, 1],
  ["Brown rice", "cooked", 123, 2.7, 1, 25.6, 1.8, .4, 4],
  ["Red Nadu rice", "cooked, estimate", 111, 2.6, .9, 23.5, 1.8, .2, 3],
  ["Pasta", "cooked, plain", 131, 5, 1.1, 25, 1.8, .6, 1],
  ["Plain noodles", "cooked, wheat", 138, 4.5, 2.1, 25, 1.2, .5, 5],
  ["Rolled oats", "dry", 389, 16.9, 6.9, 66.3, 10.6, .99, 2],
  ["Oat flour", "dry", 404, 14.7, 9.1, 65.7, 6.5, 0, 4],
  ["Chickpea flour (besan)", "dry", 387, 22.4, 6.7, 57.8, 10.8, 10.7, 64],
  ["Potato", "raw", 77, 2, .1, 17.5, 2.2, .8, 6],
  ["Sweet potato", "raw", 86, 1.6, .1, 20.1, 3, 4.2, 55],
  ["Almonds", "raw", 579, 21.2, 49.9, 21.6, 12.5, 4.4, 1],
  ["Cashews", "raw", 553, 18.2, 43.9, 30.2, 3.3, 5.9, 12],
  ["Mixed nuts", "raw, average", 607, 20, 54, 19, 7, 4, 5],
  ["Coconut", "raw meat", 354, 3.3, 33.5, 15.2, 9, 6.2, 20],
  ["Coconut milk", "canned, full fat", 230, 2.3, 23.8, 5.5, 2.2, 3.3, 15],
  ["Coconut oil", "oil", 862, 0, 100, 0],
  ["Olive oil", "oil", 884, 0, 100, 0, 0, 0, 2],
  ["Butter", "salted", 717, .9, 81.1, .1, 0, .1, 643],
  ["Cocoa powder", "unsweetened", 228, 19.6, 13.7, 57.9, 33, 1.8, 21],
  ["Chia seeds", "dry", 486, 16.5, 30.7, 42.1, 34.4, 0, 16],
  ["Psyllium husk", "dry, estimate", 355, 2.6, .7, 88.9, 79, 0, 5],
  ["Chicken breast", "raw, skinless", 120, 22.5, 2.6, 0, 0, 0, 45],
  ["Chicken breast", "cooked, skinless", 165, 31, 3.6, 0, 0, 0, 74],
  ["Chicken thigh", "raw, skinless", 116, 19.4, 3.7, 0, 0, 0, 66],
  ["Chicken thigh", "cooked, skinless", 179, 24.8, 8.2, 0, 0, 0, 90],
  ["Chicken leg", "cooked, skin-on", 216, 25.4, 11.4, 0, 0, 0, 83],
  ["Chicken wing", "cooked, skin-on", 290, 26.9, 19.5, 0, 0, 0, 82],
  ["Apple", "raw, with skin", 52, .3, .2, 13.8, 2.4, 10.4, 1],
  ["Banana", "raw", 89, 1.1, .3, 22.8, 2.6, 12.2, 1],
  ["Orange", "raw", 47, .9, .1, 11.8, 2.4, 9.4, 0],
  ["Mango", "raw", 60, .8, .4, 15, 1.6, 13.7, 1],
  ["Papaya", "raw", 43, .5, .3, 10.8, 1.7, 7.8, 8],
  ["Pineapple", "raw", 50, .5, .1, 13.1, 1.4, 9.9, 1],
  ["Grapes", "raw", 69, .7, .2, 18.1, .9, 15.5, 2],
  ["Watermelon", "raw", 30, .6, .2, 7.6, .4, 6.2, 1],
  ["Pomegranate", "raw, arils", 83, 1.7, 1.2, 18.7, 4, 13.7, 3],
  ["Strawberry", "raw", 32, .7, .3, 7.7, 2, 4.9, 1],
  ["Blueberry", "raw", 57, .7, .3, 14.5, 2.4, 10, 1],
  ["Avocado", "raw", 160, 2, 14.7, 8.5, 6.7, .7, 7],
  ["Guava", "raw", 68, 2.6, 1, 14.3, 5.4, 8.9, 2],
  ["Lime", "raw", 30, .7, .2, 10.5, 2.8, 1.7, 2],
  ["Lemon", "raw, with peel", 29, 1.1, .3, 9.3, 2.8, 2.5, 2],
  ["Kiwi", "raw", 61, 1.1, .5, 14.7, 3, 9, 3],
  ["Pear", "raw, with skin", 57, .4, .1, 15.2, 3.1, 9.8, 1],
  ["Peach", "raw", 39, .9, .3, 9.5, 1.5, 8.4, 0],
  ["Plum", "raw", 46, .7, .3, 11.4, 1.4, 9.9, 0],
  ["Dragon fruit", "raw", 60, 1.2, .4, 13, 3, 8, 0],
  ["Passion fruit", "raw", 97, 2.2, .7, 23.4, 10.4, 11.2, 28],
  ["Melon (cantaloupe)", "raw", 34, .8, .2, 8.2, .9, 7.9, 16],
  ["Dates", "dried", 277, 1.8, .2, 75, 6.7, 63, 1],
  ["Jackfruit", "raw", 95, 1.7, .6, 23.2, 1.5, 19.1, 2],
  ["Tomato", "raw", 18, .9, .2, 3.9, 1.2, 2.6, 5],
  ["Onion", "raw", 40, 1.1, .1, 9.3, 1.7, 4.2, 4],
  ["Garlic", "raw", 149, 6.4, .5, 33.1, 2.1, 1, 17],
  ["Carrot", "raw", 41, .9, .2, 9.6, 2.8, 4.7, 69],
  ["Cabbage", "raw", 25, 1.3, .1, 5.8, 2.5, 3.2, 18],
  ["Broccoli", "raw", 34, 2.8, .4, 6.6, 2.6, 1.7, 33],
  ["Cauliflower", "raw", 25, 1.9, .3, 5, 2, 1.9, 30],
  ["Spinach", "raw", 23, 2.9, .4, 3.6, 2.2, .4, 79],
  ["Kale", "raw", 49, 4.3, .9, 8.8, 3.6, 2.3, 38],
  ["Lettuce", "raw", 15, 1.4, .2, 2.9, 1.3, .8, 28],
  ["Cucumber", "raw, with peel", 15, .7, .1, 3.6, .5, 1.7, 2],
  ["Bell pepper (capsicum)", "raw", 31, 1, .3, 6, 2.1, 4.2, 4],
  ["Green beans", "raw", 31, 1.8, .2, 7, 3.4, 3.3, 6],
  ["Eggplant (brinjal)", "raw", 25, 1, .2, 6, 3, 3.5, 2],
  ["Okra (ladies' finger)", "raw", 33, 1.9, .2, 7.5, 3.2, 1.5, 7],
  ["Pumpkin", "raw", 26, 1, .1, 6.5, .5, 2.8, 1],
  ["Zucchini", "raw", 17, 1.2, .3, 3.1, 1, 2.5, 8],
  ["Beetroot", "raw", 43, 1.6, .2, 9.6, 2.8, 6.8, 78],
  ["Radish", "raw", 16, .7, .1, 3.4, 1.6, 1.9, 39],
  ["Green peas", "raw", 81, 5.4, .4, 14.5, 5.7, 5.7, 5],
  ["Sweet corn", "raw", 86, 3.3, 1.4, 19, 2.7, 6.3, 15],
  ["Mushroom (button)", "raw", 22, 3.1, .3, 3.3, 1, 2, 5],
  ["Leeks", "raw", 61, 1.5, .3, 14.2, 1.8, 3.9, 20],
  ["Celery", "raw", 16, .7, .2, 3, 1.6, 1.3, 80],
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const foodLibrary: FoodLibraryItem[] = rows.map(([name, basis, calories, protein, fat, carbs, fiber = 0, sugar = 0, sodium = 0], index) => ({
  id: `${slugify(name)}-${slugify(basis)}-${index}`,
  name,
  basis,
  calories,
  protein,
  fat,
  carbs,
  fiber,
  sugar,
  sodium,
}));
