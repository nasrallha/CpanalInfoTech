"use server";
import { runAction } from "@/lib/action";
import { loginSchema, setupSchema } from "@/validations/schemas";
import { login, logout, setupOwner } from "@/services/auth.service";

export const loginAction = async (input) =>
  runAction(loginSchema, input, (data) => login(data), { public: true });

export const setupAction = async (input) =>
  runAction(setupSchema, input, (data) => setupOwner(data), { public: true });

export const logoutAction = async () =>
  runAction(null, null, () => logout(), { public: true });
