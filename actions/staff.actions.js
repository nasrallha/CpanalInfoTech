"use server";
import { runAction } from "@/lib/action";
import {
  createRoleSchema,
  createStaffSchema,
  idSchema,
  updateRoleSchema,
  updateStaffSchema,
} from "@/validations/schemas";
import {
  createStaff,
  deleteStaff,
  updateStaff,
} from "@/services/staff.service";
import { createRole, deleteRole, updateRole } from "@/services/role.service";

const opts = { permission: "staff.manage", refresh: true };

export const createStaffAction = async (input) =>
  runAction(createStaffSchema, input, (d, u) => createStaff(d, u), opts);
export const updateStaffAction = async (input) =>
  runAction(updateStaffSchema, input, (d, u) => updateStaff(d, u), opts);
export const deleteStaffAction = async (input) =>
  runAction(idSchema, input, (d, u) => deleteStaff(d.id, u), opts);

export const createRoleAction = async (input) =>
  runAction(createRoleSchema, input, (d, u) => createRole(d, u), opts);
export const updateRoleAction = async (input) =>
  runAction(updateRoleSchema, input, (d, u) => updateRole(d, u), opts);
export const deleteRoleAction = async (input) =>
  runAction(idSchema, input, (d, u) => deleteRole(d.id, u), opts);
