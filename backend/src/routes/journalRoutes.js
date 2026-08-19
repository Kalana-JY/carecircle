const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createJournal, listJournals, getJournal, updateJournal, deleteJournal } = require('../controllers/journalController');

router.use(protect);

router.post('/', createJournal);
router.get('/', listJournals);
router.get('/:id', getJournal);
router.patch('/:id', updateJournal);
router.delete('/:id', deleteJournal);

module.exports = router;
