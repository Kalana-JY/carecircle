const crypto = require('crypto');
const mongoose = require('mongoose');
const MoodReportShare = require('../models/MoodReportShare');
const User = require('../models/User');
const { handleError, isValidDate } = require('../services/moodInsights');
const { buildReport, toCsv, toPdf } = require('../services/moodReport');
const { resolveRange } = require('./moodInsightController');
const {
  EXPORT_FORMATS,
  DEFAULT_REPORT_DAYS,
  DEFAULT_SHARE_EXPIRY_DAYS,
  MAX_SHARE_EXPIRY_DAYS,
} = require('../constants/moods');

const filenameFor = (report, extension) =>
  `carecircle-mood-report-${report.range.start}-to-${report.range.end}.${extension}`;

// The JSON view keeps raw entries out unless asked for; exports always include them.
const presentReport = (report, { includeEntries = false, includeNotes = true } = {}) => {
  const { entries, ...rest } = report;
  if (!includeEntries) return rest;
  return {
    ...rest,
    entries: includeNotes ? entries : entries.map(({ notes, ...entry }) => entry),
  };
};

const stripNotes = (report) => ({
  ...report,
  entries: report.entries.map(({ notes, ...entry }) => entry),
});

const sendExport = async (res, report, format) => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameFor(report, 'csv')}"`);
    return res.status(200).send(toCsv(report));
  }

  const pdf = await toPdf(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameFor(report, 'pdf')}"`);
  res.setHeader('Content-Length', pdf.length);
  return res.status(200).end(pdf);
};

// US-26 - Generate mood report
exports.getMoodReport = async (req, res) => {
  try {
    const range = resolveRange(req.query, DEFAULT_REPORT_DAYS);
    if (range.error) return res.status(400).json({ message: range.error });

    const report = await buildReport(req.user._id, range, { name: req.user.name, email: req.user.email });

    return res.json(presentReport(report, { includeEntries: req.query.includeEntries === 'true' }));
  } catch (error) {
    return handleError(res, error);
  }
};

// US-27 (pdf) and US-28 (csv) - Export mood report
exports.exportMoodReport = async (req, res) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ message: `format must be one of: ${EXPORT_FORMATS.join(', ')}` });
    }

    const range = resolveRange(req.query, DEFAULT_REPORT_DAYS);
    if (range.error) return res.status(400).json({ message: range.error });

    const report = await buildReport(req.user._id, range, { name: req.user.name, email: req.user.email });
    return await sendExport(res, report, format);
  } catch (error) {
    return handleError(res, error);
  }
};

const shareUrlFor = (req, token) => {
  const base = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/api/mood-reports/shared/${token}`;
};

const sharePayload = (req, share) => ({
  _id: share._id,
  token: share.token,
  shareUrl: shareUrlFor(req, share.token),
  exportUrl: `${shareUrlFor(req, share.token)}/export`,
  range: { start: share.startKey, end: share.endKey },
  recipientNote: share.recipientNote || null,
  includeNotes: share.includeNotes,
  expiresAt: share.expiresAt,
  revokedAt: share.revokedAt,
  active: share.isUsable(),
  viewCount: share.viewCount,
  lastViewedAt: share.lastViewedAt,
  createdAt: share.createdAt,
});

// US-29 - Share mood report
exports.createMoodReportShare = async (req, res) => {
  try {
    const range = resolveRange(req.body, DEFAULT_REPORT_DAYS);
    if (range.error) return res.status(400).json({ message: range.error });

    const rawExpiry = req.body.expiresInDays;
    let expiresInDays = DEFAULT_SHARE_EXPIRY_DAYS;
    if (rawExpiry !== undefined) {
      expiresInDays = Number(rawExpiry);
      if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > MAX_SHARE_EXPIRY_DAYS) {
        return res.status(400).json({ message: `expiresInDays must be an integer between 1 and ${MAX_SHARE_EXPIRY_DAYS}` });
      }
    }

    if (req.body.recipientNote !== undefined && String(req.body.recipientNote).length > 300) {
      return res.status(400).json({ message: 'recipientNote cannot exceed 300 characters' });
    }

    const share = await MoodReportShare.create({
      userId: req.user._id,
      token: crypto.randomBytes(24).toString('hex'),
      startKey: range.startKey,
      endKey: range.endKey,
      recipientNote: req.body.recipientNote,
      includeNotes: req.body.includeNotes === true,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    return res.status(201).json({
      message: 'Share link created. Anyone with this link can view the report until it expires.',
      data: sharePayload(req, share),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listMoodReportShares = async (req, res) => {
  try {
    const shares = await MoodReportShare.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({
      items: shares.map((share) => sharePayload(req, share)),
      meta: { total: shares.length, active: shares.filter((share) => share.isUsable()).length },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.revokeMoodReportShare = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid share id' });
    }

    const share = await MoodReportShare.findOne({ _id: req.params.id, userId: req.user._id });
    if (!share) return res.status(404).json({ message: 'Share link not found' });

    if (!share.revokedAt) {
      share.revokedAt = new Date();
      await share.save();
    }

    return res.json({ message: 'Share link revoked', data: sharePayload(req, share) });
  } catch (error) {
    return handleError(res, error);
  }
};

const loadUsableShare = async (req, res) => {
  const share = await MoodReportShare.findOne({ token: req.params.token });
  if (!share) {
    res.status(404).json({ message: 'Share link not found' });
    return null;
  }
  if (share.revokedAt) {
    res.status(410).json({ message: 'This share link has been revoked' });
    return null;
  }
  if (share.expiresAt <= new Date()) {
    res.status(410).json({ message: 'This share link has expired' });
    return null;
  }
  return share;
};

const buildSharedReport = async (share) => {
  const owner = await User.findById(share.userId).select('name email');
  const report = await buildReport(
    share.userId,
    { startKey: share.startKey, endKey: share.endKey },
    { name: owner?.name, email: owner?.email }
  );
  return share.includeNotes ? report : stripNotes(report);
};

// Public: a recipient opens the shared report without a CareCircle account.
exports.getSharedMoodReport = async (req, res) => {
  try {
    const share = await loadUsableShare(req, res);
    if (!share) return undefined;

    const report = await buildSharedReport(share);

    share.viewCount += 1;
    share.lastViewedAt = new Date();
    await share.save();

    return res.json({
      sharedBy: report.owner.name,
      recipientNote: share.recipientNote || null,
      expiresAt: share.expiresAt,
      report: presentReport(report, { includeEntries: true, includeNotes: share.includeNotes }),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.exportSharedMoodReport = async (req, res) => {
  try {
    const format = String(req.query.format || 'pdf').toLowerCase();
    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ message: `format must be one of: ${EXPORT_FORMATS.join(', ')}` });
    }

    const share = await loadUsableShare(req, res);
    if (!share) return undefined;

    const report = await buildSharedReport(share);
    return await sendExport(res, report, format);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.isValidDate = isValidDate;
