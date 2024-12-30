import express from "express";
import connectDB from "./Config/db.js";
import UserRoutes from "./Routes/UserRoutes.js";
import cors from "cors";
import ChatRoutes from "./Routes/ChatRoute.js";
import { Server } from "socket.io";

const app = express();

connectDB();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/users", UserRoutes);

app.use("/api/chat", ChatRoutes);

const server = app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:5000");
});

server.on("error", (err) => {
  console.error(err);
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log("connected to socket.io");

  // Initialize chatID on the socket object
  socket.chatID = null;

  socket.on("setup", (userData) => {
    console.log("setup", userData);
    socket.join(userData.token);
    socket.emit("connection", userData.token);
  });

  socket.on("join room", (room) => {
    // Store chatID on socket object
    socket.chatID = room;
    socket.join(room);
    console.log("joined room", room);
  });

  socket.on("new message", (newMessageRecieved) => {
    console.log("new message", newMessageRecieved);

    if (!newMessageRecieved.users) {
      return console.log("Chat.users not defined");
    }

    newMessageRecieved.users.forEach((user) => {
      console.log("new message", user, newMessageRecieved.sentMessage.sender);
      if (user == newMessageRecieved.sentMessage.sender) return;

      // Emit the message to the correct room (chatID stored on socket)
      console.log("emitting message.......", socket.chatID);
      if (socket.chatID) {
        socket
          .to(socket.chatID)
          .emit("message recieved", newMessageRecieved.sentMessage);
      } else {
        console.log("chatID is not defined for this socket");
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from socket.io");
    if (socket.chatID) {
      socket.leave(socket.chatID);
    }
  });
});

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  io.close(() => {
    console.log("WebSocket server closed.");
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });
});
