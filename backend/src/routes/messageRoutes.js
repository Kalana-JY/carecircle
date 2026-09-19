const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listConversations,
  searchGroups,
  getOrCreateDm,
  createGroup,
  getMessages,
  sendMessage,
  markAsRead,
  listUsers,
} = require('../controllers/messageController');

router.use(protect);

router.get('/users', listUsers);
router.get('/search', searchGroups);
router.get('/', listConversations);
router.post('/dm', getOrCreateDm);
router.post('/group', createGroup);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markAsRead);

module.exports = router;
