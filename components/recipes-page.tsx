"use client";

import { Beef, EggFried, Plus, Salad, Search, Soup, Vegan, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { mealLibrary } from "@/lib/meal-library";
import type { MealLibraryItem } from "@/lib/types";

const customRecipesStorageKey = "alphaFitnessCustomRecipes";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getStoredCustomRecipes() {
  if (typeof window === "undefined") return [];

  try {
    const rawRecipes = window.localStorage.getItem(customRecipesStorageKey);
    if (!rawRecipes) return [];

    return JSON.parse(rawRecipes) as MealLibraryItem[];
  } catch {
    return [];
  }
}

function saveStoredCustomRecipes(recipes: MealLibraryItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(customRecipesStorageKey, JSON.stringify(recipes));
}

function getRecipeTheme(recipe: MealLibraryItem) {
  const value = `${recipe.name} ${recipe.category}`.toLowerCase();

  if (value.includes("beef") || value.includes("chicken") || value.includes("tuna")) return { label: "High Protein", icon: Beef, tone: "green" };
  if (value.includes("smoothie") || value.includes("salad") || value.includes("fruit")) return { label: "Vegan", icon: Vegan, tone: "cyan" };
  if (value.includes("oats") || value.includes("rice") || value.includes("samaposha")) return { label: "Bulk", icon: EggFried, tone: "orange" };
  if (value.includes("soup") || value.includes("curry")) return { label: "Warm Meal", icon: Soup, tone: "purple" };

  return { label: recipe.category || "Recipe", icon: Salad, tone: "green" };
}

function estimateRecipe(recipe: MealLibraryItem) {
  const text = recipe.items.join(" ").toLowerCase();
  const proteinSignals = (text.match(/chicken|beef|tuna|egg|protein|fish|yogurt|cheese/g) ?? []).length;
  const carbSignals = (text.match(/rice|oats|bread|banana|potato|wrap|flour|samaposha/g) ?? []).length;
  const calories = Math.min(760, 320 + proteinSignals * 38 + carbSignals * 34 + recipe.items.length * 9);
  const protein = Math.min(62, 16 + proteinSignals * 5);
  const carbs = Math.min(124, 34 + carbSignals * 9 + recipe.items.length * 2);
  const minutes = Math.min(45, Math.max(10, 8 + recipe.items.length * 2));

  return { calories, protein, carbs, minutes };
}

export function RecipesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [customRecipes, setCustomRecipes] = useState<MealLibraryItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<MealLibraryItem | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const allRecipes = useMemo(() => [...customRecipes, ...mealLibrary], [customRecipes]);
  const categories = useMemo(() => Array.from(new Set(allRecipes.map((recipe) => recipe.category))).sort(), [allRecipes]);
  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return allRecipes.filter((recipe) => {
      const matchesSearch =
        !normalizedSearch ||
        [recipe.name, recipe.category, recipe.items.join(" ")].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesCategory = !category || recipe.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [allRecipes, category, search]);

  useEffect(() => {
    setCustomRecipes(getStoredCustomRecipes());
  }, []);

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Recipe Book" subtitle={`${filteredRecipes.length} recipes from the ALF meal library`} />

        <main className="main-content">
          <section className="search-section recipe-filter-bar">
            <div className="search-control">
              <Search size={20} style={{ color: "var(--text-muted)" }} />
              <input placeholder="Search recipes by name, category, or ingredient..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className="modern-select" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button className="btn-primary toolbar-button add-exercise-button" type="button" onClick={() => setAddModalOpen(true)}>
              <Plus size={14} /> Add Recipe
            </button>
          </section>

          <section className="recipe-card-grid">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onView={setSelectedRecipe} />
            ))}
          </section>
        </main>
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      <AddRecipeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={(recipe) => {
          const nextRecipes = [recipe, ...customRecipes];
          setCustomRecipes(nextRecipes);
          saveStoredCustomRecipes(nextRecipes);
          setAddModalOpen(false);
        }}
      />
    </DashboardShell>
  );
}

function AddRecipeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (recipe: MealLibraryItem) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [itemsText, setItemsText] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;

    setName("");
    setCategory("Custom");
    setItemsText("");
    setNotes("");
    setFormError("");
  }, [open]);

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = itemsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name.trim() || !category.trim() || !items.length) {
      setFormError("Add a recipe name, category, and at least one instruction line.");
      return;
    }

    onSubmit({
      id: `custom-recipe-${slugify(name)}-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      items,
      notes: notes.trim() || "Custom recipe",
    });
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content recipe-modal-content" role="dialog" aria-modal="true" aria-labelledby="add-recipe-title">
        <div className="modal-header">
          <h2 id="add-recipe-title">Add Recipe</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close add recipe modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          {formError ? <div className="auth-error">{formError}</div> : null}

          <div className="form-group">
            <label htmlFor="recipeName">Recipe Name</label>
            <input id="recipeName" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Lean Beef Stir Fry" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="recipeCategory">Category</label>
              <input id="recipeCategory" required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="High Protein" />
            </div>
            <div className="form-group">
              <label htmlFor="recipeNotes">Notes</label>
              <input id="recipeNotes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="recipeItems">Ingredients and Instructions</label>
            <textarea
              id="recipeItems"
              required
              rows={8}
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              placeholder={"150g lean beef\n200g mixed vegetables\nCook beef in a pan for 6-8 minutes\nAdd vegetables and seasoning"}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Recipe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onView }: { recipe: MealLibraryItem; onView: (recipe: MealLibraryItem) => void }) {
  const theme = getRecipeTheme(recipe);
  const Icon = theme.icon;
  const estimate = estimateRecipe(recipe);

  return (
    <article className="recipe-card">
      <div className="recipe-card-art">
        <span className={`recipe-chip ${theme.tone}`}>{theme.label}</span>
        <div className={`recipe-icon-wrap ${theme.tone}`}>
          <Icon size={40} />
        </div>
      </div>
      <div className="recipe-card-body">
        <h3>{recipe.name}</h3>
        <p>
          {recipe.category} · {estimate.minutes} min
        </p>
        <div className="recipe-macros">
          <span>
            <strong>{estimate.calories}</strong> kcal
          </span>
          <span>
            <strong>{estimate.protein}g</strong> P
          </span>
          <span>
            <strong>{estimate.carbs}</strong> carbs
          </span>
        </div>
        <button className="recipe-view-button" type="button" onClick={() => onView(recipe)}>
          View
        </button>
      </div>
    </article>
  );
}

function RecipeModal({ recipe, onClose }: { recipe: MealLibraryItem | null; onClose: () => void }) {
  const estimate = recipe ? estimateRecipe(recipe) : null;

  return (
    <div className={`modal-overlay ${recipe ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content recipe-modal-content" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
        <div className="modal-header">
          <div>
            <h2 id="recipe-modal-title">{recipe?.name}</h2>
            {recipe && estimate ? (
              <span className="text-muted">
                {recipe.category} · {estimate.minutes} min · {estimate.calories} kcal
              </span>
            ) : null}
          </div>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close recipe modal">
            <X size={20} />
          </button>
        </div>

        <div className="recipe-modal-body">
          <span className="client-meta-label">Ingredients and Instructions</span>
          <div className="recipe-instruction-list">
            {recipe?.items.map((item, index) => (
              <div className="recipe-instruction-row" key={`${recipe.id}-${index}`}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          {recipe?.notes ? (
            <div className="recipe-note">
              <strong>Notes</strong>
              <p>{recipe.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
