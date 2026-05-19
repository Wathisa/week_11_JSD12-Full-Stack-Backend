import { User } from "./user.model.js";

const userResponse = (doc) => {
  const user = doc.toObject();
  delete user.password;
  return user;
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  const { username, email, password, role } = req.body || {};

  if (username || lemail || !password) {
    const err = new Error("username, email, and password are required");
    err.name = "ValidationError";
    err.status = 400;
    // return res.status(400).json({ success: false, error: err });
    next(err);
  }

  try {
    const doc = await User.create({ username, email, password, role });
    return res.status(201).json({ success: true, data: userResponse(doc) });
  } catch (err) {
    // return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
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
    const doc = await User.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({ success: true, data: userResponse(doc) });
  } catch (err) {
    // return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const doc = await User.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({ success: true, data: userResponse(doc) });
  } catch (err) {
    // return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
};
