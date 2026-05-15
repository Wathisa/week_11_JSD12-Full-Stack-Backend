import { Router } from "express";
import { notes } from "../../fakeData/fakeNotes.js";

export const router = Router();

router.get("/", (req, res) => {
  res.json(notes);
});

router.post("/", (req, res) => {
  const { title, content, category } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required" });
  }

  //Simple incrememtal string id based on current mock data
  const nextId = String(
    (notes.reduce((max, n) => Math.max(max, Number(n.id)), 0) || 0) + 1,
  );

  const newNote = {
    id: nextId,
    title,
    content,
    category: category || "General",
  };

  notes.push(newNote);
  return res.status(201).json(newNote);
});

router.put("/:id", (req, res) => {
  const note = notes.find((n) => n.id === req.params.id);

  if (!note) {
    return res.status(404).json({ error: "Note not found!" });
  }

  const { title, content, category } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required!" });
  }

  note.title = title;
  note.content = content;
  note.category = category || "General";

  return res.status(200).json(note);
});

router.delete("/:id", (req, res) => {
  const noteIndex = notes.findIndex((n) => n.id === String(req.params.id));

  if (noteIndex === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  const deletedNote = notes.splice(noteIndex, 1)[0];

  return res.status(200).json(deletedNote);
});
