"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { packageOptions } from "@/lib/mock-data";
import type { NewClientInput, PackageId } from "@/lib/types";

type AddClientModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewClientInput) => void;
};

const emptyForm: NewClientInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  packageId: "rookie",
};

export function AddClientModal({ open, onClose, onSubmit }: AddClientModalProps) {
  const [form, setForm] = useState<NewClientInput>(emptyForm);

  function updateField<Key extends keyof NewClientInput>(key: Key, value: NewClientInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
    setForm(emptyForm);
    onClose();
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
        <div className="modal-header">
          <h2 id="add-client-title">Add New Client</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close add client modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                required
                placeholder="Enter first name"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                required
                placeholder="Enter last name"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="client@example.com"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="packageSelect">Package Selected</label>
            <select
              id="packageSelect"
              name="packageSelect"
              className="modern-select"
              required
              value={form.packageId}
              onChange={(event) => updateField("packageId", event.target.value as PackageId)}
            >
              {packageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
