import { Router } from "express";
import { products } from "../../fakeData/fakeProducts.js";

export const router = Router();

router.get("/", (req, res) => {
  res.json(products);
});

router.post("/", (req, res) => {
  const { name, price, stock } = req.body || {};

  if (!name || !price || !stock) {
    return res.status(400).json({ error: "name, price and stock are required" });
  }

  //Simple incrememtal string id based on current mock data
  const nextId = String(
    (products.reduce((max, p) => Math.max(max, Number(p.id)), 0) || 0) + 1,
  );

  const newProduct = { id: nextId, name, price, stock };

  products.push(newProduct);
  return res.status(201).json(newProduct);
});

router.put("/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found!" });
  }

  const { name, price, stock } = req.body;

  if (!name || !price || !stock) {
    return res.status(400).json({ error: "name, price and stock are required!" });
  }

  product.name = name;
  product.price = price;
  product.stock = stock;

  return res.status(200).json(product);
});

router.delete("/:id", (req, res) => {
  const productIndex = products.findIndex((p) => p.id === String(req.params.id));

  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const deletedProduct = products.splice(productIndex, 1)[0];

  return res.status(200).json(deletedProduct);
});
