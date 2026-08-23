import { apiFetch } from "@/services/apiClient";

export interface CreateEmployeeInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // Requis (pas optionnel) : voir createProEmployeeSchema côté API pour le
  // pourquoi (public."User".phone est NOT NULL UNIQUE en base).
  phone: string;
}

/** Sous-ensemble de User renvoyé par l'API employés (voir EMPLOYEE_USER_SELECT côté apps/api) -- jamais le rôle ni l'avatar, pas nécessaires ici. */
export interface EmployeeAccountUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION";
  createdAt: string;
}

export interface ProEmployeeWithUser {
  id: string;
  proId: string;
  userId: string;
  createdAt: string;
  user: EmployeeAccountUser;
}

/** GET /api/pros/me/employees -- réservé au patron, voir requireAuth([UserRole.PRO]) côté API. */
export async function fetchMyEmployees(): Promise<ProEmployeeWithUser[]> {
  const data = await apiFetch<{ employees: ProEmployeeWithUser[] }>("/api/pros/me/employees");
  return data.employees;
}

/** POST /api/pros/me/employees -- crée un compte employé (role PRO_EMPLOYEE) au nom du patron. */
export async function createEmployee(input: CreateEmployeeInput): Promise<ProEmployeeWithUser> {
  const data = await apiFetch<{ employee: ProEmployeeWithUser }>("/api/pros/me/employees", {
    method: "POST",
    body: input,
  });
  return data.employee;
}

/** PATCH /api/pros/me/employees/[employeeId] -- active/désactive (réversible), voir setEmployeeStatus. */
export async function setEmployeeStatus(employeeId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ProEmployeeWithUser> {
  const data = await apiFetch<{ employee: ProEmployeeWithUser }>(`/api/pros/me/employees/${employeeId}`, {
    method: "PATCH",
    body: { status },
  });
  return data.employee;
}

/** DELETE /api/pros/me/employees/[employeeId] -- révocation définitive (compte Auth supprimé). */
export async function deleteEmployee(employeeId: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/api/pros/me/employees/${employeeId}`, { method: "DELETE" });
}
