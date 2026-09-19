const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const mapConversation = (conv, currentUserId) => ({
  _id: conv._id,
  type: conv.type,
  name: conv.name,
  description: conv.description,
  participants: conv.participants.map((p) => ({
    _id: p._id,
    name: p.name,
  })),
  lastMessage: conv.lastMessage
    ? {
        _id: conv.lastMessage._id,
        content: conv.lastMessage.content,
        senderId: conv.lastMessage.senderId?._id || conv.lastMessage.senderId,
        senderName: conv.lastMessage.senderId?.name || 'Unknown',
        createdAt: conv.lastMessage.createdAt,
      }
    : null,
  lastMessageAt: conv.lastMessageAt,
  unreadCount: 0,
  createdAt: conv.createdAt,
});

// @desc    List conversations for current user
// @route   GET /api/conversations
// @access  Private
const listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      deletedAt: null,
    })
      .populate('participants', 'name')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name' },
      })
      .sort({ lastMessageAt: -1, createdAt: -1 });

    const items = conversations.map((conv) => mapConversation(conv, req.user._id));

    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Search group conversations by name
// @route   GET /api/conversations/search?q=...
// @access  Private
const searchGroups = async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ items: [] });

    const groups = await Conversation.find({
      type: 'group',
      deletedAt: null,
      name: { $regex: q, $options: 'i' },
    })
      .populate('participants', 'name')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name' },
      })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(20);

    const items = groups.map((conv) => mapConversation(conv, req.user._id));
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get or create a DM conversation with another user
// @route   POST /api/conversations/dm
// @access  Private
const getOrCreateDm = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot create DM with yourself' });
    }

    const otherUser = await User.findById(userId).select('name');
    if (!otherUser) return res.status(404).json({ message: 'User not found' });

    // Check for existing DM
    const existing = await Conversation.findOne({
      type: 'dm',
      deletedAt: null,
      participants: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate('participants', 'name')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name' },
      });

    if (existing) {
      return res.json(mapConversation(existing, req.user._id));
    }

    const conversation = await Conversation.create({
      type: 'dm',
      participants: [req.user._id, userId],
      createdBy: req.user._id,
    });

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name');

    res.status(201).json(mapConversation(populated, req.user._id));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a group conversation
// @route   POST /api/conversations/group
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name, description, participantIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    if (!Array.isArray(participantIds) || participantIds.length < 1) {
      return res.status(400).json({ message: 'At least 1 other participant is required' });
    }

    // Deduplicate and add current user
    const allParticipantIds = [...new Set([req.user._id.toString(), ...participantIds])];

    const conversation = await Conversation.create({
      type: 'group',
      name: name.trim(),
      description: (description || '').trim(),
      participants: allParticipantIds,
      createdBy: req.user._id,
    });

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name');

    res.status(201).json(mapConversation(populated, req.user._id));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get messages for a conversation (paginated)
// @route   GET /api/conversations/:id/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
      deletedAt: null,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversationId: conversation._id,
      deletedAt: null,
    })
      .populate('senderId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      conversationId: conversation._id,
      deletedAt: null,
    });

    res.json({
      items: messages.reverse().map((msg) => ({
        _id: msg._id,
        conversationId: msg.conversationId,
        senderId: msg.senderId._id,
        senderName: msg.senderId.name,
        content: msg.content,
        readBy: msg.readBy,
        isMine: msg.senderId._id.toString() === req.user._id.toString(),
        createdAt: msg.createdAt,
      })),
      meta: { page, limit, total },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send a message (REST fallback)
// @route   POST /api/conversations/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
      deletedAt: null,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: content.trim(),
      readBy: [req.user._id],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const populated = await Message.findById(message._id).populate('senderId', 'name');

    res.status(201).json({
      _id: populated._id,
      conversationId: populated.conversationId,
      senderId: populated.senderId._id,
      senderName: populated.senderId.name,
      content: populated.content,
      readBy: populated.readBy,
      isMine: true,
      createdAt: populated.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark messages as read
// @route   POST /api/conversations/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
      deletedAt: null,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    await Message.updateMany(
      {
        conversationId: conversation._id,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    List all users (for starting DMs / adding to groups)
// @route   GET /api/conversations/users
// @access  Private
const listUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const filter = { _id: { $ne: req.user._id } };
    if (q.trim()) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const users = await User.find(filter).select('name email').limit(50);
    res.json({ items: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  listConversations,
  searchGroups,
  getOrCreateDm,
  createGroup,
  getMessages,
  sendMessage,
  markAsRead,
  listUsers,
};
