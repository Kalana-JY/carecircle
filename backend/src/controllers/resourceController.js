const mongoose = require('mongoose');
const Resource = require('../models/MentalHealthResource');
const User = require('../models/User');
const { isAdminUser } = require('../middleware/authMiddleware');
const {
  RESOURCE_TYPES,
  SHARE_METHODS,
  RESOURCE_WRITABLE_FIELDS,
} = require('../constants/resources');

const MAX_VIEW_HISTORY = 30;
const LIST_SELECT = '-content -steps -reviews -shares';

const handleError = (res, error, context) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message || 'Invalid resource input' });
  }

  console.error(`${context} error:`, error);
  return res.status(500).json({ message: 'Server error' });
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toArray = (value) => {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const pickResourceFields = (body = {}) => {
  const data = {};
  RESOURCE_WRITABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  if (data.topics) data.topics = toArray(data.topics);
  if (data.tags) data.tags = toArray(data.tags);
  if (data.steps && !Array.isArray(data.steps)) data.steps = [];
  return data;
};

const validateResourceContent = (data, { partial = false } = {}) => {
  const type = data.type;
  if (!partial && !type) return 'Resource type is required';
  if (type && !RESOURCE_TYPES.includes(type)) {
    return 'Type must be article, video, or self-help-guide';
  }

  if (type === 'video' && !partial && !data.url) {
    return 'A video URL is required for video resources';
  }
  if (type === 'article' && !partial && !data.content && !data.url) {
    return 'Articles require content or a URL';
  }
  if (type === 'self-help-guide' && !partial && !data.content && !(Array.isArray(data.steps) && data.steps.length)) {
    return 'Self-help guides require content or at least one step';
  }
  return null;
};

const toPublicResource = (doc, { includeContent = false, includeShares = false, bookmarked = false } = {}) => {
  const resource = doc.toObject ? doc.toObject() : { ...doc };
  if (!includeShares) delete resource.shares;
  if (!includeContent) {
    delete resource.content;
    delete resource.steps;
  }
  resource.bookmarked = Boolean(bookmarked);
  return resource;
};

const findPublishedOrAdmin = async (id, user) => {
  const resource = await Resource.findById(id);
  if (!resource) return { error: { status: 404, message: 'Resource not found' } };
  if (!resource.isPublished && !isAdminUser(user)) {
    return { error: { status: 404, message: 'Resource not found' } };
  }
  return { resource };
};

const recordResourceView = async (userId, resourceId) => {
  const user = await User.findById(userId);
  if (!user) return;

  user.resourceViews = (user.resourceViews || []).filter(
    (view) => view.resource && view.resource.toString() !== resourceId.toString()
  );
  user.resourceViews.unshift({ resource: resourceId, viewedAt: new Date() });
  user.resourceViews = user.resourceViews.slice(0, MAX_VIEW_HISTORY);
  await user.save();
};

const buildListFilter = (query, user) => {
  const { category, topic, type, q, includeUnpublished } = query;
  const filter = {};

  if (!(includeUnpublished === 'true' && isAdminUser(user))) {
    filter.isPublished = true;
  }
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (type) filter.type = new RegExp(`^${escapeRegex(type)}$`, 'i');

  const topics = toArray(topic);
  if (topics.length === 1) {
    filter.topics = new RegExp(`^${escapeRegex(topics[0])}$`, 'i');
  } else if (topics.length > 1) {
    filter.topics = { $in: topics.map((item) => new RegExp(`^${escapeRegex(item)}$`, 'i')) };
  }

  if (q && String(q).trim()) {
    const regex = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [
      { title: regex },
      { description: regex },
      { tags: regex },
      { topics: regex },
      { content: regex },
      { category: regex },
      { author: regex },
      { source: regex },
    ];
  }

  return filter;
};

const getBookmarkIdSet = async (user) => {
  if (!user) return new Set();
  const freshUser = await User.findById(user._id).select('bookmarks');
  return new Set((freshUser?.bookmarks || []).map((id) => id.toString()));
};

const createResource = async (req, res) => {
  try {
    const data = pickResourceFields(req.body);
    if (!data.title || !String(data.title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const contentError = validateResourceContent(data);
    if (contentError) return res.status(400).json({ message: contentError });

    data.createdBy = req.user._id;
    if (data.isPublished === undefined) data.isPublished = true;

    const resource = await Resource.create(data);
    return res.status(201).json({
      message: 'Resource created successfully',
      resource,
    });
  } catch (error) {
    return handleError(res, error, 'createResource');
  }
};

const getResources = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildListFilter(req.query, req.user);

    let sort = { createdAt: -1 };
    if (req.query.sortBy === 'rating') sort = { averageRating: -1, ratingsCount: -1, createdAt: -1 };
    if (req.query.sortBy === 'title') sort = { title: 1 };

    const [resources, total] = await Promise.all([
      Resource.find(filter).select(LIST_SELECT).sort(sort).skip(skip).limit(limit),
      Resource.countDocuments(filter),
    ]);

    const bookmarkSet = await getBookmarkIdSet(req.user);
    const items = resources.map((resource) =>
      toPublicResource(resource, { bookmarked: bookmarkSet.has(resource._id.toString()) })
    );

    return res.status(200).json({
      items,
      meta: { page, limit, total },
    });
  } catch (error) {
    return handleError(res, error, 'getResources');
  }
};

const getResourceById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const { resource, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    await resource.populate('reviews.user', 'name');
    if (req.user && !isAdminUser(req.user)) {
      await recordResourceView(req.user._id, resource._id);
    }

    const bookmarkSet = await getBookmarkIdSet(req.user);
    return res.status(200).json(
      toPublicResource(resource, {
        includeContent: true,
        includeShares: isAdminUser(req.user),
        bookmarked: bookmarkSet.has(resource._id.toString()),
      })
    );
  } catch (error) {
    return handleError(res, error, 'getResourceById');
  }
};

const updateResource = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const updates = pickResourceFields(req.body);
    const contentError = validateResourceContent({ ...resource.toObject(), ...updates }, { partial: true });
    if (contentError) return res.status(400).json({ message: contentError });

    Object.assign(resource, updates);
    await resource.save();
    return res.status(200).json({
      message: 'Resource updated successfully',
      resource,
    });
  } catch (error) {
    return handleError(res, error, 'updateResource');
  }
};

const deleteResource = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    await resource.deleteOne();
    await User.updateMany(
      { $or: [{ bookmarks: resource._id }, { 'resourceViews.resource': resource._id }] },
      { $pull: { bookmarks: resource._id, resourceViews: { resource: resource._id } } }
    );

    return res.status(200).json({ message: 'Resource deleted' });
  } catch (error) {
    return handleError(res, error, 'deleteResource');
  }
};

const bookmarkResource = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const { resource, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resourceId = resource._id.toString();
    const existingIndex = user.bookmarks.findIndex((id) => id.toString() === resourceId);
    let action = 'removed';
    if (existingIndex > -1) {
      user.bookmarks.splice(existingIndex, 1);
    } else {
      user.bookmarks.push(resource._id);
      action = 'added';
    }

    await user.save();
    await user.populate({ path: 'bookmarks', select: LIST_SELECT });

    return res.status(200).json({
      message: action === 'added' ? 'Resource bookmarked' : 'Bookmark removed',
      bookmarked: action === 'added',
      bookmarks: user.bookmarks,
    });
  } catch (error) {
    return handleError(res, error, 'bookmarkResource');
  }
};

const getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'bookmarks',
      match: { isPublished: true },
      select: LIST_SELECT,
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const items = (user.bookmarks || []).filter(Boolean).map((resource) =>
      toPublicResource(resource, { bookmarked: true })
    );
    return res.status(200).json({ items, meta: { total: items.length } });
  } catch (error) {
    return handleError(res, error, 'getBookmarks');
  }
};

const addReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    const { resource, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const existing = resource.reviews.find(
      (review) => review.user && review.user.toString() === req.user._id.toString()
    );
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      existing.updatedAt = new Date();
    } else {
      resource.reviews.push({ user: req.user._id, rating, comment });
    }

    resource.recalculateRating();
    await resource.save();
    await resource.populate('reviews.user', 'name');

    return res.status(200).json({
      message: existing ? 'Review updated' : 'Review added',
      averageRating: resource.averageRating,
      ratingsCount: resource.ratingsCount,
      reviews: resource.reviews,
    });
  } catch (error) {
    return handleError(res, error, 'addReview');
  }
};

const getReviews = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const { resource, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    await resource.populate('reviews.user', 'name');
    return res.status(200).json({
      items: resource.reviews,
      meta: {
        total: resource.reviews.length,
        averageRating: resource.averageRating,
        ratingsCount: resource.ratingsCount,
      },
    });
  } catch (error) {
    return handleError(res, error, 'getReviews');
  }
};

const shareResource = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource id' });
    }

    const method = (req.body.method || 'link').toLowerCase();
    if (!SHARE_METHODS.includes(method)) {
      return res.status(400).json({ message: 'Share method must be link, email, or sms' });
    }

    const { resource, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const sharedWith = typeof req.body.sharedWith === 'string' ? req.body.sharedWith.trim() : '';
    resource.shares.push({ user: req.user._id, sharedWith, method });
    await resource.save();

    const shareUrl = resource.url || `/resources/${resource._id}`;
    const text = `I found this CareCircle resource helpful: ${resource.title}${shareUrl ? ` — ${shareUrl}` : ''}`;

    return res.status(200).json({
      message: 'Share logged',
      share: {
        method,
        sharedWith,
        title: resource.title,
        description: resource.description || '',
        shareUrl,
        text,
      },
    });
  } catch (error) {
    return handleError(res, error, 'shareResource');
  }
};

const collectPreferenceSignals = async (user) => {
  const populated = await User.findById(user._id)
    .populate({ path: 'bookmarks', select: 'category topics' })
    .populate({ path: 'resourceViews.resource', select: 'category topics' });

  const categoryCount = {};
  const topicCount = {};

  const addResourceSignals = (resource, weight = 1) => {
    if (!resource) return;
    if (resource.category) {
      categoryCount[resource.category] = (categoryCount[resource.category] || 0) + weight;
    }
    (resource.topics || []).forEach((topic) => {
      topicCount[topic] = (topicCount[topic] || 0) + weight;
    });
  };

  (populated.bookmarks || []).forEach((resource) => addResourceSignals(resource, 3));
  (populated.resourceViews || []).forEach((view) => addResourceSignals(view.resource, 1));
  (populated.interests || []).forEach((interest) => {
    topicCount[interest] = (topicCount[interest] || 0) + 2;
    categoryCount[interest] = (categoryCount[interest] || 0) + 1;
  });

  const reviewedResources = await Resource.find({ 'reviews.user': user._id, isPublished: true })
    .select('category topics')
    .lean();
  reviewedResources.forEach((resource) => addResourceSignals(resource, 2));

  const ranked = (counts) => Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  return {
    categories: ranked(categoryCount).slice(0, 5),
    topics: ranked(topicCount).slice(0, 8),
    excludeIds: (populated.bookmarks || []).map((resource) => resource._id),
  };
};

const getRecommendations = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 30);
    const { categories, topics, excludeIds } = await collectPreferenceSignals(req.user);
    const matchConditions = [];
    if (categories.length) matchConditions.push({ category: { $in: categories } });
    if (topics.length) matchConditions.push({ topics: { $in: topics } });

    const baseFilter = {
      isPublished: true,
      _id: { $nin: excludeIds },
    };

    let recommendations = [];
    if (matchConditions.length) {
      recommendations = await Resource.find({ ...baseFilter, $or: matchConditions })
        .select(LIST_SELECT)
        .sort({ averageRating: -1, ratingsCount: -1, createdAt: -1 })
        .limit(limit);
    }

    if (recommendations.length < limit) {
      const extra = await Resource.find({
        ...baseFilter,
        _id: { $nin: [...excludeIds, ...recommendations.map((item) => item._id)] },
      })
        .select(LIST_SELECT)
        .sort({ averageRating: -1, ratingsCount: -1, createdAt: -1 })
        .limit(limit - recommendations.length);
      recommendations = recommendations.concat(extra);
    }

    return res.status(200).json({
      items: recommendations.map((resource) => toPublicResource(resource, { bookmarked: false })),
      meta: {
        total: recommendations.length,
        basedOn: {
          categories,
          topics,
        },
      },
    });
  } catch (error) {
    return handleError(res, error, 'getRecommendations');
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const published = { isPublished: true };
    const [categories, topics, types] = await Promise.all([
      Resource.distinct('category', { ...published, category: { $nin: [null, ''] } }),
      Resource.distinct('topics', published),
      Resource.distinct('type', published),
    ]);

    return res.status(200).json({
      types: RESOURCE_TYPES.filter((type) => types.includes(type)).concat(
        types.filter((type) => !RESOURCE_TYPES.includes(type))
      ),
      categories: categories.filter(Boolean).sort(),
      topics: topics.filter(Boolean).sort(),
    });
  } catch (error) {
    return handleError(res, error, 'getFilterOptions');
  }
};

const getInterests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('interests');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ interests: user.interests || [] });
  } catch (error) {
    return handleError(res, error, 'getInterests');
  }
};

const updateInterests = async (req, res) => {
  try {
    const interests = toArray(req.body.interests)
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.interests = interests;
    await user.save();

    return res.status(200).json({
      message: 'Interests updated',
      interests: user.interests,
    });
  } catch (error) {
    return handleError(res, error, 'updateInterests');
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
  getFilterOptions,
  getInterests,
  updateInterests,
};
