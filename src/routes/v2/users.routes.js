import { Router } from "express";
import { User } from "../../modules/users/user.model.js";
import { supabase } from "../../config/supabase.js";

export const router = Router();

// MongoDB routes (/api/v2/users)
const userResponse = (doc) => {
  const user = doc.toObject();
  delete user.password;
  return user;
};

router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(400).json({ success: false, error: error });
  }
});

router.post("/", async (req, res) => {
  const { username, email, password, role } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: err });
  }

  try {
    const doc = await User.create({ username, email, password, role });
    console.log(doc);
    return res.status(201).json({ success: true, data: userResponse(doc) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err });
  }
});

// router.put("/:id", async (req, res) => {
//   const user = users.find((u) => u.id === req.params.id);

//   if (!user) {
//     return res.status(404).json({ error: "User not found!" });
//   }

//   const { username, email, password } = req.body;

//   if (!username || !email || !password) {
//     return res
//       .status(400)
//       .json({ error: "username, email and password are required!" });
//   }

//   user.username = username;
//   user.email = email;
//   user.password = password;

//   return res.status(200).json(user);
// });

// router.delete("/:id", async (req, res) => {
//   const userIndex = users.findIndex((u) => u.id === String(req.params.id));

//   if (userIndex === -1) {
//     return res.status(404).json({ error: "User not found" });
//   }

//   const deletedUser = users.splice(userIndex, 1)[0];

//   return res.status(200).json(deletedUser);
// });

//Supabase/PostgreSQL routes (/api/v2/users/pg)
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
