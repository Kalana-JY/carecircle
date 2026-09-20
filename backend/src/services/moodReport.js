const PDFDocument = require('pdfkit');
const {
  dateKey,
  daysBetween,
  fetchEntries,
  summarize,
  weeklyBuckets,
  monthlyBuckets,
  trendDirection,
  analysePatterns,
  correlate,
  dayOfWeekBreakdown,
  buildInsights,
  round2,
} = require('./moodInsights');
const { MOOD_SCORE_MAX, MAX_CORRELATION_ITEMS } = require('../constants/moods');

const csvEscape = (value) => {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const weeksSpanning = (startKey, endKey) => Math.max(1, Math.ceil((daysBetween(startKey, endKey) + 1) / 7));

const monthsSpanning = (startKey, endKey) => {
  const [startYear, startMonth] = startKey.split('-').map(Number);
  const [endYear, endMonth] = endKey.split('-').map(Number);
  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
};

const buildReport = async (userId, { startKey, endKey }, owner = {}) => {
  const entries = await fetchEntries(userId, { startKey, endKey });
  const summary = summarize(entries);
  const patterns = analysePatterns(entries);
  const weeks = weeklyBuckets(entries, weeksSpanning(startKey, endKey), new Date(`${endKey}T00:00:00.000Z`));
  const months = monthlyBuckets(entries, monthsSpanning(startKey, endKey), new Date(`${endKey}T00:00:00.000Z`));
  const activities = correlate(entries, 'activities');
  const tags = correlate(entries, 'tags');
  const trend = trendDirection(weeks);

  return {
    generatedAt: new Date().toISOString(),
    owner: {
      name: owner.name || null,
      email: owner.email || null,
    },
    range: {
      start: startKey,
      end: endKey,
      days: daysBetween(startKey, endKey) + 1,
    },
    summary,
    trend,
    weeks: weeks.map(({ days, ...rest }) => rest),
    months,
    byDayOfWeek: patterns.byDayOfWeek,
    topActivities: activities.slice(0, MAX_CORRELATION_ITEMS),
    drainingActivities: activities.filter((item) => item.impact < 0).slice(-MAX_CORRELATION_ITEMS).reverse(),
    topTags: tags.slice(0, MAX_CORRELATION_ITEMS),
    streaks: patterns.streaks,
    insights: buildInsights({
      summary,
      activities,
      tags,
      byDayOfWeek: dayOfWeekBreakdown(entries),
      trend,
    }),
    entryCount: entries.length,
    entries,
  };
};

const toCsv = (report) => {
  const rows = [
    ['CareCircle Mood Report'],
    ['Generated At', report.generatedAt],
    ['Range', `${report.range.start} to ${report.range.end}`],
    ['Total Entries', report.summary.entryCount],
    ['Average Score', report.summary.averageScore],
    ['Highest Score', report.summary.highestScore],
    ['Lowest Score', report.summary.lowestScore],
    ['Positive %', report.summary.positiveRate],
    ['Negative %', report.summary.negativeRate],
    ['Trend', report.trend.direction],
    [],
    ['Date', 'Mood', 'Score', 'Valence', 'Intensity', 'Activities', 'Tags', 'Notes'],
  ];

  report.entries.forEach((entry) => {
    rows.push([
      entry.dateKey,
      entry.mood,
      entry.score,
      entry.valence,
      entry.intensity ?? '',
      (entry.activities || []).join('; '),
      (entry.tags || []).join('; '),
      entry.notes || '',
    ]);
  });

  rows.push([], ['Weekly Averages'], ['Week Start', 'Week End', 'Entries', 'Average Score', 'Dominant Mood']);
  report.weeks.forEach((week) => {
    rows.push([week.weekStart, week.weekEnd, week.entryCount, week.averageScore, week.dominantMood?.mood || '']);
  });

  rows.push([], ['Insights']);
  report.insights.forEach((insight) => rows.push([insight]));

  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
};

const toPdf = (report) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const line = (label, value) => {
      doc.font('Helvetica-Bold').fontSize(10).text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(String(value));
    };

    const heading = (text) => {
      if (doc.y > 700) doc.addPage();
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#1f4e5f').text(text);
      doc.fillColor('#000000').moveDown(0.3);
    };

    doc.font('Helvetica-Bold').fontSize(20).text('CareCircle Mood Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#555555')
      .text(`${report.range.start} to ${report.range.end} (${report.range.days} days)`, { align: 'center' });
    if (report.owner.name) doc.text(`Prepared for ${report.owner.name}`, { align: 'center' });
    doc.text(`Generated ${new Date(report.generatedAt).toUTCString()}`, { align: 'center' });
    doc.fillColor('#000000').moveDown(1);

    heading('Summary');
    line('Total entries', report.summary.entryCount);
    line('Average mood score', `${report.summary.averageScore} / ${MOOD_SCORE_MAX}`);
    line('Highest score', report.summary.highestScore);
    line('Lowest score', report.summary.lowestScore);
    line('Positive entries', `${report.summary.positiveRate}%`);
    line('Negative entries', `${report.summary.negativeRate}%`);
    line('Day-to-day variability', report.summary.volatility);
    line('Most frequent mood', report.summary.dominantMood?.mood || 'n/a');
    line('Overall trend', report.trend.direction.replace('_', ' '));

    heading('Mood distribution');
    const distributionEntries = Object.entries(report.summary.distribution);
    if (distributionEntries.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No entries in this period.');
    } else {
      distributionEntries
        .sort((a, b) => b[1] - a[1])
        .forEach(([mood, count]) => {
          const share = report.summary.entryCount ? round2((count / report.summary.entryCount) * 100) : 0;
          doc.font('Helvetica').fontSize(10).text(`${mood}: ${count} (${share}%)`);
        });
    }

    heading('Weekly averages');
    if (report.weeks.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No weekly data available.');
    } else {
      report.weeks.forEach((week) => {
        doc.font('Helvetica').fontSize(10)
          .text(`${week.weekStart} to ${week.weekEnd} - ${week.entryCount} entries, average ${week.averageScore}`);
      });
    }

    if (report.topActivities.length) {
      heading('Activities linked to your mood');
      report.topActivities.forEach((item) => {
        const direction = item.impact >= 0 ? '+' : '';
        doc.font('Helvetica').fontSize(10)
          .text(`${item.value}: average ${item.averageScore} (${direction}${item.impact} vs overall, ${item.entryCount} entries)`);
      });
    }

    heading('Insights');
    report.insights.forEach((insight) => {
      doc.font('Helvetica').fontSize(10).text(`- ${insight}`, { width: 495 });
    });

    doc.moveDown(1.5);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#777777')
      .text(
        'This report is self-reported wellbeing data from CareCircle. It is not a clinical assessment and should be interpreted alongside professional advice.',
        { width: 495, align: 'center' }
      );

    doc.end();
  });

module.exports = { buildReport, toCsv, toPdf, csvEscape };
