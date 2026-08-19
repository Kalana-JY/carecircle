const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  isAnonymous: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

forumPostSchema.index({ userId: 1, createdAt: -1 });
forumPostSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);
