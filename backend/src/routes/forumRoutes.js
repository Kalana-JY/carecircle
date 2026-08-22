const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPost,
  listPosts,
  getPost,
  createComment,
  reportComment,
  getReportedComments,
  resolveReportedComment,
  deleteReportedComment,
} = require('../controllers/forumController');

router.use(protect);

router.post('/', createPost);
router.get('/', listPosts);

// Admin Moderation Routes
router.get('/reported-comments', getReportedComments);
router.put('/reported-comments/:commentId/resolve', resolveReportedComment);
router.delete('/reported-comments/:commentId', deleteReportedComment);

router.get('/:id', getPost);
router.post('/:id/comments', createComment);
router.post('/:id/comments/:commentId/report', reportComment);

module.exports = router;
