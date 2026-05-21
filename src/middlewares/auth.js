import jwt from "jsonwebtoken";

export const authUser = async (req, res, next) => {
  let token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token!",
    });
  }

  try {
    const decoededToken = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { user: { _id: decoededToken.userId } };
    next();
  } catch (error) {
    next(error);
  }
};
