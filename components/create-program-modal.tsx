"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { ProgramTemplate } from "@/lib/types";

type CreateProgramInput = Omit<ProgramTemplate, "id" | "workoutsPerWeek"> & {
  workoutsPerWeek: number;
};

type CreateProgramModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (program: ProgramTemplate) => void;
};

export function CreateProgramModal({ open, onClose, onSubmit }: CreateProgramModalProps) {
  const [form, setForm] = useState<CreateProgramInput>({
    name: "",
    durationWeeks: 8,
    intensity: "Beginner",
    workoutsPerWeek: 3,
    description: "",
  });

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      ...form,
      id: `${form.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    setForm({
      name: "",
      durationWeeks: 8,
      intensity: "Beginner",
      workoutsPerWeek: 3,
      description: "",
    });
    onClose();
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="create-program-title">
        <div className="modal-header">
          <h2 id="create-program-title">Create New Program</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close create program modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          <div className="form-group">
            <label htmlFor="progName">Program Name</label>
            <input
              id="progName"
              required
              placeholder="e.g. Summer Shred 2.0"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="progDuration">Duration (Weeks)</label>
              <input
                id="progDuration"
                type="number"
                min={1}
                required
                value={form.durationWeeks}
                onChange={(event) => setForm((current) => ({ ...current, durationWeeks: Number(event.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="progIntensity">Intensity Level</label>
              <select
                id="progIntensity"
                className="modern-select"
                value={form.intensity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, intensity: event.target.value as ProgramTemplate["intensity"] }))
                }
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="workoutsPerWeek">Workouts Per Week</label>
            <input
              id="workoutsPerWeek"
              type="number"
              min={1}
              max={7}
              value={form.workoutsPerWeek}
              onChange={(event) => setForm((current) => ({ ...current, workoutsPerWeek: Number(event.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="progDesc">Description</label>
            <textarea
              id="progDesc"
              placeholder="Brief overview of the program goals..."
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Program
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
