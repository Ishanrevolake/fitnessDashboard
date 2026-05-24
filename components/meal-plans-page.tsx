"use client";

import { CalendarDays, Flame, Leaf, Plus, Search, TrendingUp, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { Toast } from "@/components/toast";
import { fetchClientMealPlan, fetchClients, updateClientMealPlanViaApi } from "@/lib/api-client";
import { hasTrainerAccess } from "@/lib/auth-store";
import { mealLibrary } from "@/lib/meal-library";
import { normalizeClientMealPlan, normalizeMealPlanDays, weekDays } from "@/lib/meal-plan-utils";
import type { AssignedMeal, ClientMealPlan, FitnessClient, MealLibraryItem, MealPlanDay, MealPlanTemplate } from "@/lib/types";

const themeIcon = {
  red: Flame,
  blue: TrendingUp,
  green: Leaf,
  orange: Zap,
};

const customMealTemplatesStorageKey = "alphaFitnessCustomMealTemplates";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createMealTemplateId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `custom-${slug || "meal"}-${Date.now()}`;
}

function getStoredMealTemplates() {
  if (typeof window === "undefined") return [];

  try {
    const rawTemplates = window.localStorage.getItem(customMealTemplatesStorageKey);
    if (!rawTemplates) return [];

    return JSON.parse(rawTemplates) as MealLibraryItem[];
  } catch {
    return [];
  }
}

function saveStoredMealTemplates(templates: MealLibraryItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(customMealTemplatesStorageKey, JSON.stringify(templates));
}

export function MealPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mealPlan, setMealPlan] = useState<ClientMealPlan | null>(null);
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [customTemplates, setCustomTemplates] = useState<MealLibraryItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealLibraryItem | null>(null);
  const [templateToRemove, setTemplateToRemove] = useState<MealLibraryItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const trainerAccess = user ? hasTrainerAccess(user.role) : false;
  const allMealPlans = useMemo(() => [...customTemplates, ...mealLibrary], [customTemplates]);

  const filteredPlans = useMemo(() => {
    return allMealPlans.filter((plan) => {
      const matchesSearch =
        !search.trim() ||
        [plan.name, plan.category, plan.items.join(" ")].some((value) => value.toLowerCase().includes(search.toLowerCase().trim()));
      const matchesCategory = !category || plan.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [allMealPlans, category, search]);

  const categories = useMemo(() => Array.from(new Set(allMealPlans.map((meal) => meal.category))).sort(), [allMealPlans]);

  useEffect(() => {
    setCustomTemplates(getStoredMealTemplates());
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPlanLoading(false);
      return;
    }

    if (trainerAccess) {
      fetchClients()
        .then(setClients)
        .catch((error) => setToast(error instanceof Error ? error.message : "Unable to load clients."));
      setPlanLoading(false);
      return;
    }

    setPlanLoading(true);
    setPlanError("");

    fetchClientMealPlan(user.id)
      .then(setMealPlan)
      .catch((error) => setPlanError(error instanceof Error ? error.message : "Unable to load assigned meal plan."))
      .finally(() => setPlanLoading(false));
  }, [authLoading, trainerAccess, user]);

  async function assignMealToClient(input: AssignMealInput) {
    const client = clients.find((item) => item.id === input.clientId);
    if (!client || !selectedPlan) return;

    try {
      const existingMealPlan = normalizeClientMealPlan((await fetchClientMealPlan(client.id).catch(() => client.mealPlan ?? null)) ?? undefined);
      const existingDays = normalizeMealPlanDays(existingMealPlan.days);
      const normalizedDay = input.day.trim() || "Monday";
      const createAssignedMeal = (dayId: string): AssignedMeal => ({
        id: `meal-${Date.now()}-${dayId}`,
        mealId: selectedPlan.id,
        name: selectedPlan.name,
        mealTime: input.mealTime,
        items: [...selectedPlan.items],
        notes: input.notes.trim(),
      });

      const nextDays: MealPlanDay[] = existingDays.map((day) =>
        normalizedDay === "Every day" || day.day.toLowerCase() === normalizedDay.toLowerCase()
          ? { ...day, meals: [...day.meals, createAssignedMeal(day.id)] }
          : day,
      );

      const nextMealPlan: ClientMealPlan = {
        ...existingMealPlan,
        focus: input.focus.trim() || "Custom nutrition plan",
        startDate: getTodayDate(),
        days: nextDays,
      };

      const savedMealPlan = await updateClientMealPlanViaApi(client.id, nextMealPlan);
      setClients((current) => current.map((item) => (item.id === client.id ? { ...item, mealPlan: savedMealPlan } : item)));
      setSelectedPlan(null);
      setToast(`${selectedPlan.name} assigned to ${client.name}.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to assign meal.");
    }
  }

  function createTemplate(input: CreateMealTemplateInput) {
    const nextTemplate: MealLibraryItem = {
      id: createMealTemplateId(input.name),
      name: input.name.trim(),
      category: input.category.trim(),
      items: input.items,
      notes: input.notes.trim() || "Custom meal template",
    };
    const nextTemplates = [nextTemplate, ...customTemplates];

    setCustomTemplates(nextTemplates);
    saveStoredMealTemplates(nextTemplates);
    setCreateModalOpen(false);
    setToast(`${nextTemplate.name} template created.`);
  }

  function removeTemplate() {
    if (!templateToRemove) return;

    const nextTemplates = customTemplates.filter((item) => item.id !== templateToRemove.id);

    setCustomTemplates(nextTemplates);
    saveStoredMealTemplates(nextTemplates);
    setToast(`${templateToRemove.name} removed.`);
    setTemplateToRemove(null);
  }

  if (!authLoading && user && !trainerAccess) {
    return (
      <DashboardShell>
        <PageHeader title="My Meal Plan" subtitle="Your assigned nutrition plan from your trainer" />

        <main className="main-content">
          {planLoading ? <div className="card empty-state">Loading assigned meal plan...</div> : null}
          {planError ? <div className="auth-error">{planError}</div> : null}
          {!planLoading && !planError && !mealPlan ? (
            <div className="card empty-state">
              <strong>No meal plan assigned yet</strong>
              <span className="text-muted">Your trainer has not assigned a meal plan to this account.</span>
            </div>
          ) : null}
          {mealPlan ? <ClientAssignedMealPlan mealPlan={mealPlan} /> : null}
        </main>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="Meal Library" subtitle={`${allMealPlans.length} meal options available for assignment`}>
        <button className="btn-primary toolbar-button" type="button" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} /> Create Template
        </button>
      </PageHeader>

      <main className="main-content">
        <section className="search-section">
          <div className="search-control">
            <Search size={20} style={{ color: "var(--text-muted)" }} />
            <input
              placeholder="Search templates (e.g. Keto, Bulking)..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="modern-select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </section>

        <section className="mealplan-grid">
          {filteredPlans.map((plan) => (
            <MealPlanCard
              key={plan.id}
              plan={plan}
              removable={customTemplates.some((template) => template.id === plan.id)}
              onAssign={setSelectedPlan}
              onRemove={setTemplateToRemove}
            />
          ))}
        </section>
      </main>

      <AssignMealModal
        plan={selectedPlan}
        clients={clients}
        onClose={() => setSelectedPlan(null)}
        onSubmit={assignMealToClient}
      />
      <CreateMealTemplateModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSubmit={createTemplate} />
      <DeleteMealTemplateModal template={templateToRemove} onClose={() => setTemplateToRemove(null)} onConfirm={removeTemplate} />
      <Toast message={toast} />
    </DashboardShell>
  );
}

function MealPlanCard({
  plan,
  removable,
  onAssign,
  onRemove,
}: {
  plan: MealLibraryItem;
  removable: boolean;
  onAssign: (plan: MealLibraryItem) => void;
  onRemove: (plan: MealLibraryItem) => void;
}) {
  const Icon = themeIcon[getTheme(plan.category)];

  return (
    <article className="card meal-plan-card">
      <div className={`meal-plan-hero theme-${getTheme(plan.category)}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="meal-category">{plan.category}</div>
          <Icon size={20} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700 }}>{plan.name}</h3>
      </div>
      <div style={{ padding: 24 }}>
        <div className="meal-recipe-lines library-preview-lines">
          {plan.items.slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
          {plan.items.length > 4 ? <span>+ {plan.items.length - 4} more lines</span> : null}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn-view-profile dark-button" type="button" onClick={() => onAssign(plan)}>
            Assign to Clients
          </button>
          {removable ? (
            <button className="icon-btn" type="button" onClick={() => onRemove(plan)} aria-label={`Remove ${plan.name}`}>
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DeleteMealTemplateModal({
  template,
  onClose,
  onConfirm,
}: {
  template: MealLibraryItem | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={`modal-overlay ${template ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="delete-meal-template-title">
        <div className="modal-header">
          <h2 id="delete-meal-template-title">Remove Meal Template</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close remove meal template modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-form">
          <div className="assignment-summary">
            Are you sure you want to remove <strong>{template?.name}</strong>?
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={onConfirm}>
              Remove Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type AssignMealInput = {
  clientId: string;
  day: string;
  mealTime: string;
  focus: string;
  notes: string;
};

type CreateMealTemplateInput = {
  name: string;
  category: string;
  items: string[];
  notes: string;
};

function CreateMealTemplateModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMealTemplateInput) => void;
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

    if (!name.trim()) {
      setFormError("Add a template name before saving.");
      return;
    }

    if (!category.trim()) {
      setFormError("Add a category before saving.");
      return;
    }

    if (!items.length) {
      setFormError("Add at least one meal item before saving.");
      return;
    }

    onSubmit({
      name,
      category,
      items,
      notes,
    });
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="create-meal-template-title">
        <div className="modal-header">
          <h2 id="create-meal-template-title">Create Meal Template</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close create meal template modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          {formError ? <div className="auth-error">{formError}</div> : null}

          <div className="form-group">
            <label htmlFor="mealTemplateName">Template Name</label>
            <input id="mealTemplateName" required value={name} onChange={(event) => setName(event.target.value)} placeholder="High protein lunch bowl" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mealTemplateCategory">Category</label>
              <input id="mealTemplateCategory" required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Breakfast, Lunch, Snack..." />
            </div>
            <div className="form-group">
              <label htmlFor="mealTemplateNotes">Notes</label>
              <input id="mealTemplateNotes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional template note" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="mealTemplateItems">Meal Items</label>
            <textarea
              id="mealTemplateItems"
              required
              rows={7}
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              placeholder={"150g chicken breast\n200g cooked rice\nMixed vegetables\nSauce or seasoning"}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignMealModal({
  plan,
  clients,
  onClose,
  onSubmit,
}: {
  plan: MealLibraryItem | null;
  clients: FitnessClient[];
  onClose: () => void;
  onSubmit: (input: AssignMealInput) => Promise<void>;
}) {
  const [clientId, setClientId] = useState("");
  const [day, setDay] = useState("Every day");
  const [mealTime, setMealTime] = useState("Breakfast");
  const [focus, setFocus] = useState("Custom nutrition plan");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan) return;

    setClientId(clients[0]?.id ?? "");
    setDay("Every day");
    setMealTime("Breakfast");
    setFocus("Custom nutrition plan");
    setNotes("");
    setSaving(false);
  }, [clients, plan]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) return;

    setSaving(true);
    try {
      await onSubmit({ clientId, day, mealTime, focus, notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`modal-overlay ${plan ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="assign-meal-title">
        <div className="modal-header">
          <h2 id="assign-meal-title">Assign Meal</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close assign meal modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          <div className="form-group">
            <label>Meal Template</label>
            <div className="assignment-summary">{plan?.name}</div>
          </div>

          <div className="form-group">
            <label htmlFor="assignMealClient">Client</label>
            <select id="assignMealClient" className="modern-select" required value={clientId} onChange={(event) => setClientId(event.target.value)}>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assignMealDay">Day</label>
              <select id="assignMealDay" className="modern-select" required value={day} onChange={(event) => setDay(event.target.value)}>
                <option value="Every day">Every day</option>
                {weekDays.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="assignMealTime">Meal Time</label>
              <select id="assignMealTime" className="modern-select" value={mealTime} onChange={(event) => setMealTime(event.target.value)}>
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
                <option>Pre-workout</option>
                <option>Post-workout</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="assignMealFocus">Nutrition Focus</label>
            <input id="assignMealFocus" required value={focus} onChange={(event) => setFocus(event.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="assignMealNotes">Notes</label>
            <textarea id="assignMealNotes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !clientId}>
              {saving ? "Assigning..." : "Assign Meal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getTheme(category: string): MealPlanTemplate["theme"] {
  if (category === "Breakfast") return "orange";
  if (category === "Smoothie") return "green";
  if (category === "Sandwich") return "blue";
  return "red";
}

function ClientAssignedMealPlan({ mealPlan }: { mealPlan: ClientMealPlan }) {
  const visibleMealPlan = normalizeClientMealPlan(mealPlan);

  return (
    <section className="client-exercise-plan">
      <div className="card client-plan-overview">
        <div>
          <span className="client-meta-label">Nutrition Focus</span>
          <h2>{visibleMealPlan.focus}</h2>
        </div>
        <div>
          <span className="client-meta-label">Start Date</span>
          <strong>{visibleMealPlan.startDate}</strong>
        </div>
      </div>

      {visibleMealPlan.days.length ? (
        <div className="client-workout-day-list">
          {visibleMealPlan.days.map((day) => (
            <article className="card client-workout-day-card" key={day.id}>
              <div className="client-workout-day-title">
                <div className="exercise-card-icon">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <span className="client-meta-label">{day.day}</span>
                  <h3>{day.meals.length} meals assigned</h3>
                </div>
              </div>

              {day.meals.length ? (
                <div className="client-assigned-exercises">
                  {day.meals.map((meal, index) => (
                    <div className="client-assigned-exercise" key={meal.id}>
                      <div className="exercise-order">{index + 1}</div>
                      <div>
                        <strong>{meal.mealTime}: {meal.name}</strong>
                        <div className="meal-recipe-lines client-meal-lines">
                          {meal.items.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                        {meal.notes ? <p>{meal.notes}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted">No meals added for this day yet.</span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <strong>No meal days added yet</strong>
          <span className="text-muted">Your trainer has started a plan but has not added day-by-day meals.</span>
        </div>
      )}

      {visibleMealPlan.trainerNotes ? (
        <div className="card client-trainer-notes">
          <span className="client-meta-label">Trainer Notes</span>
          <p>{visibleMealPlan.trainerNotes}</p>
        </div>
      ) : null}
    </section>
  );
}
