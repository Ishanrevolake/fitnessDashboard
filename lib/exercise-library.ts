import type { ExerciseCategory, ExerciseLibraryItem } from "./types";

const exerciseNames = [
  "4-3-1 dumbbell sumo squat",
  "4-3-1 sumo squat",
  "Back supported overhead EZ bar tricep extensions",
  "Back supported tricep push down",
  "Barbell JM press",
  "Barbell RDL",
  "Barbell back squat",
  "Barbell hip thrusts",
  "Behind the back barbell wrist curl",
  "Bent over dumbbell rows",
  "Bent over dumbbell rows wide grip",
  "Bent over lateral raises",
  "Box squat",
  "Bulgarian split squat",
  "Cable curls",
  "Cable kickbacks",
  "Calf raise machine",
  "Calf raises",
  "California press",
  "Chest supported rear delt fly",
  "Chest supported wide grip rows",
  "Close grip pull down",
  "Cross mountain climbers",
  "Cross trainer cardio",
  "Crossbody hammer curls",
  "Dead hang",
  "Decline reverse crunch",
  "Deficit reverse lunge smith",
  "Deficit smith RDL",
  "Dumbbell RDL",
  "Dumbbell bicep curls",
  "Dumbbell chest flys",
  "Dumbbell curls",
  "Dumbbell floor press",
  "Dumbbell good mornings",
  "Dumbbell hammer curls",
  "Dumbbell hip thrusts",
  "Dumbbell lateral raises",
  "Dumbbell pull over",
  "Dumbbell shoulder press",
  "Dumbbell shrugs",
  "Dumbbell squats",
  "Dumbbell upright row",
  "EZ bar curls",
  "EZ bar preacher curl",
  "Feet forward smith squat",
  "Flat dumbbell bench press",
  "Fly to press incline",
  "Glute biased smith squat",
  "Glute dominant smith squat",
  "Glute kick back machine",
  "Glute kick backs",
  "Glute step ups",
  "Glute-ham extension",
  "Hack squat",
  "Ham focused back extension",
  "Ham-glute back extension",
  "Hamstring back extensions",
  "Hanging leg raises",
  "Heel elevated smith squat",
  "High incline dumbbell curls",
  "Hip abduction",
  "Hollow body hold",
  "Incline barbell bench press",
  "Incline bench press",
  "Incline chest press",
  "Incline dumbbell bench press",
  "Incline dumbbell chest flys",
  "Incline dumbbell curls",
  "Incline leg press",
  "Incline leg press calf raises",
  "Incline leg raises",
  "Incline machine chest press",
  "Incline narrow grip bench",
  "Incline push ups",
  "Incline wide grip bench press",
  "Iso lat pull down",
  "Jump rope",
  "Jumping jacks",
  "Kettle bell swings",
  "Knee raises",
  "Lean in hip abduction",
  "Lean in lateral raises",
  "Leg curls",
  "Leg extensions",
  "Leg press calf raises",
  "Leg press quad focus",
  "Low incline dumbbell bench press",
  "Low to high cable chest flys",
  "Lying cable tricep extension",
  "Lying down EZ bar tricep extension",
  "Lying down cable tricep extension",
  "Lying down dumbbell tricep extension",
  "Lying dumbbell tricep extensions",
  "Lying leg curls",
  "Machine RDL",
  "Machine ab crunches",
  "Machine bicep curls",
  "Machine chest flys",
  "Machine chest press",
  "Machine hip thrusts",
  "Machine lateral raises",
  "Machine shoulder press",
  "Middle cable chest flys",
  "Middle chest flys",
  "Mountain climbers",
  "Narrow grip bench press",
  "Narrow grip machine chest press",
  "Narrow grip push ups",
  "Neutral grip lat pull down",
  "No push up burpee",
  "Overhead cable tricep extensions",
  "Overhead tricep extension",
  "Pec dec machine chest fly",
  "Plate pinches",
  "Pronated lat pull down",
  "Pull up",
  "Pull ups weighted",
  "Push ups",
  "Reverse crunches",
  "Reverse lunges",
  "Scap pulls",
  "Seated barbell shoulder press",
  "Seated barbell wrist curls",
  "Seated calf raises",
  "Seated chest flys",
  "Seated dumbbell curl",
  "Seated dumbbell hammer curls",
  "Seated dumbbell lateral raises",
  "Seated dumbbell shoulder press",
  "Seated incline lateral raises",
  "Seated lateral raises",
  "Seated leg curls",
  "Seated machine shoulder press",
  "Seated overhead EZ bar tricep extension",
  "Seated wide grip row",
  "Single arm dumbbell preacher curl",
  "Single arm dumbbell rows",
  "Single arm dumbbell wrist curl",
  "Single arm overhead tricep extension",
  "Single leg barbell hip thrust",
  "Single leg dumbbell calf raises",
  "Smith RDL",
  "Smith deficit reverse lunge",
  "Smith good mornings",
  "Smith hip thrusts",
  "Smith machine hip thrusts",
  "Smith reverse lunge deficit",
  "Smith shrugs",
  "Smith wide grip shrugs",
  "Standing barbell wrist curl",
  "Standing calf raises",
  "Standing dumbbell wrist curl",
  "Standing lateral raises",
  "Standing leg curls",
  "Stiff legged good mornings",
  "Straight arm plank",
  "Straight bar curls",
  "Sumo deficit squats",
  "Sumo leg press",
  "Sumo smith squat",
  "Supinated grip lat pull down",
  "Supinated lat pull down",
  "Supinated pull down",
  "Tricep dips",
  "Tricep push down",
  "Tricep push down rope",
  "Unilateral rear delt fly",
  "V squats",
  "Walkout to plank",
  "Weighted cable crunch",
  "Wide grip T-bar row chest supported",
  "Wide grip lat pull down",
  "Wide grip push ups",
  "Wide grip rows",
  "Wide grip smith shrugs",
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getCategory(name: string): ExerciseCategory {
  const value = name.toLowerCase();

  if (/(crunch|plank|leg raises|knee raises|mountain|hollow|burpee|walkout)/.test(value)) return "Core";
  if (/(jump|cardio|trainer|swings)/.test(value)) return "Cardio";
  if (/(curl|tricep|jm press|dips|wrist)/.test(value)) return "Arms";
  if (/(row|pull|pulldown|pull down|dead hang|scap)/.test(value)) return "Back";
  if (/(bench|chest|push ups|flys|fly|pec dec|floor press)/.test(value)) return "Chest";
  if (/(shoulder|lateral|shrug|rear delt|upright row)/.test(value)) return "Shoulders";
  if (/(glute|hip thrust|kick back|abduction)/.test(value)) return "Glutes";
  if (/(squat|rdl|lunge|leg|calf|ham|string|good morning|hack|v squats)/.test(value)) return "Legs";

  return "Mobility";
}

function getEquipment(name: string) {
  const value = name.toLowerCase();

  if (value.includes("dumbbell")) return "Dumbbell";
  if (value.includes("barbell")) return "Barbell";
  if (value.includes("ez bar")) return "EZ Bar";
  if (value.includes("cable")) return "Cable";
  if (value.includes("smith")) return "Smith Machine";
  if (value.includes("machine")) return "Machine";
  if (value.includes("leg press")) return "Leg Press";
  if (value.includes("kettle bell")) return "Kettlebell";
  if (value.includes("t-bar")) return "T-Bar";
  if (/(push ups|pull up|plank|mountain|burpee|jumping jacks|walkout|hollow|dead hang)/.test(value)) return "Bodyweight";

  return "Free Weight";
}

export const exerciseLibrary: ExerciseLibraryItem[] = exerciseNames.map((name) => ({
  id: slugify(name),
  name,
  category: getCategory(name),
  equipment: getEquipment(name),
}));

export const exerciseCategories: ExerciseCategory[] = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Glutes", "Core", "Cardio", "Mobility"];
