const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, optionalProtect, adminOnly } = require('../middleware/authMiddleware');
const { RESOURCE_TYPES, SHARE_METHODS } = require('../constants/resources');
const {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  bookmarkResource,
  getBookmarks,
  addReview,
  getReviews,
  shareResource,
  getRecommendations,
  getFilterOptions,
  getInterests,
  updateInterests,
} = require('../controllers/resourceController');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  return next();
};

const validateCreate = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('type').notEmpty().withMessage('Resource type is required').isIn(RESOURCE_TYPES).withMessage('Type must be article, video, or self-help-guide'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Please provide a valid URL'),
  body('durationMinutes').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Duration cannot be negative'),
  handleValidation,
];

const validateUpdate = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('type').optional().isIn(RESOURCE_TYPES).withMessage('Type must be article, video, or self-help-guide'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Please provide a valid URL'),
  body('durationMinutes').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Duration cannot be negative'),
  handleValidation,
];

const validateReview = [
  body('rating').notEmpty().withMessage('Rating is required').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('comment').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  handleValidation,
];

const validateShare = [
  body('method').optional().isIn(SHARE_METHODS).withMessage('Share method must be link, email, or sms'),
  handleValidation,
];

const validateInterests = [
  body('interests').isArray().withMessage('Interests must be an array'),
  handleValidation,
];

router.get('/', optionalProtect, getResources);
router.post('/', protect, adminOnly, validateCreate, createResource);

router.get('/bookmarks', protect, getBookmarks);
router.get('/recommendations', protect, getRecommendations);
router.get('/filters', getFilterOptions);
router.get('/interests', protect, getInterests);
router.put('/interests', protect, validateInterests, updateInterests);

router.get('/:id', optionalProtect, getResourceById);
router.put('/:id', protect, adminOnly, validateUpdate, updateResource);
router.delete('/:id', protect, adminOnly, deleteResource);

router.post('/:id/bookmark', protect, bookmarkResource);
router.get('/:id/reviews', optionalProtect, getReviews);
router.post('/:id/reviews', protect, validateReview, addReview);
router.post('/:id/share', protect, validateShare, shareResource);

router.registerRoot = (app) => {
  app.get('/api/resources', optionalProtect, getResources);
  app.post('/api/resources', protect, adminOnly, validateCreate, createResource);
};

module.exports = router;
