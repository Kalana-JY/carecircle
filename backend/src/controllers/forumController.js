const ForumPost = require('../models/ForumPost');
const Comment = require('../models/Comment');

const CATEGORIES = [
  'General Discussion',
  'Anxiety & Stress Support',
  'Mood & Depression',
  'Relationships & Family',
  'Grief & Loss',
  'Self-Care & Daily Wellness',
  'Wins & Encouragement',
  'Academic & Work Life',
];

const mapComment = (comment, currentUserId = null) => ({
  _id: comment._id,
  postId: comment.postId,
  content: comment.content,
  isAnonymous: comment.isAnonymous,
  status: comment.status,
  authorName: comment.isAnonymous ? null : comment.userId?.name || 'Unknown',
  isMine: currentUserId ? comment.userId?._id?.toString() === currentUserId.toString() : false,
  createdAt: comment.createdAt,
});

const mapPost = (post, currentUserId = null) => ({
  _id: post._id,
  category: post.category,
  title: post.title,
  content: post.content,
  isAnonymous: post.isAnonymous,
  authorName: post.isAnonymous ? null : post.userId?.name || 'Unknown',
  isMine: currentUserId ? post.userId?._id?.toString() === currentUserId.toString() : false,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

// @desc    Create a forum post
// @route   POST /api/forum
// @access  Private
const createPost = async (req, res) => {
  try {
    const { category, title, content, isAnonymous } = req.body;

    if (!category || !title || !content) {
      return res.status(400).json({ message: 'category, title and content are required' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const post = await ForumPost.create({
      userId: req.user._id,
      category,
      title: title.trim(),
      content: content.trim(),
      isAnonymous: isAnonymous === true,
    });

    const populated = await ForumPost.findById(post._id).populate('userId', 'name');
    res.status(201).json({ ...mapPost(populated, req.user._id), commentCount: 0, comments: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    List approved forum posts with pagination and category filter
// @route   GET /api/forum
// @access  Private
const listPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { deletedAt: null };
    if (req.query.category) filter.category = req.query.category;

    const [posts, total] = await Promise.all([
      ForumPost.find(filter)
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ForumPost.countDocuments(filter),
    ]);

    const ids = posts.map((post) => post._id);
    const counts = await Comment.aggregate([
      { $match: { postId: { $in: ids }, deletedAt: null, status: { $in: ['approved', 'reported'] } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

    const items = posts.map((post) => ({
      ...mapPost(post, req.user._id),
      commentCount: countMap.get(String(post._id)) || 0,
    }));

    res.json({ items, meta: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single forum post with its comments
// @route   GET /api/forum/:id
// @access  Private
const getPost = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null }).populate('userId', 'name');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = await Comment.find({
      postId: post._id,
      deletedAt: null,
      status: { $in: ['approved', 'reported'] },
    })
      .populate('userId', 'name')
      .sort({ createdAt: 1 });

    res.json({
      ...mapPost(post, req.user._id),
      commentCount: comments.length,
      comments: comments.map((comment) => mapComment(comment, req.user._id)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a comment to a forum post
// @route   POST /api/forum/:id/comments
// @access  Private
const createComment = async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      postId: post._id,
      userId: req.user._id,
      content: content.trim(),
      isAnonymous: isAnonymous === true,
    });

    const populated = await Comment.findById(comment._id).populate('userId', 'name');
    res.status(201).json(mapComment(populated, req.user._id));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Report a comment (status changes approved -> reported)
// @route   POST /api/forum/:id/comments/:commentId/report
// @access  Private
const reportComment = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.findOne({
      _id: req.params.commentId,
      postId: post._id,
      deletedAt: null,
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.status === 'reported') {
      return res.status(400).json({ message: 'Comment is already reported' });
    }

    comment.status = 'reported';
    await comment.save();

    const populated = await Comment.findById(comment._id).populate('userId', 'name');
    res.json(mapComment(populated, req.user._id));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a forum post (author only)
// @route   PUT /api/forum/:id
// @access  Private
const updatePost = async (req, res) => {
  try {
    const { category, title, content, isAnonymous } = req.body;

    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      post.category = category;
    }
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Title is required' });
      post.title = title.trim();
    }
    if (content !== undefined) {
      if (!content.trim()) return res.status(400).json({ message: 'Content is required' });
      post.content = content.trim();
    }
    if (isAnonymous !== undefined) post.isAnonymous = isAnonymous === true;

    await post.save();

    const populated = await ForumPost.findById(post._id).populate('userId', 'name');
    const comments = await Comment.find({
      postId: post._id,
      deletedAt: null,
      status: { $in: ['approved', 'reported'] },
    })
      .populate('userId', 'name')
      .sort({ createdAt: 1 });

    res.json({
      ...mapPost(populated, req.user._id),
      commentCount: comments.length,
      comments: comments.map((comment) => mapComment(comment, req.user._id)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Soft delete a forum post (author only)
// @route   DELETE /api/forum/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    post.deletedAt = new Date();
    await post.save();

    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a comment (author only)
// @route   PUT /api/forum/:id/comments/:commentId
// @access  Private
const updateComment = async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;

    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.findOne({
      _id: req.params.commentId,
      postId: post._id,
      deletedAt: null,
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({ message: 'Comment content is required' });
      }
      comment.content = content.trim();
    }
    if (isAnonymous !== undefined) comment.isAnonymous = isAnonymous === true;

    await comment.save();

    const populated = await Comment.findById(comment._id).populate('userId', 'name');
    res.json(mapComment(populated, req.user._id));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Soft delete a comment (author only)
// @route   DELETE /api/forum/:id/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.findOne({
      _id: req.params.commentId,
      postId: post._id,
      deletedAt: null,
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    comment.deletedAt = new Date();
    await comment.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createPost, listPosts, getPost, createComment, reportComment, updatePost, deletePost, updateComment, deleteComment };