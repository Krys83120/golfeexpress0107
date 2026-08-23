import React, { useEffect, useState } from "react";
import { UserPlus, Power, Trash2, X } from "lucide-react";
import {
  fetchMyEmployees,
  createEmployee,
  setEmployeeStatus,
  deleteEmployee,
  type ProEmployeeWithUser,
  type CreateEmployeeInput,
} from "@/services/employeesApi";
import { ApiRequestError } from "@/services/apiClient";

const EMPTY_FORM: CreateEmployeeInput = { email: "", password: "", firstName: "", lastName: "", phone: "" };

/**
 * Gestion des comptes employés (page réservée au patron -- un compte
 * PRO_EMPLOYEE n'a jamais accès à cette page, voir EMPLOYEE_ALLOWED_PAGES
 * dans App.tsx et EMPLOYEE_NAV_KEYS dans Sidebar.tsx). Un employé a son
 * propre login mais un accès volontairement restreint : Commandes +
 * Notifications uniquement (traitement des commandes, impression des
 * tickets) -- jamais Finances/Abonnement/Avis/Réglages/Dashboard.
 */
export function EmployeesPage() {
  const [employees, setEmployees] = useState<ProEmployeeWithUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateEmployeeInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setEmployees(await fetchMyEmployees());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : "Impossible de charger l'équipe.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createEmployee({
        ...form,
        phone: form.phone.trim(),
      });
      setEmployees((prev) => (prev ? [created, ...prev] : [created]));
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "La création du compte a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(employee: ProEmployeeWithUser) {
    setBusyId(employee.id);
    try {
      const nextStatus = employee.user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const updated = await setEmployeeStatus(employee.id, nextStatus);
      setEmployees((prev) => prev?.map((e) => (e.id === employee.id ? updated : e)) ?? null);
    } catch {
      setLoadError("Impossible de modifier ce compte pour le moment.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(employee: ProEmployeeWithUser) {
    if (!window.confirm(`Révoquer définitivement l'accès de ${employee.user.firstName} ${employee.user.lastName} ?`)) {
      return;
    }
    setBusyId(employee.id);
    try {
      await deleteEmployee(employee.id);
      setEmployees((prev) => prev?.filter((e) => e.id !== employee.id) ?? null);
    } catch {
      setLoadError("Impossible de supprimer ce compte pour le moment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Équipe</h1>
          <p className="mt-1 text-sm text-gris">
            Créez des comptes employés pour la gestion des commandes. Un employé peut traiter les commandes, recevoir
            les notifications et imprimer les tickets — jamais accéder aux Finances, à l'Abonnement, aux Avis ou aux
            Réglages.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex shrink-0 items-center gap-2 self-start rounded-sm bg-corail px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          {showForm ? "Annuler" : "Nouvel employé"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-sm border border-gris-light bg-white p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Prénom</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Nom</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Email de connexion</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Mot de passe initial</label>
              <input
                required
                type="text"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Au moins 8 caractères"
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Téléphone</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
            </div>
          </div>

          {formError && <p className="mt-3 text-sm font-medium text-[#E74C3C]">{formError}</p>}

          <p className="mt-4 text-xs text-gris">
            Communiquez cet email et ce mot de passe à votre employé — il pourra ensuite se connecter directement sur
            cette même app Pro et changer son mot de passe s'il le souhaite.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-sm bg-corail px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Création..." : "Créer le compte employé"}
          </button>
        </form>
      )}

      {loadError && <p className="mb-4 text-sm font-medium text-[#E74C3C]">{loadError}</p>}

      {employees === null ? (
        <p className="text-sm text-gris">Chargement...</p>
      ) : employees.length === 0 ? (
        <div className="rounded-sm border border-dashed border-gris-light p-8 text-center text-sm text-gris">
          Aucun compte employé pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-gris-light bg-white">
          {employees.map((employee, idx) => {
            const isActive = employee.user.status === "ACTIVE";
            return (
              <div
                key={employee.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
                style={{ borderTop: idx === 0 ? "none" : "1px solid #F0F0F0" }}
              >
                <div className="min-w-0 max-w-full">
                  <p className="truncate text-sm font-semibold text-nuit">
                    {employee.user.firstName} {employee.user.lastName}
                  </p>
                  <p className="truncate text-xs text-gris">{employee.user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: isActive ? "rgba(46,204,113,0.1)" : "rgba(255,107,53,0.1)",
                      color: isActive ? "#2ECC71" : "#FF6B35",
                    }}
                  >
                    {isActive ? "Actif" : "Suspendu"}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(employee)}
                    disabled={busyId === employee.id}
                    title={isActive ? "Suspendre l'accès" : "Réactiver l'accès"}
                    className="rounded-sm p-2 text-gris transition-colors hover:bg-gris-light disabled:opacity-50"
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    disabled={busyId === employee.id}
                    title="Révoquer définitivement"
                    className="rounded-sm p-2 text-gris transition-colors hover:bg-gris-light disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
