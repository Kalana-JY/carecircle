const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createMood, listMoods, getMood, updateMood, deleteMood } = require('../controllers/moodController');

router.use(protect);

router.post('/', createMood);
router.get('/', listMoods);
router.get('/:id', getMood);
router.patch('/:id', updateMood);
router.delete('/:id', deleteMood);

module.exports = router;
