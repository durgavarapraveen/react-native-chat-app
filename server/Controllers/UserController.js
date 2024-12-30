import dotenv from "dotenv";
import UserModal from "../Modals/UserModal.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

// Generate JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const userExists = await UserModal.findOne({ name });
    if (userExists)
      return res.status(400).json({ message: "Username already exists" });

    const emailExists = await UserModal.findOne({ email });
    if (emailExists)
      return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await UserModal.create({
      name,
      email,
      password: hashedPassword,
    });
    if (!user) return res.status(400).json({ message: "Invalid user data" });

    const token = generateToken(user._id);
    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ message: "Server Error" });
  }
};

// Login user
export const loginUser = async (req, res) => {
  console.log("Login user");

  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const user = name.includes("@")
      ? await UserModal.findOne({ email: name })
      : await UserModal.findOne({ name });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid Password" });

    const token = generateToken(user._id);
    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const name = req.params.searchTerm;
    const currentUserName = req.user.name;

    const users = await UserModal.find({
      name: { $ne: currentUserName },
      $or: [
        { name: { $regex: name, $options: "i" } },
        { email: { $regex: name, $options: "i" } },
      ],
    }).select("name email");

    if (!users) return res.status(400).json({ message: "No users found" });

    // remove the current user from the list
    const filteredUsers = users.filter((user) => user.name !== currentUserName);

    // top 10 users
    const topUsers = filteredUsers.slice(0, 10);

    return res.status(200).json(topUsers);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ message: "Server Error" });
  }
};
