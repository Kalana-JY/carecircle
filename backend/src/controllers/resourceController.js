const Resource = require('../models/MentalHealthResource');
const User = require('../models/User');

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

// Get resources with optional filters and search
const getResources = async (req, res) => {
  try {
    const { category, topic, type, q, page = 1, limit = 50, sortBy } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (topic) filter.topics = topic;
    if (type) filter.type = type;

    let query = Resource.find(filter);

    if (q) {
      // use text search if index exists, otherwise fallback to regex on title/description
      query = Resource.find({ $text: { $search: q }, ...filter });
    }

    // sorting
    if (sortBy === 'rating') query = query.sort({ averageRating: -1 });
    else query = query.sort({ createdAt: -1 });

    const skip = (Number(page) - 1) * Number(limit);
    const resources = await query.skip(skip).limit(Number(limit)).exec();
    return res.status(200).json(resources);
  } catch (error) {
    console.error('getResources error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get a single resource by id
const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate('reviews.user', 'name email');
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

// Bookmark (toggle) a resource for the authenticated user
const bookmarkResource = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resourceId = req.params.id;
    const idx = user.bookmarks.findIndex((b) => b.toString() === resourceId);
    let action = 'removed';
    if (idx > -1) {
      user.bookmarks.splice(idx, 1);
    } else {
      user.bookmarks.push(resourceId);
      action = 'added';
    }
    await user.save();
    await user.populate('bookmarks');
    return res.status(200).json({ message: `bookmark ${action}`, bookmarks: user.bookmarks });
  } catch (error) {
    console.error('bookmarkResource error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get current user's bookmarks
const getBookmarks = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const user = await User.findById(req.user._id).populate('bookmarks');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user.bookmarks);
  } catch (error) {
    console.error('getBookmarks error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add or update a review for a resource
const addReview = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { rating, comment } = req.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // check existing review by this user
    const existing = resource.reviews.find((r) => r.user && r.user.toString() === req.user._id.toString());
    if (existing) {
      existing.rating = rating || existing.rating;
      existing.comment = comment || existing.comment;
    } else {
      resource.reviews.push({ user: req.user._id, rating, comment });
    }

    // recalculate average
    const ratings = resource.reviews.map((r) => r.rating || 0).filter((n) => n > 0);
    resource.ratingsCount = ratings.length;
    resource.averageRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;

    await resource.save();
    await resource.populate('reviews.user', 'name email');
    return res.status(200).json(resource.reviews);
  } catch (error) {
    console.error('addReview error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get reviews for a resource
const getReviews = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate('reviews.user', 'name email');
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    return res.status(200).json(resource.reviews);
  } catch (error) {
    console.error('getReviews error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Log a share action
const shareResource = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { sharedWith, method } = req.body; // sharedWith: email/phone, method: 'sms'|'email'|'link'
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    resource.shares.push({ user: req.user._id, sharedWith: sharedWith || '', method: method || 'link' });
    await resource.save();
    return res.status(200).json({ message: 'Share logged' });
  } catch (error) {
    console.error('shareResource error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Simple personalized recommendations based on user's bookmarked resources
const getRecommendations = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const user = await User.findById(req.user._id).populate('bookmarks');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // gather top categories/topics from bookmarks
    const categoryCount = {};
    const topicCount = {};
    user.bookmarks.forEach((b) => {
      if (b.category) categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
      if (Array.isArray(b.topics)) b.topics.forEach((t) => (topicCount[t] = (topicCount[t] || 0) + 1));
    });

    const categoryKeys = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a]);
    const topicKeys = Object.keys(topicCount).sort((a, b) => topicCount[b] - topicCount[a]);

    const matchConditions = [];
    if (categoryKeys.length) matchConditions.push({ category: { $in: categoryKeys.slice(0, 3) } });
    if (topicKeys.length) matchConditions.push({ topics: { $in: topicKeys.slice(0, 5) } });

    let recommendations = [];
    if (matchConditions.length) {
      recommendations = await Resource.find({ $or: matchConditions, _id: { $nin: user.bookmarks.map((b) => b._id) } })
        .sort({ averageRating: -1 })
        .limit(12)
        .exec();
    }

    // fallback to top-rated resources
    if (!recommendations.length) {
      recommendations = await Resource.find({ _id: { $nin: user.bookmarks.map((b) => b._id) } }).sort({ averageRating: -1 }).limit(12).exec();
    }

    return res.status(200).json(recommendations);
  } catch (error) {
    console.error('getRecommendations error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
};
