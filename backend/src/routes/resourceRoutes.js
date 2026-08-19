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

router.route('/').get(getResources).post(protect, createResource);
router.route('/:id').get(getResourceById).put(protect, updateResource).delete(protect, deleteResource);

module.exports = router;
//