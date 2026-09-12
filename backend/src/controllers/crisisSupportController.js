const mongoose = require('mongoose');
const CrisisSupportEntry = require('../models/CrisisSupportEntry');
const User = require('../models/User');
const { isAdminUser } = require('../middleware/authMiddleware');
const {
  CRISIS_ENTRY_TYPES,
  NEARBY_ENTRY_TYPES,
  CRISIS_WRITABLE_FIELDS,
} = require('../constants/crisisSupport');

const handleError = (res, error, context) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message || 'Invalid crisis support input' });
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

const parseCoordinates = (source = {}) => {
  const hasLat = source.latitude !== undefined || source.lat !== undefined;
  const hasLng = source.longitude !== undefined || source.lng !== undefined;
  if (!hasLat && !hasLng) return { provided: false };

  const latitude = Number(source.latitude ?? source.lat);
  const longitude = Number(source.longitude ?? source.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { provided: true, error: 'Latitude and longitude must be valid numbers' };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { provided: true, error: 'Coordinates are out of range' };
  }

  return {
    provided: true,
    latitude,
    longitude,
    location: { type: 'Point', coordinates: [longitude, latitude] },
  };
};

const pickEntryFields = (body = {}) => {
  const data = {};
  CRISIS_WRITABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  if (data.languages) data.languages = toArray(data.languages);
  if (data.services) data.services = toArray(data.services);
  if (data.website) {
    data.website = /^https?:\/\//i.test(data.website) ? data.website : `https://${data.website}`;
  }
  return data;
};

const validateEntryContent = (data, { partial = false } = {}) => {
  if (!partial && !data.name) return 'Name is required';
  if (!partial && !data.type) return 'Entry type is required';
  if (data.type && !CRISIS_ENTRY_TYPES.includes(data.type)) {
    return 'Type must be hospital, counselor, organization, or helpline';
  }
  if (data.type === 'helpline' && !partial && !data.phone) {
    return 'A phone number is required for helpline entries';
  }
  if (NEARBY_ENTRY_TYPES.includes(data.type) && !partial && !data.phone && !data.address && !data.location) {
    return 'Hospitals, counselors, and organizations need a phone, address, or coordinates';
  }
  return null;
};

const toPublicEntry = (doc, { saved = false, distanceMeters } = {}) => {
  const entry = doc.toObject ? doc.toObject() : { ...doc };
  const coordinates = entry.location?.coordinates;
  entry.longitude = Array.isArray(coordinates) ? coordinates[0] : null;
  entry.latitude = Array.isArray(coordinates) ? coordinates[1] : null;
  entry.saved = Boolean(saved);
  if (Number.isFinite(distanceMeters)) {
    entry.distanceMeters = Math.round(distanceMeters);
    entry.distanceKm = Number((distanceMeters / 1000).toFixed(2));
  }
  return entry;
};

const publishedFilter = (user, query = {}) => {
  if (query.includeUnpublished === 'true' && isAdminUser(user)) return {};
  return { isPublished: true };
};

const findPublishedOrAdmin = async (id, user) => {
  const entry = await CrisisSupportEntry.findById(id);
  if (!entry) return { error: { status: 404, message: 'Crisis support entry not found' } };
  if (!entry.isPublished && !isAdminUser(user)) {
    return { error: { status: 404, message: 'Crisis support entry not found' } };
  }
  return { entry };
};

const getSavedIdSet = async (user) => {
  if (!user) return new Set();
  const freshUser = await User.findById(user._id).select('savedCrisisContacts');
  return new Set((freshUser?.savedCrisisContacts || []).map((id) => id.toString()));
};

const buildListFilter = (query, user) => {
  const filter = { ...publishedFilter(user, query) };
  if (query.type) {
    const types = toArray(query.type).filter((type) => CRISIS_ENTRY_TYPES.includes(type));
    if (types.length === 1) filter.type = types[0];
    else if (types.length > 1) filter.type = { $in: types };
  }
  if (query.city) filter.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  if (query.isEmergency === 'true') filter.isEmergency = true;
  if (query.is24Hours === 'true') filter.is24Hours = true;

  if (query.q && String(query.q).trim()) {
    const regex = new RegExp(escapeRegex(String(query.q).trim()), 'i');
    filter.$or = [
      { name: regex },
      { description: regex },
      { city: regex },
      { address: regex },
      { services: regex },
      { phone: regex },
    ];
  }

  return filter;
};

const findNearbyEntries = async ({ latitude, longitude, radiusKm, types, user, query, limit }) => {
  const maxDistance = Math.max(radiusKm, 0.1) * 1000;
  const geoQuery = {
    ...publishedFilter(user, query),
    type: { $in: types },
    location: { $exists: true, $ne: null },
  };

  if (query.city) geoQuery.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');

  return CrisisSupportEntry.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMeters',
        maxDistance,
        spherical: true,
        query: geoQuery,
      },
    },
    { $limit: limit },
  ]);
};

const buildDirections = (entry, origin) => {
  const coordinates = entry.location?.coordinates;
  const latitude = Array.isArray(coordinates) ? coordinates[1] : null;
  const longitude = Array.isArray(coordinates) ? coordinates[0] : null;
  const destination = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude},${longitude}`
    : (entry.address || entry.name);

  if (!destination) return { error: 'This entry does not have an address or coordinates for directions' };

  const encodedDestination = encodeURIComponent(destination);
  const originParam = origin?.provided
    ? `&origin=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}`
    : '';

  return {
    name: entry.name,
    address: entry.address || '',
    latitude,
    longitude,
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}${originParam}`,
    appleMapsUrl: `https://maps.apple.com/?daddr=${encodedDestination}${origin?.provided ? `&saddr=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}` : ''}`,
    geoUri: Number.isFinite(latitude) && Number.isFinite(longitude) ? `geo:${latitude},${longitude}` : null,
  };
};

const createEntry = async (req, res) => {
  try {
    const data = pickEntryFields(req.body);
    const coords = parseCoordinates(req.body);
    if (coords.error) return res.status(400).json({ message: coords.error });
    if (coords.provided) data.location = coords.location;

    const contentError = validateEntryContent(data);
    if (contentError) return res.status(400).json({ message: contentError });

    data.createdBy = req.user._id;
    if (data.isPublished === undefined) data.isPublished = true;

    const entry = await CrisisSupportEntry.create(data);
    return res.status(201).json({
      message: 'Crisis support entry created successfully',
      entry: toPublicEntry(entry),
    });
  } catch (error) {
    return handleError(res, error, 'createCrisisSupportEntry');
  }
};

const getEntries = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildListFilter(req.query, req.user);
    const savedSet = await getSavedIdSet(req.user);

    const [entries, total] = await Promise.all([
      CrisisSupportEntry.find(filter).sort({ isEmergency: -1, name: 1 }).skip(skip).limit(limit),
      CrisisSupportEntry.countDocuments(filter),
    ]);

    return res.status(200).json({
      items: entries.map((entry) => toPublicEntry(entry, { saved: savedSet.has(entry._id.toString()) })),
      meta: { page, limit, total },
    });
  } catch (error) {
    return handleError(res, error, 'getCrisisSupportEntries');
  }
};

const getNearbyEntries = async (req, res) => {
  try {
    const coords = parseCoordinates(req.query);
    if (!coords.provided || coords.error) {
      return res.status(400).json({ message: coords.error || 'lat and lng are required to find nearby support services' });
    }

    const requestedTypes = toArray(req.query.type).filter((type) => NEARBY_ENTRY_TYPES.includes(type));
    const types = requestedTypes.length ? requestedTypes : NEARBY_ENTRY_TYPES;
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 25, 0.5), 200);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const entries = await findNearbyEntries({
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusKm,
      types,
      user: req.user,
      query: req.query,
      limit,
    });

    const savedSet = await getSavedIdSet(req.user);
    return res.status(200).json({
      items: entries.map((entry) => toPublicEntry(entry, {
        saved: savedSet.has(entry._id.toString()),
        distanceMeters: entry.distanceMeters,
      })),
      meta: {
        total: entries.length,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusKm,
        types,
      },
    });
  } catch (error) {
    return handleError(res, error, 'getNearbyCrisisSupportEntries');
  }
};

const getHelplines = async (req, res) => {
  try {
    const filter = {
      ...publishedFilter(req.user, req.query),
      type: 'helpline',
    };
    if (req.query.isEmergency === 'true') filter.isEmergency = true;

    const entries = await CrisisSupportEntry.find(filter).sort({ isEmergency: -1, is24Hours: -1, name: 1 });
    const savedSet = await getSavedIdSet(req.user);

    return res.status(200).json({
      items: entries.map((entry) => toPublicEntry(entry, { saved: savedSet.has(entry._id.toString()) })),
      meta: { total: entries.length },
    });
  } catch (error) {
    return handleError(res, error, 'getHelplines');
  }
};

const getHelpNow = async (req, res) => {
  try {
    const coords = parseCoordinates(req.query);
    if (coords.provided && coords.error) {
      return res.status(400).json({ message: coords.error });
    }

    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 50, 0.5), 200);
    const savedSet = await getSavedIdSet(req.user);

    const helplines = await CrisisSupportEntry.find({
      ...publishedFilter(req.user, req.query),
      type: 'helpline',
    }).sort({ isEmergency: -1, is24Hours: -1, name: 1 }).limit(10);

    let nearby = [];
    if (coords.provided) {
      nearby = await findNearbyEntries({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusKm,
        types: NEARBY_ENTRY_TYPES,
        user: req.user,
        query: req.query,
        limit: 5,
      });
    }

    return res.status(200).json({
      guidance: {
        headline: 'If you are in immediate danger, contact emergency services now.',
        message: 'You can call a crisis helpline or go to a nearby hospital, counselor, or mental health organization.',
        emergencyNumber: process.env.CRISIS_EMERGENCY_NUMBER || null,
      },
      helplines: helplines.map((entry) => toPublicEntry(entry, { saved: savedSet.has(entry._id.toString()) })),
      nearby: nearby.map((entry) => toPublicEntry(entry, {
        saved: savedSet.has(entry._id.toString()),
        distanceMeters: entry.distanceMeters,
      })),
    });
  } catch (error) {
    return handleError(res, error, 'getHelpNow');
  }
};

const getEntryById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crisis support entry id' });
    }

    const { entry, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const savedSet = await getSavedIdSet(req.user);
    return res.status(200).json(toPublicEntry(entry, { saved: savedSet.has(entry._id.toString()) }));
  } catch (error) {
    return handleError(res, error, 'getCrisisSupportEntryById');
  }
};

const getDirections = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crisis support entry id' });
    }

    const { entry, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const origin = parseCoordinates(req.query);
    if (origin.provided && origin.error) {
      return res.status(400).json({ message: origin.error });
    }

    const directions = buildDirections(entry, origin);
    if (directions.error) return res.status(400).json({ message: directions.error });

    return res.status(200).json(directions);
  } catch (error) {
    return handleError(res, error, 'getCrisisSupportDirections');
  }
};

const updateEntry = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crisis support entry id' });
    }

    const entry = await CrisisSupportEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Crisis support entry not found' });

    const updates = pickEntryFields(req.body);
    const coords = parseCoordinates(req.body);
    if (coords.error) return res.status(400).json({ message: coords.error });
    if (coords.provided) updates.location = coords.location;

    const merged = { ...entry.toObject(), ...updates };
    const contentError = validateEntryContent(merged, { partial: true });
    if (contentError) return res.status(400).json({ message: contentError });

    Object.assign(entry, updates);
    await entry.save();

    return res.status(200).json({
      message: 'Crisis support entry updated successfully',
      entry: toPublicEntry(entry),
    });
  } catch (error) {
    return handleError(res, error, 'updateCrisisSupportEntry');
  }
};

const deleteEntry = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crisis support entry id' });
    }

    const entry = await CrisisSupportEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Crisis support entry not found' });

    await entry.deleteOne();
    await User.updateMany(
      { savedCrisisContacts: entry._id },
      { $pull: { savedCrisisContacts: entry._id } }
    );

    return res.status(200).json({ message: 'Crisis support entry deleted' });
  } catch (error) {
    return handleError(res, error, 'deleteCrisisSupportEntry');
  }
};

const saveContact = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid crisis support entry id' });
    }

    const { entry, error } = await findPublishedOrAdmin(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const entryId = entry._id.toString();
    const existingIndex = (user.savedCrisisContacts || []).findIndex((id) => id.toString() === entryId);
    let saved = false;
    if (existingIndex > -1) {
      user.savedCrisisContacts.splice(existingIndex, 1);
    } else {
      user.savedCrisisContacts.push(entry._id);
      saved = true;
    }

    await user.save();
    await user.populate({ path: 'savedCrisisContacts', match: { isPublished: true } });

    return res.status(200).json({
      message: saved ? 'Crisis contact saved' : 'Crisis contact removed',
      saved,
      items: (user.savedCrisisContacts || []).filter(Boolean).map((item) => toPublicEntry(item, { saved: true })),
    });
  } catch (error) {
    return handleError(res, error, 'saveCrisisContact');
  }
};

const getSavedContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedCrisisContacts',
      match: { isPublished: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const items = (user.savedCrisisContacts || []).filter(Boolean).map((entry) => toPublicEntry(entry, { saved: true }));
    return res.status(200).json({ items, meta: { total: items.length } });
  } catch (error) {
    return handleError(res, error, 'getSavedCrisisContacts');
  }
};

const getFilterOptions = async (_req, res) => {
  try {
    const published = { isPublished: true };
    const [types, cities] = await Promise.all([
      CrisisSupportEntry.distinct('type', published),
      CrisisSupportEntry.distinct('city', { ...published, city: { $nin: [null, ''] } }),
    ]);

    return res.status(200).json({
      types: CRISIS_ENTRY_TYPES.filter((type) => types.includes(type)),
      cities: cities.filter(Boolean).sort(),
    });
  } catch (error) {
    return handleError(res, error, 'getCrisisSupportFilters');
  }
};

const getPersonalContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('personalCrisisContacts');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ items: user.personalCrisisContacts || [], meta: { total: (user.personalCrisisContacts || []).length } });
  } catch (error) {
    return handleError(res, error, 'getPersonalContacts');
  }
};

const addPersonalContact = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const relationship = typeof req.body.relationship === 'string' ? req.body.relationship.trim() : '';
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if ((user.personalCrisisContacts || []).length >= 20) {
      return res.status(400).json({ message: 'You can save up to 20 personal crisis contacts' });
    }

    user.personalCrisisContacts.push({ name, phone, relationship });
    await user.save();
    const contact = user.personalCrisisContacts[user.personalCrisisContacts.length - 1];
    return res.status(201).json({ message: 'Contact saved', contact, items: user.personalCrisisContacts });
  } catch (error) {
    return handleError(res, error, 'addPersonalContact');
  }
};

const updatePersonalContact = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const contact = user.personalCrisisContacts.id(req.params.contactId);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    if (req.body.name !== undefined) contact.name = String(req.body.name).trim();
    if (req.body.phone !== undefined) contact.phone = String(req.body.phone).trim();
    if (req.body.relationship !== undefined) contact.relationship = String(req.body.relationship).trim();
    if (!contact.name || !contact.phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    await user.save();
    return res.status(200).json({ message: 'Contact updated', contact, items: user.personalCrisisContacts });
  } catch (error) {
    return handleError(res, error, 'updatePersonalContact');
  }
};

const deletePersonalContact = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const contact = user.personalCrisisContacts.id(req.params.contactId);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    contact.deleteOne();
    await user.save();
    return res.status(200).json({ message: 'Contact deleted', items: user.personalCrisisContacts });
  } catch (error) {
    return handleError(res, error, 'deletePersonalContact');
  }
};

module.exports = {
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
};
