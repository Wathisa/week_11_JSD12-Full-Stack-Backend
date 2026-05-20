import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
  },
  { timestamps: true },
);

//ไม่ว่าจะสร้าง user จากตรงไหนก็ตาม ถ้ามีการ save password ลง MongoDB
// ให้ model เป็นคนจัดการ hash ให้เองอัตโนมัติก่อนบันทึก
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

export const User = mongoose.model("User", userSchema);
