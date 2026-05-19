import { Router } from "express";
import { Product } from "../../modules/products/products.model.js";
import { supabase } from "../../config/supabase.js";

export const router = Router();

router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name, price, stock } = req.body || {};

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({
      success: false,
      error: "name, price and stock are required",
    });
  }

  try {
    const doc = await Product.create({ name, price, stock });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, stock } = req.body || {};

  const updatePayload = {};

  if (name !== undefined) updatePayload.name = name;
  if (price !== undefined) updatePayload.price = price;
  if (stock !== undefined) updatePayload.stock = stock;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one field is required to update",
    });
  }

  try {
    const doc = await Product.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await Product.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

const PG_SELECT = "id, name, price, stock, created_at, updated_at";

router.get("/pg", async (req, res) => {
  try {
    const { data, error } = await supabase.from("products").select(PG_SELECT);

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/pg", async (req, res) => {
  const { name, price, stock } = req.body || {};

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({
      success: false,
      error: "name, price and stock are required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .insert({ name, price, stock })
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
  const { name, price, stock } = req.body || {};

  const updatePayload = {};

  if (name !== undefined) updatePayload.name = name;
  if (price !== undefined) updatePayload.price = price;
  if (stock !== undefined) updatePayload.stock = stock;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one field is required to update",
    });
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select(PG_SELECT)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "Product not found" });
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
      .from("products")
      .delete()
      .eq("id", id)
      .select(PG_SELECT)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
