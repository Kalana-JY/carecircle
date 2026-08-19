const PeerSupporterApplication = require('../models/PeerSupporterApplication');

// @desc    Submit application to become a peer supporter
// @route   POST /api/peer-supporters/apply
// @access  Private
const applyForPeerSupporter = async (req, res) => {
  try {
    const { name, age, address, occupation, experiences, evidence } = req.body;
    const userId = req.user._id;

    // Check if application already exists
    const existingApplication = await PeerSupporterApplication.findOne({ userId });
    if (existingApplication) {
      return res.status(400).json({
        message: 'You have already submitted a peer supporter application.',
        status: existingApplication.status,
        application: existingApplication,
      });
    }

    // Validate presence of all fields
    if (!name || !age || !address || !occupation || !experiences || !evidence) {
      return res.status(400).json({
        message: 'Please provide all required fields (name, age, address, occupation, experiences, evidence)',
      });
    }

    // Validate age is a number and at least 18
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 18) {
      return res.status(400).json({
        message: 'Age must be a valid number and at least 18 years old.',
      });
    }

    // Create application
    const application = await PeerSupporterApplication.create({
      userId,
      name: name.trim(),
      age: ageNum,
      address: address.trim(),
      occupation: occupation.trim(),
      experiences: experiences.trim(),
      evidence: evidence.trim(),
    });

    res.status(201).json({
      message: 'Application submitted successfully.',
      application,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get the current user's peer supporter application status
// @route   GET /api/peer-supporters/status
// @access  Private
const getApplicationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const application = await PeerSupporterApplication.findOne({ userId });
    if (!application) {
      return res.json({ status: 'none' });
    }

    res.json({
      status: application.status,
      application,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  applyForPeerSupporter,
  getApplicationStatus,
};
