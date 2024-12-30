import express from "express";
import {
  getUsers,
  loginUser,
  registerUser,
} from "../Controllers/UserController.js";
import Token from "../Middlewares/Token.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/getUsers/:searchTerm", Token, getUsers);

export default router;
