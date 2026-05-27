import { Router } from "express";
import { User } from "../../modules/users/user.model.js";
import { supabase } from "../../config/supabase.js";
import {
  embedText,
  generateText,
} from "../../services/gemini.client.js";
import { embedUserById } from "../../modules/users/user.embedding.js";
import {
  loginUser,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../modules/users/users.v2.controller.js";
import { authUser } from "../../middlewares/auth.js";

export const router = Router();

const buildUserSummary = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
});

const dotProduct = (firstVector, secondVector) =>
  firstVector.reduce((sum, value, index) => sum + value * secondVector[index], 0);

const magnitude = (vector) =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

const cosineSimilarity = (firstVector, secondVector) => {
  if (!Array.isArray(firstVector) || !Array.isArray(secondVector)) return -1;
  if (firstVector.length !== secondVector.length || firstVector.length === 0) {
    return -1;
  }

  const firstMagnitude = magnitude(firstVector);
  const secondMagnitude = magnitude(secondVector);

  if (!firstMagnitude || !secondMagnitude) return -1;

  return dotProduct(firstVector, secondVector) / (firstMagnitude * secondMagnitude);
};

const buildAskPrompt = ({ question, sources }) => {
  const sourceText = sources
    .map((user, index) => {
      return [
        `Source ${index + 1}:`,
        `Username: ${user.username}`,
        `Email: ${user.email}`,
        `Role: ${user.role}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are helping answer questions about users in a small system.",
    "Use only the user records provided below.",
    "If the answer cannot be determined from the records, say that clearly.",
    "",
    `Question: ${question}`,
    "",
    "User records:",
    sourceText || "No user records provided.",
    "",
    "Answer briefly and clearly.",
  ].join("\n");
};

// MongoDB route
router.post("/login", loginUser);
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

router.post("/ask", authUser, async (req, res, next) => {
  const { question, topK = 5 } = req.body || {};
  const trimmedQuestion = String(question || "").trim();
  const safeTopK = Math.min(Math.max(Number(topK) || 5, 1), 10);

  if (!trimmedQuestion) {
    return res.status(400).json({
      success: false,
      message: "question is required",
    });
  }

  try {
    const users = await User.find().select(
      "username email role embedding.status embedding.vector",
    );

    if (!users.length) {
      return res.status(200).json({
        success: true,
        data: {
          answer: "No users found in the database yet.",
          sources: [],
        },
      });
    }

    const usersNeedingEmbedding = users.filter((user) => {
      return (
        user?.embedding?.status !== "READY" ||
        !Array.isArray(user?.embedding?.vector) ||
        user.embedding.vector.length === 0
      );
    });

    for (const user of usersNeedingEmbedding) {
      await embedUserById(user._id);
    }

    const refreshedUsers = await User.find().select(
      "username email role embedding.status embedding.vector",
    );

    const questionVector = await embedText({ text: trimmedQuestion });

    const rankedUsers = refreshedUsers
      .filter((user) => {
        return (
          user?.embedding?.status === "READY" &&
          Array.isArray(user?.embedding?.vector) &&
          user.embedding.vector.length > 0
        );
      })
      .map((user) => ({
        user,
        score: cosineSimilarity(questionVector, user.embedding.vector),
      }))
      .filter((item) => item.score > 0)
      .sort((firstItem, secondItem) => secondItem.score - firstItem.score)
      .slice(0, safeTopK);

    const sources = rankedUsers.map((item) => buildUserSummary(item.user));

    if (!sources.length) {
      return res.status(200).json({
        success: true,
        data: {
          answer:
            "I could not find enough embedded user data to answer that yet.",
          sources: [],
        },
      });
    }

    const answer = await generateText({
      prompt: buildAskPrompt({
        question: trimmedQuestion,
        sources,
      }),
    });

    return res.status(200).json({
      success: true,
      data: {
        answer,
        sources,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// Check user session/token
router.get("/auth/me", authUser, async (req, res, next) => {
  try {
    const userId = req.user.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found!",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout a user
router.post("/auth/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully!",
  });
});

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
