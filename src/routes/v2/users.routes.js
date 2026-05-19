import { Router } from "express";
import { User } from "../../modules/users/user.model.js";
import { supabase } from "../../config/supabase.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../modules/users/users.v2.controller.js";

export const router = Router();

// MongoDB route

router.get("/", getUsers);

router.post("/", createUser);

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

// Supabase/PostgreSQL routes (/api/v2/users/pg)
// Password is included from SELECT

const PG_SELECT = "id, username, email, role, created_at, updated_at ";

router.get("/pg", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select(PG_SELECT);

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/pg", async (req, res) => {
  const { username, email, password, role } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: "username, email and password are required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .insert({ username, email, password, role: role || "user" })
      .select(PG_SELECT)
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.put("/pg/:id", async (req, res) => {
  const { id } = req.params;
  const { username, email, password, role } = req.body || {};

  const updatePayload = {};

  if (username !== undefined) updatePayload.username = username;
  if (email !== undefined) updatePayload.email = email;
  if (password !== undefined) updatePayload.password = password;
  if (role !== undefined) updatePayload.role = role;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one field is required to update",
    });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", id)
      .select(PG_SELECT)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.delete("/pg/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .select(PG_SELECT)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
