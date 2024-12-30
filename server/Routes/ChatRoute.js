import express from "express";
import Token from "../Middlewares/Token.js";
import {
  addChat,
  addFriendToChat,
  createGroup,
  fetchFriends,
  getChats,
  getChatsbetween2users,
  getChatsWithNoGroups,
} from "../Controllers/ChatsController.js";

const router = express.Router();

router.post("/sendMessage", Token, addChat);

router.get("/getChats", Token, getChats);

router.get("/getchatswithnogroups", Token, getChatsWithNoGroups);

router.post("/getChatsbetween2users", Token, getChatsbetween2users);

router.post("/addFriend", Token, addFriendToChat);

router.post("/getUsers/:params", Token, fetchFriends);

router.post("/createGroup", Token, createGroup);

export default router;
