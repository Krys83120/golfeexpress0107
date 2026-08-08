import React, { useEffect, useState } from "react";
import { Search, MoreVertical, X } from "lucide-react";
import { UserRole, type User } from "@golfeexpress/types";
import { ROLE_LABELS, STATUS_LABELS } from "@/services/userLabels";
import { fetchAdminUsers, updateAdminUser } from "@/services/adminEntitiesApi";

type RoleFilter = "ALL" | UserRole;

interface EditForm {
  firstName: string;
  lastName: string;
  phone: string;
  role: User["role"];
  status: User["status"];
}

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Debounce la recherche pour éviter un appel API à chaque frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setStatus("loading");
    fetchAdminUsers({
      role: roleFilter === "ALL" ? undefined : roleFilter,
      search: debouncedSearch || undefined,
    })
      .then((data) => {
        setUsers(data);
        setStatus("loaded");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
        setStatus("error");
      });
  }, [roleFilter, debouncedSearch]);

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    setSaveError(null);
  }

  function closeEditModal() {
    if (saving) return;
    setEditingUser(null);
    setEditForm(null);
    setSaveError(null);
  }

  async function saveUser() {
    if (!editingUser || !editForm) return;

    setSaving(true);
    setSaveError(null);

    try {
      const updatedUser = await updateAdminUser(editingUser.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        status: editForm.status,
      });

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      closeEditModal();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Impossible de modifier cet utilisateur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Utilisateurs</h1>
          <p className="text-sm text-gris">{users.length} comptes sur la plateforme</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-sm border border-gris-light bg-white px-3 py-2">
          <Search size={16} className="text-gris" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="flex-1 text-sm outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="rounded-sm border border-gris-light bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">Tous les rôles</option>
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role].label}
            </option>
          ))}
        </select>
      </div>

      {status === "error" && <div className="mb-4 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {status === "loading" && users.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Chargement des utilisateurs...</p>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Aucun utilisateur trouvé.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                <th className="py-2 pr-4 font-medium">Utilisateur</th>
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">Rôle</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
                <th className="py-2 pr-4 font-medium">Inscrit le</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roleMeta = ROLE_LABELS[user.role];
                const statusMeta = STATUS_LABELS[user.status];
                return (
                  <tr key={user.id} className="border-b border-gris-light last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gris-light text-sm font-bold text-nuit">
                          {user.firstName?.[0] ?? "?"}
                          {user.lastName?.[0] ?? ""}
                        </div>
                        <span className="text-sm font-semibold text-nuit">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gris">
                      <p>{user.email}</p>
                      <p className="text-xs">{user.phone}</p>
                    </td>
                    <td className="py-3 pr-4 text-sm text-nuit">
                      {roleMeta.emoji} {roleMeta.label}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gris">
                      {new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light hover:text-nuit"
                        title="Modifier l'utilisateur"
                      >
                        <MoreVertical size={16} />
                        Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingUser && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-heading text-xl font-extrabold text-nuit">Modifier l'utilisateur</h2>
                <p className="text-sm text-gris">{editingUser.email}</p>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-sm p-1.5 text-gris hover:bg-gris-light">
                <X size={18} />
              </button>
            </div>

            {saveError && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{saveError}</div>}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-nuit">Prénom</span>
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full rounded-sm border border-gris-light px-3 py-2 outline-none focus:border-nuit"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-nuit">Nom</span>
                <input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full rounded-sm border border-gris-light px-3 py-2 outline-none focus:border-nuit"
                />
              </label>

              <label className="col-span-2 text-sm">
                <span className="mb-1 block font-medium text-nuit">Téléphone</span>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-sm border border-gris-light px-3 py-2 outline-none focus:border-nuit"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-nuit">Rôle</span>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as User["role"] })}
                  className="w-full rounded-sm border border-gris-light bg-white px-3 py-2 outline-none focus:border-nuit"
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-nuit">Statut</span>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as User["status"] })}
                  className="w-full rounded-sm border border-gris-light bg-white px-3 py-2 outline-none focus:border-nuit"
                >
                  {(Object.keys(STATUS_LABELS) as User["status"][]).map((userStatus) => (
                    <option key={userStatus} value={userStatus}>
                      {STATUS_LABELS[userStatus].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris hover:bg-gris-light disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveUser}
                disabled={saving}
                className="rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
