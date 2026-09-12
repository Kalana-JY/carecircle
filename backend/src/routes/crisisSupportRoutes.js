const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, optionalProtect, adminOnly } = require('../middleware/authMiddleware');
const { CRISIS_ENTRY_TYPES } = require('../constants/crisisSupport');
const {
  createEntry,
  getEntries,
  getNearbyEntries,
  getHelplines,
  getHelpNow,
  getEntryById,
  getDirections,
  updateEntry,
  deleteEntry,
  saveContact,
  getSavedContacts,
  getFilterOptions,
  getPersonalContacts,
  addPersonalContact,
  updatePersonalContact,
  deletePersonalContact,
} = require('../controllers/crisisSupportController');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  return next();
};

const validateCreate = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  body('type').notEmpty().withMessage('Entry type is required').isIn(CRISIS_ENTRY_TYPES).withMessage('Type must be hospital, counselor, organization, or helpline'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Please provide a valid email'),
  body('website')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
      } catch {
        throw new Error('Please provide a valid website URL');
      }
    }),
  body('latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  handleValidation,
];

const validateUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  body('type').optional().isIn(CRISIS_ENTRY_TYPES).withMessage('Type must be hospital, counselor, organization, or helpline'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Please provide a valid email'),
  body('website')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
      } catch {
        throw new Error('Please provide a valid website URL');
      }
    }),
  body('latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  handleValidation,
];

router.get('/', optionalProtect, getEntries);
router.post('/', protect, adminOnly, validateCreate, createEntry);

router.get('/nearby', optionalProtect, getNearbyEntries);
router.get('/helplines', optionalProtect, getHelplines);
router.get('/help-now', optionalProtect, getHelpNow);
router.get('/saved', protect, getSavedContacts);
router.get('/filters', getFilterOptions);
router.get('/personal-contacts', protect, getPersonalContacts);
router.post('/personal-contacts', protect, addPersonalContact);
router.put('/personal-contacts/:contactId', protect, updatePersonalContact);
router.delete('/personal-contacts/:contactId', protect, deletePersonalContact);

router.get('/:id', optionalProtect, getEntryById);
router.put('/:id', protect, adminOnly, validateUpdate, updateEntry);
router.delete('/:id', protect, adminOnly, deleteEntry);

router.get('/:id/directions', optionalProtect, getDirections);
router.post('/:id/save', protect, saveContact);

// Express 5 does not send POST/GET /api/crisis-support (no trailing slash) into router.get('/')
router.registerRoot = (app) => {
  app.get('/api/crisis-support', optionalProtect, getEntries);
  app.post('/api/crisis-support', protect, adminOnly, validateCreate, createEntry);
};

module.exports = router;
