import React, { useEffect, useState } from "react";
import { Search, MoreVertical } from "lucide-react";
import { UserRole, type User } from "@golfeexpress/types";
import { ROLE_LABELS, STATUS_LABELS } from "@/services/userLabels";
import { fetchAdminUsers } from "@/services/adminEntitiesApi";

type RoleFilter = "ALL" | UserRole;

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

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
                          {user.firstName[0]}
                          {user.lastName[0]}
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
                      <button className="rounded-sm p-1.5 text-gris hover:bg-gris-light">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
