const PDFDocument = require('pdfkit');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Builds a PDF Buffer of the session history / past log
 */
const generateSessionPdfBuffer = async ({ user, role, period, year, month, sessions }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const isSupporter = role === 'supporter';
      const periodLabel = period === 'monthly'
        ? `${MONTH_NAMES[month - 1]} ${year}`
        : `Full Year ${year}`;

      const title = isSupporter
        ? 'Peer Supporter Session Log'
        : 'Session History Report';

      // --- 1. HEADER SECTION ---
      doc.rect(36, 36, 523, 72).fill('#245B8B');

      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('CareCircle', 52, 48);

      doc.font('Helvetica')
        .fontSize(12)
        .text(title, 52, 74);

      doc.fontSize(10)
        .text(periodLabel, 52, 90, { align: 'right', width: 490 });

      doc.moveDown(2);
      doc.y = 120;

      // --- 2. USER & REPORT METADATA ---
      doc.fillColor('#1C2024')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Account: ', 36, doc.y, { continued: true })
        .font('Helvetica')
        .text(`${user.name || 'User'} (${user.email || ''})`);

      doc.font('Helvetica-Bold')
        .text('Role: ', { continued: true })
        .font('Helvetica')
        .text(isSupporter ? 'Certified Peer Supporter' : 'Community Member');

      doc.font('Helvetica-Bold')
        .text('Report Period: ', { continued: true })
        .font('Helvetica')
        .text(periodLabel);

      doc.font('Helvetica-Bold')
        .text('Generated On: ', { continued: true })
        .font('Helvetica')
        .text(new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));

      doc.moveDown(1.2);

      // --- 3. SUMMARY METRICS ---
      const totalCount = sessions.length;
      let completedCount = 0;
      let cancelledCount = 0;
      let onlineCount = 0;
      let physicalCount = 0;
      let totalMinutes = 0;

      sessions.forEach((s) => {
        if (s.status === 'completed' || (s.status === 'booked' && new Date(s.endTime) < new Date())) {
          completedCount++;
        } else if (s.status === 'cancelled') {
          cancelledCount++;
        }
        if (s.sessionType === 'physical') {
          physicalCount++;
        } else {
          onlineCount++;
        }

        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          totalMinutes += Math.round((end - start) / 60000);
        }
      });

      const totalHours = (totalMinutes / 60).toFixed(1);

      const summaryY = doc.y;
      const boxWidth = 98;
      const boxHeight = 48;
      const gap = 8;

      const metrics = [
        { label: 'Total Sessions', value: totalCount },
        { label: 'Completed', value: completedCount },
        { label: 'Cancelled', value: cancelledCount },
        { label: 'Total Hours', value: `${totalHours} hrs` },
        { label: 'Online / In-Person', value: `${onlineCount} / ${physicalCount}` },
      ];

      metrics.forEach((m, idx) => {
        const x = 36 + idx * (boxWidth + gap);
        doc.roundedRect(x, summaryY, boxWidth, boxHeight, 6)
          .fillAndStroke('#F1F5F9', '#CBD5E1');

        doc.fillColor('#64748B')
          .font('Helvetica')
          .fontSize(7.5)
          .text(m.label, x + 4, summaryY + 8, { width: boxWidth - 8, align: 'center' });

        doc.fillColor('#0F172A')
          .font('Helvetica-Bold')
          .fontSize(13)
          .text(String(m.value), x + 4, summaryY + 24, { width: boxWidth - 8, align: 'center' });
      });

      doc.y = summaryY + boxHeight + 20;

      // --- 4. ITEMISED SESSIONS LOG TABLE ---
      doc.fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Session Log Details', 36, doc.y);

      doc.moveDown(0.5);

      const startTableY = doc.y;

      // Table Headers
      const colX = {
        date: 36,
        time: 110,
        title: 175,
        partner: 300,
        format: 420,
        status: 495,
      };

      const drawTableHeader = (currY) => {
        doc.rect(36, currY, 523, 20).fill('#E2E8F0');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8);
        doc.text('DATE', colX.date + 4, currY + 6);
        doc.text('TIME', colX.time, currY + 6);
        doc.text('SESSION TITLE', colX.title, currY + 6);
        doc.text(isSupporter ? 'MEMBER' : 'SUPPORTER', colX.partner, currY + 6);
        doc.text('FORMAT', colX.format, currY + 6);
        doc.text('STATUS', colX.status, currY + 6);
      };

      drawTableHeader(startTableY);
      doc.y = startTableY + 22;

      if (sessions.length === 0) {
        doc.rect(36, doc.y, 523, 36).fill('#F8FAFC');
        doc.fillColor('#64748B')
          .font('Helvetica')
          .fontSize(10)
          .text('No sessions recorded for this time period.', 40, doc.y + 12, { align: 'center', width: 515 });
        doc.y += 40;
      } else {
        sessions.forEach((s, i) => {
          // Check for page break
          if (doc.y > 740) {
            doc.addPage();
            doc.y = 40;
            drawTableHeader(doc.y);
            doc.y += 22;
          }

          const start = new Date(s.startTime);
          const end = new Date(s.endTime);
          const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

          const partner = isSupporter
            ? (s.userId?.name || (s.status === 'booked' ? 'Booked Member' : 'Unbooked Slot'))
            : (s.supporterId?.name || 'Peer Supporter');

          const formatText = s.sessionType === 'physical'
            ? `In-Person (${s.venue ? s.venue.slice(0, 16) : 'Venue'})`
            : 'Online Video';

          let statusLabel = 'Available';
          let statusColor = '#16A34A';
          if (s.status === 'cancelled') {
            statusLabel = 'Cancelled';
            statusColor = '#DC2626';
          } else if (s.status === 'completed' || (s.status === 'booked' && end < new Date())) {
            statusLabel = 'Completed';
            statusColor = '#16A34A';
          } else if (s.status === 'booked') {
            statusLabel = 'Booked';
            statusColor = '#2563EB';
          } else if (end < new Date()) {
            statusLabel = 'Expired';
            statusColor = '#64748B';
          }

          const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, doc.y, 523, 24).fill(rowBg);

          doc.fillColor('#1E293B').font('Helvetica').fontSize(7.5);
          doc.text(dateStr, colX.date + 4, doc.y + 7, { width: 70 });
          doc.text(timeStr, colX.time, doc.y + 7, { width: 62 });
          doc.text(s.title || 'Support Session', colX.title, doc.y + 7, { width: 120, ellipsis: true });
          doc.text(partner, colX.partner, doc.y + 7, { width: 115, ellipsis: true });
          doc.text(formatText, colX.format, doc.y + 7, { width: 72, ellipsis: true });

          doc.fillColor(statusColor).font('Helvetica-Bold');
          doc.text(statusLabel, colX.status, doc.y + 7, { width: 60 });

          doc.y += 24;
        });
      }

      // --- 5. DISCLAIMER & FOOTER ---
      if (doc.y > 740) {
        doc.addPage();
        doc.y = 40;
      } else {
        doc.moveDown(1.5);
      }

      doc.fillColor('#94A3B8')
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .text(
          'Confidential Record: CareCircle Peer Support Sessions provide confidential community support. This document is for personal record-keeping and is not a clinical assessment.',
          36,
          doc.y,
          { width: 523, align: 'center' }
        );

      // Add page numbering across all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94A3B8')
          .font('Helvetica')
          .fontSize(7.5)
          .text(`Page ${i + 1} of ${pages.count} • CareCircle Health Technologies`, 36, 800, {
            align: 'center',
            width: 523,
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateSessionPdfBuffer,
};
