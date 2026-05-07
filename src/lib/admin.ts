import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-constants";

export { ADMIN_COOKIE };

export function isAdmin() {
  const c = cookies().get(ADMIN_COOKIE);
  return c?.value === "1";
}
