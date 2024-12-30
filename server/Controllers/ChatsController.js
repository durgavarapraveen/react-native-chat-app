import Chat from "../Modals/ChatsModal.js";

// check if chatID exists else create a new chat
export const addChat = async (req, res) => {
  try {
    const { chatID, message, recieverId } = req.body;
    const senderId = req.user._id;

    if (!message || !recieverId) {
      return res
        .status(400)
        .json({ message: "Message and receiver ID are required." });
    }

    // Step 1: If no chatID, check if a chat already exists between the sender and receiver
    let chat = null;
    let chatIdToUse = chatID;

    if (!chatIdToUse) {
      chat = await Chat.findOne({
        users: { $all: [senderId, recieverId] },
      }).select("_id");

      if (chat) {
        // If a chat exists, use its ID
        chatIdToUse = chat._id.toString();
      }
    }

    // Step 2: If no chat exists, create a new chat
    if (!chatIdToUse) {
      const newChat = new Chat({
        chatName: "Chat", // Default chat name
        users: [senderId, recieverId],
        isGroupChat: false,
        groupAdmin: senderId,
        messages: [{ message, sender: senderId, readBy: [senderId] }],
        latestMessage: { message, sender: senderId }, // Add the latest message
      });

      await newChat.save();
      return res.status(200).json({
        message: "Chat created and message sent.",
        chatID: newChat._id,
      });
    }

    // Step 3: If chat exists, add the new message to the existing chat
    chat = await Chat.findById(chatIdToUse);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    chat.messages.push({
      message,
      sender: senderId,
      readBy: [senderId],
    });

    chat.latestMessage = { message, sender: senderId };

    // all users in chat
    const usersInChat = chat.users.map((user) => user.toString());

    await chat.save();
    return res.status(200).json({
      message: "Message added to existing chat.",
      data: {
        sentMessage: chat.messages[chat.messages.length - 1],
        users: usersInChat,
      },
    });
  } catch (error) {
    console.error("Error in addChat:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// get all chats of user
export const getChats = async (req, res) => {
  try {
    let userId = req.user._id;
    userId = userId.toString();
    const chats = await Chat.find({ users: userId })
      .populate("users", "name email")
      .populate("latestMessage", "message sender")
      .sort({ updatedAt: -1 });

    // remove messages array, createdAt, groupAdmin, isGroupChat, __v from chats
    chats.forEach((chat) => {
      chat.messages = undefined;
      chat.createdAt = undefined;
      chat.groupAdmin = undefined;
      chat.__v = undefined;
    });

    //latest message of chat
    chats.forEach((chat) => {
      if (chat.latestMessage) {
        chat.latestMessage = chat.latestMessage.message;
      } else {
        chat.latestMessage = "";
      }
    });

    // get user name of other user in chat
    chats.forEach((chat) => {
      if (chat.users.length > 1) {
        chat.users.forEach((user) => {
          if (user._id.toString() !== userId) {
            chat.chatName = user.name;
          }
        });
      }
    });

    return res.status(200).json(chats);
  } catch (error) {
    console.error("Error in getChats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatsWithNoGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({
      users: userId,
      isGroupChat: false,
    })
      .populate("users", "name email")
      .populate("latestMessage", "message sender")
      .sort({ updatedAt: -1 });

    // remove messages array, createdAt, groupAdmin, isGroupChat, __v from chats
    chats.forEach((chat) => {
      chat.messages = undefined;
      chat.createdAt = undefined;
      chat.groupAdmin = undefined;
      chat.isGroupChat = undefined;
      chat.__v = undefined;
    });

    // get user name of other user in chat
    chats.forEach((chat) => {
      if (chat.users.length > 1) {
        chat.users.forEach((user) => {
          if (user._id.toString() !== userId) {
            chat.chatName = user.name;
          }
        });
      }
    });

    return res.status(200).json(chats);
  } catch (error) {
    console.error("Error in getChats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// get messages of chat
export const getChatsbetween2users = async (req, res) => {
  try {
    const { chatID } = req.body;

    if (!chatID) {
      return res.status(400).json({ message: "Chat ID is required." });
    }

    const chat = await Chat.findById(chatID).populate("users", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // get messages of chat
    let messages = chat.messages;

    // get only lastest 100 messages
    messages = messages.slice(-100);

    // get user name of other user in chat
    messages.forEach((message) => {
      message.sender = message.sender.toString();
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// add friends to chat
export const addFriendToChat = async (req, res) => {
  try {
    const { friendID } = req.body;
    const userId = req.user._id;

    if (!friendID) {
      return res.status(400).json({ message: "Friend ID is required." });
    }

    const chat = await Chat.findOne({
      users: { $all: [userId, friendID] },
    });

    if (chat) {
      return res.status(202).json({ message: "Chat already exists." });
    }

    const newChat = new Chat({
      chatName: "Chat",
      users: [userId, friendID],
      isGroupChat: false,
      groupAdmin: userId,
    });

    await newChat.save();

    return res
      .status(200)
      .json({ message: "Friend added to chat.", chatID: newChat._id });
  } catch (error) {
    console.error("Error in addFriendToChat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// add friends to chat
export const fetchFriends = async (req, res) => {
  try {
    const { params } = req.params;
    const userId = req.user._id;

    if (!params) {
      return res.status(400).json({ message: "Search parameter is required." });
    }

    const friends = await User.find({
      $or: [
        { name: { $regex: params, $options: "i" } },
        { email: { $regex: params, $options: "i" } },
      ],
      _id: { $ne: userId },
    }).select("name email");

    return res.status(200).json(friends);
  } catch (error) {
    console.error("Error in addFriendToChat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//create group
export const createGroup = async (req, res) => {
  try {
    const { participants, groupName } = req.body;

    const userId = req.user._id;

    if (!participants || !groupName) {
      return res
        .status(400)
        .json({ message: "Participants and group name are required." });
    }

    // add the user to the participants array
    participants.push(userId);

    const newChat = new Chat({
      chatName: groupName,
      users: participants,
      isGroupChat: true,
      groupAdmin: userId,
    });

    await newChat.save();

    return res
      .status(200)
      .json({ message: "Group created.", chatID: newChat._id });
  } catch (error) {
    console.error("Error in createGroup:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
