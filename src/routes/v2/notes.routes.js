import { Router } from "express";
import { Note } from "../../modules/notes/notes.model.js";
import { supabase } from "../../config/supabase.js";

export const router = Router();

router.get("/", async (req, res) => {
  try {
    const notes = await Note.find();
    return res.status(200).json({ success: true, data: notes });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { title, content, category } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: "title and content are required",
    });
  }

  try {
    const doc = await Note.create({
      title,
      content,
      category: category || "General",
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, category } = req.body || {};

  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title;
  if (content !== undefined) updatePayload.content = content;
  if (category !== undefined) updatePayload.category = category;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one field is required to update",
    });
  }

  try {
    const doc = await Note.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await Note.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

const PG_SELECT = "id, title, content, category, created_at, updated_at";

router.get("/pg", async (req, res) => {
  try {
    const { data, error } = await supabase.from("notes").select(PG_SELECT);

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/pg", async (req, res) => {
  const { title, content, category } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: "title and content are required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("notes")
      .insert({ title, content, category: category || "General" })
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
  const { title, content, category } = req.body || {};

  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title;
  if (content !== undefined) updatePayload.content = content;
  if (category !== undefined) updatePayload.category = category;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one field is required to update",
    });
  }

  try {
    const { data, error } = await supabase
      .from("notes")
      .update(updatePayload)
      .eq("id", id)
      .select(PG_SELECT)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "Note not found" });
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
      .from("notes")
      .delete()
      .eq("id", id)
      .select(PG_SELECT)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
