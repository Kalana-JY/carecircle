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

// @desc    Get all peer supporter applications (Admin only)
// @route   GET /api/peer-supporters/applications
// @access  Private (Admin only)
const getApplications = async (req, res) => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isUserAdmin = req.user && req.user.email.toLowerCase() === adminEmail;
    if (!isUserAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const applications = await PeerSupporterApplication.find({})
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 });

    res.json({
      items: applications,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve or Reject a peer supporter application (Admin only)
// @route   PATCH /api/peer-supporters/applications/:id
// @access  Private (Admin only)
const updateApplicationStatus = async (req, res) => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isUserAdmin = req.user && req.user.email.toLowerCase() === adminEmail;
    if (!isUserAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { status } = req.body;
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const application = await PeerSupporterApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    application.status = status;
    await application.save();

    res.json({
      message: `Application status updated to ${status} successfully.`,
      application,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  applyForPeerSupporter,
  getApplicationStatus,
  getApplications,
  updateApplicationStatus,
};
