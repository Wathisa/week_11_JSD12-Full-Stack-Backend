import { User } from "./user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userResponse = (doc) => {
  const user = doc.toObject();
  delete user.password;
  return user;
};

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    const err = new Error("email and password are required");
    err.name = "ValidationError";
    err.status = 400;
    return next(err);
  }

  try {
    const userInDB = await User.findOne({ email }).select("+password");

    if (!userInDB) {
      const err = new Error("email or password is incorrect");
      err.name = "AuthenticationError";
      err.status = 400;
      return next(err);
    }

    const isMatch = await bcrypt.compare(password, userInDB.password);

    if (!isMatch) {
      const err = new Error("email or password is incorrect");
      err.name = "AuthenticationError";
      err.status = 400;
      return next(err);
    }

    const token = jwt.sign({ userId: userInDB._id }, process.env.JWT_SECRET, {
      expiresIn: "1h", // 1 hours expiration
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProd, // only send over HTTPS in production
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1hour
    });

    return res.status(200).json({
      success: true,
      message: "login successful",
      user: {
        _id: userInDB._id,
        username: userInDB.username,
        email: userInDB.email,
        role: userInDB.role,
      },
    });
  } catch (err) {
    return next(err);
  }
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

  // 1) validate
  if (!username || !email || !password) {
    const err = new Error("username, email, and password are required");
    err.name = "ValidationError";
    err.status = 400;
    return next(err);
  }

  try {
    // 2) check duplicate email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const err = new Error("email is already in use");
      err.name = "ValidationError";
      err.status = 400;
      return next(err);
    }

    // เดิมเรา hash ใน controller เอง
    // const hashedPassword = await bcrypt.hash(password, 12);

    // เดิมเรา create แบบส่ง hashedPassword เข้าไป
    // const doc = await User.create({
    //   username,
    //   email,
    //   password: hashedPassword,
    //   role,
    // });

    // เวอร์ชันสุดท้าย: ให้ model เป็นคน hash password ผ่าน pre("save")
    const newUser = new User({
      username,
      email,
      password,
      role,
    });

    const doc = await newUser.save();

    return res.status(201).json({ success: true, data: userResponse(doc) });
  } catch (err) {
    return next(err);
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
    return next(err);
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
    return next(err);
  }
};
