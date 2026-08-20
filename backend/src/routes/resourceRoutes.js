const express = require('express');
const router = express.Router();
const {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');

const {
  bookmarkResource,
  getBookmarks,
  addReview,
  getReviews,
  shareResource,
  getRecommendations,
} = require('../controllers/resourceController');

router.route('/').get(getResources).post(protect, createResource);
router.route('/bookmarks').get(protect, getBookmarks);
router.route('/recommendations').get(protect, getRecommendations);

router.route('/:id').get(getResourceById).put(protect, updateResource).delete(protect, deleteResource);
router.route('/:id/bookmark').post(protect, bookmarkResource);
router.route('/:id/reviews').get(getReviews).post(protect, addReview);
router.route('/:id/share').post(protect, shareResource);

module.exports = router;
//
