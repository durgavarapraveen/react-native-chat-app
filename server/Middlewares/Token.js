import jwt from "jsonwebtoken";
import User from "../Modals/UserModal.js";
import dotenv from "dotenv";

dotenv.config();

const Token = async (req, res, next) => {
  let token;

  // Check if token is provided in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error(error);

      // Send 401 error if token is invalid or expired
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // If no token is found in the header
  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

export default Token;
