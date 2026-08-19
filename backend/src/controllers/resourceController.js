const Resource = require('../models/MentalHealthResource');

// Create a new resource
const createResource = async (req, res) => {
  try {
    const data = req.body;
    if (req.user) data.createdBy = req.user._id;

    const resource = await Resource.create(data);
    return res.status(201).json(resource);
  } catch (error) {
    console.error('createResource error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all resources
const getResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    return res.status(200).json(resources);
  } catch (error) {
    console.error('getResources error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get a single resource by id
const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    return res.status(200).json(resource);
  } catch (error) {
    console.error('getResourceById error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update a resource
const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // Optional: only allow creator to update
    if (resource.createdBy && req.user && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    Object.assign(resource, req.body);
    await resource.save();
    return res.status(200).json(resource);
  } catch (error) {
    console.error('updateResource error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete a resource
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    if (resource.createdBy && req.user && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await resource.remove();
    return res.status(200).json({ message: 'Resource deleted' });
  } catch (error) {
    console.error('deleteResource error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
};
