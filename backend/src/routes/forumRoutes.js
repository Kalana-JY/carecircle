const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createPost, listPosts, getPost, createComment, reportComment, updatePost, deletePost, updateComment, deleteComment } = require('../controllers/forumController');

router.use(protect);

router.post('/', createPost);
router.get('/', listPosts);
router.get('/:id', getPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/:id/comments', createComment);
router.put('/:id/comments/:commentId', updateComment);
router.delete('/:id/comments/:commentId', deleteComment);
router.post('/:id/comments/:commentId/report', reportComment);

module.exports = router;
