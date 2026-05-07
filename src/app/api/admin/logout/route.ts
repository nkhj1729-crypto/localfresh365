import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-constants";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
