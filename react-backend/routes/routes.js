// instalite-backend/routes/routes.js
import { authenticateUser, createUser } from "../../users.js";
import {
  createChat,
  sendMessage,
  leaveChat,
  inviteToChat,
  acceptChatInvite,
  rejectChatInvite,
  rescindInvite,
  getChatHistory,
  getInvites,
  getUserChats,
} from "../../server/chat/chat.js";
import { callChatbot } from '../../chatbot/chatbot.js';
import { createRetrieverFromDatabase } from '../../installite-backend/utils/vector.js';

/* ---------- AUTH ---------- */
export async function handleLogin(req, res) {
  const result = await authenticateUser(req.body);
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
}

export async function handleRegister(req, res) {
  const createResult = await createUser(req.body);
  if (createResult.error)
    return res.status(400).json({ error: createResult.error });

  /* auto-login after successful sign-up */
  const loginResult = await authenticateUser({
    login: req.body.login,
    password: req.body.password,
  });
  if (loginResult.error)
    return res.status(500).json({ error: loginResult.error });
  res.json(loginResult);
}

/* ---------- CHATBOT SEARCH (stub) ---------- */
export async function handleSearch(req, res) {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "No question provided" });
  }

  try {
    // ✅ Lazy initialization of the retriever
    if (!retrieverInitialized) {
      console.log("🔄 Initializing chatbot retriever...");
      await createRetrieverFromDatabase();
      retrieverInitialized = true;
    }

    const answer = await callChatbot(question);
    res.json({ answer });
  } catch (err) {
    console.error("❌ Chatbot error in handleSearch:", err);
    res.status(500).json({ error: "Chatbot failed to process your question" });
  }
}

/* ---------- CHAT REST ---------- */
export async function handleGetUserChats(req, res) {
  const userId = Number(req.query.userId);
  res.json(await getUserChats(userId));
}

export async function handleCreateChat(req, res) {
  const { members } = req.body;
  res.json(await createChat(members));
}

export async function handleSendMessage(req, res) {
  const { chatId, userId, message } = req.body;
  res.json(await sendMessage(chatId, userId, message));
}

export async function handleLeaveChat(req, res) {
  const { chatId, userId } = req.body;
  res.json(await leaveChat(chatId, userId));
}

export async function handleInviteToChat(req, res) {
  const { chatId, inviterId, inviteeId } = req.body;
  res.json(await inviteToChat(chatId, inviterId, inviteeId));
}

export async function handleAcceptInvite(req, res) {
  const { chatId, userId } = req.body;
  res.json(await acceptChatInvite(chatId, userId));
}

export async function handleRejectInvite(req, res) {
  const { chatId, userId } = req.body;
  res.json(await rejectChatInvite(chatId, userId));
}

export async function handleRescindInvite(req, res) {
  const { chatId, inviterId, inviteeId } = req.body;
  res.json(await rescindInvite(chatId, inviterId, inviteeId));
}

export async function handleGetChatHistory(req, res) {
  res.json(await getChatHistory(req.query.chatId));
}

export async function handleGetInvites(req, res) {
  res.json(await getInvites(req.query.userId));
}