const User = require('../models/User');
const StepLog = require('../models/StepLog');
const { STEP_PERMISSIONS } = require('../constants/goals');
const {
  handleError,
  validationFailed,
  toUserId,
  utcDateKey,
  applyStepsToGoals,
  evaluateAchievements,
  DEFAULT_DAILY_STEP_TARGET,
} = require('../services/goalTracking');

exports.getStepPermission = async (req, res) => {
  try {
    const user = await User.findById(toUserId(req)).select('stepSensorPermission stepSensorPermissionAt');
    return res.json({
      success: true,
      data: {
        permission: user?.stepSensorPermission || 'undetermined',
        requestedAt: user?.stepSensorPermissionAt || null,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateStepPermission = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const { permission } = req.body;
    if (!STEP_PERMISSIONS.includes(permission) || permission === 'undetermined') {
      return res.status(400).json({
        success: false,
        message: 'Permission must be granted or denied',
      });
    }

    const user = await User.findByIdAndUpdate(
      toUserId(req),
      { stepSensorPermission: permission, stepSensorPermissionAt: new Date() },
      { returnDocument: 'after' }
    ).select('stepSensorPermission stepSensorPermissionAt');

    return res.json({
      success: true,
      data: {
        permission: user.stepSensorPermission,
        requestedAt: user.stepSensorPermissionAt,
      },
      message: 'Step sensor permission updated',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.syncSteps = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const userId = toUserId(req);
    const { steps, delta, date, recordedAt, source = 'sensor' } = req.body;
    if (delta === undefined && steps === undefined) {
      return res.status(400).json({ success: false, message: 'steps or delta is required' });
    }
    const dateKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : utcDateKey(recordedAt ? new Date(recordedAt) : new Date());

    let log = await StepLog.findOne({ userId, date: dateKey });
    if (!log) {
      log = new StepLog({ userId, date: dateKey, steps: 0, samples: [] });
    }

    if (delta !== undefined) {
      const amount = Number(delta);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ success: false, message: 'delta must be a non-negative number' });
      }
      log.steps += amount;
      log.samples.push({ steps: amount, recordedAt: recordedAt ? new Date(recordedAt) : new Date(), source });
    } else {
      const amount = Number(steps);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ success: false, message: 'steps must be a non-negative number' });
      }
      log.steps = Math.max(log.steps, amount);
      log.samples.push({ steps: amount, recordedAt: recordedAt ? new Date(recordedAt) : new Date(), source });
    }

    if (log.samples.length > 50) log.samples = log.samples.slice(-50);
    log.lastRecordedAt = recordedAt ? new Date(recordedAt) : new Date();
    await log.save();

    const updatedGoals = await applyStepsToGoals(userId, log.steps, dateKey);
    await evaluateAchievements(userId);

    return res.json({
      success: true,
      data: {
        date: log.date,
        steps: log.steps,
        lastRecordedAt: log.lastRecordedAt,
        dailyTarget: updatedGoals[0]?.targetValue || DEFAULT_DAILY_STEP_TARGET,
        updatedGoals: updatedGoals.map((goal) => ({
          _id: goal._id,
          title: goal.title,
          progress: goal.progress,
          status: goal.status,
        })),
      },
      message: 'Step count synced',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getTodaySteps = async (req, res) => {
  try {
    const userId = toUserId(req);
    const dateKey = utcDateKey();
    const log = await StepLog.findOne({ userId, date: dateKey });
    const user = await User.findById(userId).select('stepSensorPermission');

    return res.json({
      success: true,
      data: {
        date: dateKey,
        steps: log?.steps || 0,
        lastRecordedAt: log?.lastRecordedAt || null,
        dailyTarget: DEFAULT_DAILY_STEP_TARGET,
        permission: user?.stepSensorPermission || 'undetermined',
        live: true,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
