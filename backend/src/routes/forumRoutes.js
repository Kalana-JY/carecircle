const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createPost, listPosts, getPost, createComment, reportComment } = require('../controllers/forumController');

router.use(protect);

router.post('/', createPost);
router.get('/', listPosts);
router.get('/:id', getPost);
router.post('/:id/comments', createComment);
router.post('/:id/comments/:commentId/report', reportComment);

module.exports = router;
