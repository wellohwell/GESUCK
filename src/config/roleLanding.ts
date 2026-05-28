export const ROLE_LANDING: Record<string, string> = {
  sales: "/workspace/explore",
  supervisor: "/workspace/explore",
};

export function getDefaultRouteByRole(role?: string) {
  if (!role) return "/workspace";

  // Normalize to lowercase for exact matching
  const normalRole = role.toLowerCase();
  return ROLE_LANDING[normalRole] || "/workspace";
}
