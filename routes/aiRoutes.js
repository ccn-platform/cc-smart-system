const express =
  require("express");

const router =
  express.Router();

const {
  protect,
  branchAccess
} = require(
  "../middleware/authMiddleware"
);

const {
  chatWithAI,
  getConversationHistory,
  clearConversation
} = require(
  "../controllers/aiChatController"
);


// CHAT
router.post(
  "/chat",
  protect,
  branchAccess,
  chatWithAI
);


// HISTORY
router.get(
  "/history",
  protect,
  branchAccess,
  getConversationHistory
);


// CLEAR MEMORY
router.delete(
  "/history",
  protect,
  branchAccess,
  clearConversation
);

module.exports =
  router;
