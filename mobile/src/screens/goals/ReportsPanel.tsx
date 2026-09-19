import React from 'react';
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  GoalItem,
  WeeklyReport,
} from '@/services/api';

import {
  GOAL_BRAND,
  formatSteps,
  isStepGoal,
  progressCaption,
} from '@/constants/goals';

type Props = {
  report: WeeklyReport | null;
  goals: GoalItem[];
  todaySteps: {
    steps: number;
    dailyTarget: number;
  };
};

/* =========================================================
   ESCAPE HTML
========================================================= */

const escapeHtml = (value: unknown) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/* =========================================================
   REPORT PANEL
========================================================= */

export function ReportsPanel({
  report,
  goals,
  todaySteps,
}: Props) {
  const { width } =
    useWindowDimensions();

  const wide =
    width >= 900;

  /* =======================================================
     REPORT DATA
  ======================================================= */

  const thisWeek =
    report?.weekOverWeek.thisWeek;

  const lastWeek =
    report?.weekOverWeek.lastWeek;

  const completedDelta =
    report?.weekOverWeek.completedDelta ??
    0;

  const progressDelta =
    report?.weekOverWeek.progressDelta ??
    0;

  const trend =
    report?.fourWeekTrend ||
    [];

  const maxCompleted =
    Math.max(
      1,
      ...trend.map(
        (week) =>
          week.goalsCompleted ||
          0
      )
    );

  const last =
    trend[
      trend.length - 1
    ];

  const prev =
    trend[
      trend.length - 2
    ];

  const weekChange =
    prev &&
    prev.goalsTracked
      ? Math.round(
          (
            (
              (last?.goalsTracked ||
                0) -
              prev.goalsTracked
            ) /
            Math.max(
              1,
              prev.goalsTracked
            )
          ) * 100
        )
      : 0;

  /* =========================================================
     CREATE PDF HTML
  ========================================================= */

  const createReportHtml =
    async () => {

      const generatedDate =
        new Date().toLocaleDateString(
          'en-GB',
          {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }
        );

      /* =====================================================
         GOALS
      ===================================================== */

      const goalsHtml =
        goals.length > 0
          ? goals
              .map((goal) => {

                const progress =
                  Math.round(
                    goal.progress ||
                    0
                  );

                const completed =
                  goal.status ===
                  'completed';

                const details =
                  isStepGoal(goal)
                    ? `${formatSteps(
                        todaySteps.steps
                      )} avg`
                    : `${progressCaption(
                        goal
                      )}${
                        goal.targetValue
                          ? ' days'
                          : ''
                      }`;

                return `
                  <div class="goal-row">

                    <div class="goal-left">

                      <div
                        class="
                          goal-circle
                          ${
                            completed
                              ? 'completed-circle'
                              : ''
                          }
                        "
                      >
                        ${
                          completed
                            ? '✓'
                            : '○'
                        }
                      </div>

                      <div class="goal-info">

                        <div class="goal-title">
                          ${escapeHtml(
                            goal.title
                          )}
                        </div>

                        <div class="goal-details">
                          ${escapeHtml(
                            details
                          )}
                        </div>

                      </div>

                    </div>

                    <div class="goal-right">

                      ${
                        completed
                          ? `
                            <div
                              class="
                                completed-badge
                              "
                            >
                              ✓ Completed
                            </div>
                          `
                          : `
                            <div
                              class="
                                progress-number
                              "
                            >
                              ${progress}%
                            </div>
                          `
                      }

                    </div>

                  </div>
                `;
              })
              .join('')
          : `
              <div class="empty-goals">
                No goal history available yet.
              </div>
            `;

      /* =====================================================
         CHART
      ===================================================== */

      const chartHtml =
        trend.length > 0
          ? trend
              .map(
                (
                  week,
                  index
                ) => {

                  const completed =
                    week.goalsCompleted ||
                    0;

                  const height =
                    completed === 0
                      ? 8
                      : Math.max(
                          18,
                          Math.round(
                            (
                              completed /
                              maxCompleted
                            ) * 125
                          )
                        );

                  const active =
                    index ===
                    trend.length - 1;

                  return `
                    <div class="chart-column">

                      <div
                        class="
                          chart-value
                        "
                      >
                        ${completed}
                      </div>

                      <div
                        class="
                          chart-area
                        "
                      >

                        <div
                          class="
                            chart-bar
                            ${
                              active
                                ? 'active-bar'
                                : ''
                            }
                          "
                          style="
                            height:${height}px;
                          "
                        ></div>

                      </div>

                      <div
                        class="
                          chart-label
                        "
                      >
                        W${index + 1}
                      </div>

                    </div>
                  `;
                }
              )
              .join('')
          : `
              <div class="chart-empty">
                No weekly data available yet.
              </div>
            `;

      /* =====================================================
         HTML
      ===================================================== */

      return `
        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="UTF-8" />

          <title>
            CareCircle Progress Report
          </title>

          <style>

            @page {
              size: A4;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;

              width: 100%;
              height: 100%;

              background: #F2F8FC;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #163F63;

              -webkit-print-color-adjust:
                exact;

              print-color-adjust:
                exact;
            }

            /* =================================================
               A4
            ================================================= */

            .report {
              width: 794px;
              height: 1123px;

              overflow: hidden;

              background:
                #F2F8FC;

              position: relative;
            }

            /* =================================================
               SIMPLE REPORT HEADER
            ================================================= */

            .hero {
              height: 125px;
              background: #FFFFFF;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              position: relative;
              overflow: hidden;
            }

            .hero-image,
            .hero-shade {
              display: none;
            }

            .title-card {
              position: static;
              width: 100%;
              background: transparent;
              border-radius: 0;
              padding: 0;
              box-shadow: none;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .brand {
              color: #125789;
              font-size: 30px;
              font-weight: 800;
              line-height: 1.1;
            }

            .report-title {
              color: #2A638D;
              font-size: 17px;
              font-weight: 700;
              margin-top: 15px;
              padding-top: 12px;
              border-top: 3px solid #2C8BC4;
              width: 92%;
              text-align: center;
            }

            .quote,
            .heart {
              display: none;
            }

            /* =================================================
               DATE
            ================================================= */

            .date-bar {
              margin:
                -1px 30px 0;

              height:
                42px;

              border-radius:
                0 0 18px 18px;

              background:
                #E0F1FB;

              display:
                flex;

              align-items:
                center;

              justify-content:
                space-between;

              padding:
                0 17px;

              color:
                #376784;

              font-size:
                9px;
            }

            .date-main {
              font-weight:
                800;
            }

            /* =================================================
               CONTENT
            ================================================= */

            .content {
              padding:
                0 30px;
            }

            .section-title {
              color:
                #155A8E;

              font-size:
                18px;

              font-weight:
                800;

              margin-top:
                13px;

              margin-bottom:
                7px;
            }

            /* =================================================
               SUMMARY
            ================================================= */

            .summary {
              display:
                flex;

              gap:
                12px;
            }

            .summary-card {
              flex:
                1;

              height:
                91px;

              background:
                #FFFFFF;

              border:
                1px solid
                #D2E5F1;

              border-radius:
                15px;

              padding:
                11px 15px;
            }

            .summary-label {
              color:
                #617B8E;

              font-size:
                9px;

              font-weight:
                700;
            }

            .summary-value {
              color:
                #12466F;

              font-size:
                25px;

              font-weight:
                800;

              margin-top:
                2px;
            }

            .summary-was {
              color:
                #899AA6;

              font-size:
                8px;
            }

            .summary-change {
              display:
                inline-block;

              background:
                #E1F2FC;

              color:
                #12679B;

              border-radius:
                20px;

              padding:
                4px 9px;

              margin-top:
                4px;

              font-size:
                8px;

              font-weight:
                800;
            }

            /* =================================================
               CHART CARD
            ================================================= */

            .chart-card {
              height:
                171px;

              background:
                #FFFFFF;

              border:
                1px solid
                #D2E5F1;

              border-radius:
                15px;

              padding:
                12px 16px;
            }

            .chart-top {
              display:
                flex;

              justify-content:
                space-between;

              align-items:
                center;
            }

            .chart-description {
              color:
                #627B8E;

              font-size:
                9px;
            }

            .chart-total {
              color:
                #155B8E;

              font-weight:
                800;
            }

            .chart-change {
              color:
                #1981BA;

              font-weight:
                800;

              margin-left:
                5px;
            }

            .chart {
              height:
                137px;

              display:
                flex;

              align-items:
                flex-end;

              justify-content:
                space-around;

              padding:
                3px 65px 0;
            }

            .chart-column {
              height:
                125px;

              width:
                55px;

              display:
                flex;

              flex-direction:
                column;

              align-items:
                center;

              justify-content:
                flex-end;
            }

            .chart-value {
              color:
                #176292;

              font-size:
                10px;

              font-weight:
                800;

              height:
                14px;
            }

            .chart-area {
              height:
                100px;

              display:
                flex;

              align-items:
                flex-end;
            }

            .chart-bar {
              width:
                29px;

              background:
                #A9D4ED;

              border-radius:
                8px 8px 3px 3px;
            }

            .active-bar {
              background:
                ${GOAL_BRAND};
            }

            .chart-label {
              color:
                #607D91;

              font-size:
                9px;

              font-weight:
                800;

              margin-top:
                5px;
            }

            .chart-empty {
              width:
                100%;

              text-align:
                center;

              color:
                #8396A4;

              font-size:
                10px;

              padding-top:
                50px;
            }

            /* =================================================
               GOALS
            ================================================= */

            .goals-card {
              background:
                #FFFFFF;

              border:
                1px solid
                #D2E5F1;

              border-radius:
                15px;

              padding:
                2px 15px;
            }

            .goal-row {
              height:
                56px;

              display:
                flex;

              align-items:
                center;

              justify-content:
                space-between;

              border-bottom:
                1px solid
                #E5EEF4;
            }

            .goal-row:last-child {
              border-bottom:
                none;
            }

            .goal-left {
              display:
                flex;

              align-items:
                center;

              flex:
                1;
            }

            .goal-circle {
              width:
                31px;

              height:
                31px;

              border-radius:
                50%;

              background:
                #E5F3FC;

              color:
                #2C8AC3;

              display:
                flex;

              align-items:
                center;

              justify-content:
                center;

              font-size:
                15px;

              font-weight:
                800;

              margin-right:
                11px;
            }

            .completed-circle {
              background:
                #DDF3EC;

              color:
                #29947B;
            }

            .goal-title {
              color:
                #173F63;

              font-size:
                11px;

              font-weight:
                800;
            }

            .goal-details {
              color:
                #748A9A;

              font-size:
                8px;

              margin-top:
                2px;
            }

            .progress-number {
              background:
                #E4F3FC;

              color:
                #12679B;

              min-width:
                47px;

              text-align:
                center;

              border-radius:
                20px;

              padding:
                6px 9px;

              font-size:
                9px;

              font-weight:
                800;
            }

            .completed-badge {
              background:
                #DDF3EC;

              color:
                #277D6C;

              border-radius:
                20px;

              padding:
                6px 10px;

              font-size:
                9px;

              font-weight:
                800;
            }

            .empty-goals {
              color:
                #8395A3;

              font-size:
                10px;

              text-align:
                center;

              padding:
                20px;
            }

            /* =================================================
               STEPS
            ================================================= */

            .steps-card {
              height:
                67px;

              margin-top:
                11px;

              border-radius:
                14px;

              background:
                ${GOAL_BRAND};

              color:
                #FFFFFF;

              padding:
                10px 17px;

              display:
                flex;

              align-items:
                center;

              justify-content:
                space-between;
            }

            .steps-label {
              font-size:
                8px;

              font-weight:
                800;

              opacity:
                0.88;
            }

            .steps-value {
              font-size:
                23px;

              font-weight:
                800;

              margin-top:
                1px;
            }

            .steps-message {
              text-align:
                right;

              font-size:
                9px;

              line-height:
                1.4;
            }

            /* =================================================
               MOTIVATION
            ================================================= */

            .motivation {
              height:
                84px;

              margin-top:
                11px;

              border-radius:
                14px;

              background:
                #E1F2FB;

              padding:
                13px 17px;

              display:
                flex;

              align-items:
                center;

              justify-content:
                space-between;
            }

            .motivation-left {
              width:
                68%;
            }

            .motivation-title {
              color:
                #15598B;

              font-size:
                14px;

              font-weight:
                800;

              font-style:
                italic;
            }

            .motivation-description {
              color:
                #617C90;

              font-size:
                9px;

              line-height:
                1.4;

              margin-top:
                5px;
            }

            .motivation-right {
              text-align:
                right;
            }

            .motivation-heart {
              color:
                #2587C3;

              font-size:
                22px;
            }

            .keep-going {
              color:
                #17577F;

              font-size:
                10px;

              font-weight:
                800;

              margin-top:
                1px;
            }

            .every-step {
              color:
                #698296;

              font-size:
                8px;

              margin-top:
                3px;
            }

          </style>

        </head>

        <body>

          <!-- =================================================
               STANDALONE REPORT
          ================================================= -->

          <div
            id="carecircle-report"
            class="report"
          >

            <!-- =================================================
                 SIMPLE REPORT HEADER
            ================================================= -->

            <div class="hero">

              <div class="title-card">

                <div class="brand">
                  CareCircle
                </div>

                <div class="report-title">
                  Progress Report
                </div>

              </div>

            </div>


            <!-- =================================================
                 DATE
            ================================================= -->

            <div
              class="date-bar"
            >

              <div
                class="date-main"
              >
                📅 Report generated on
                ${generatedDate}
              </div>

              <div>
                Your progress,
                your journey.
              </div>

            </div>


            <div
              class="content"
            >

              <!-- =================================================
                   WEEKLY COMPARISON
              ================================================= -->

              <div
                class="section-title"
              >
                Weekly Comparison
              </div>

              <div
                class="summary"
              >

                <div
                  class="summary-card"
                >

                  <div
                    class="summary-label"
                  >
                    Goals completed
                  </div>

                  <div
                    class="summary-value"
                  >
                    ${
                      thisWeek
                        ?.goalsCompleted ??
                      0
                    }
                  </div>

                  <div
                    class="summary-was"
                  >
                    was ${
                      lastWeek
                        ?.goalsCompleted ??
                      0
                    }
                  </div>

                  <div
                    class="summary-change"
                  >
                    ${
                      completedDelta >=
                      0
                        ? `+${completedDelta}`
                        : completedDelta
                    }
                    vs last week
                  </div>

                </div>


                <div
                  class="summary-card"
                >

                  <div
                    class="summary-label"
                  >
                    Average progress
                  </div>

                  <div
                    class="summary-value"
                  >
                    ${
                      Math.round(
                        thisWeek
                          ?.averageProgress ||
                        0
                      )
                    }%
                  </div>

                  <div
                    class="summary-was"
                  >
                    was ${
                      Math.round(
                        lastWeek
                          ?.averageProgress ||
                        0
                      )
                    }%
                  </div>

                  <div
                    class="summary-change"
                  >
                    ${
                      progressDelta >=
                      0
                        ? `+${progressDelta}`
                        : progressDelta
                    }%
                    vs last week
                  </div>

                </div>

              </div>


              <!-- =================================================
                   LAST 4 WEEKS
              ================================================= -->

              <div
                class="section-title"
              >
                Last 4 Weeks
              </div>

              <div
                class="chart-card"
              >

                <div
                  class="chart-top"
                >

                  <div
                    class="chart-description"
                  >
                    Total goals this week:
                    <span
                      class="chart-total"
                    >
                      ${
                        last
                          ?.goalsTracked ??
                        0
                      }
                    </span>

                    ${
                      weekChange
                        ? `
                          <span
                            class="
                              chart-change
                            "
                          >
                            ${
                              weekChange >
                              0
                                ? '+'
                                : ''
                            }${weekChange}%
                          </span>
                        `
                        : ''
                    }

                  </div>

                </div>

                <div
                  class="chart"
                >
                  ${chartHtml}
                </div>

              </div>


              <!-- =================================================
                   PER GOAL
              ================================================= -->

              <div
                class="section-title"
              >
                Per-Goal Breakdown
              </div>

              <div
                class="goals-card"
              >
                ${goalsHtml}
              </div>


              <!-- =================================================
                   TODAY'S STEPS
              ================================================= -->

              <div
                class="steps-card"
              >

                <div>

                  <div
                    class="steps-label"
                  >
                    TODAY'S STEPS
                  </div>

                  <div
                    class="steps-value"
                  >
                    ${formatSteps(
                      todaySteps.steps
                    )}
                    /
                    ${formatSteps(
                      todaySteps.dailyTarget
                    )}
                  </div>

                </div>

                <div
                  class="steps-message"
                >
                  Keep moving toward<br />
                  your daily target.
                </div>

              </div>


              <!-- =================================================
                   MOTIVATIONAL SECTION
              ================================================= -->

              <div
                class="motivation"
              >

                <div
                  class="motivation-left"
                >

                  <div
                    class="motivation-title"
                  >
                    “You're doing better
                    than you think.”
                  </div>

                  <div
                    class="
                      motivation-description
                    "
                  >
                    Progress isn't about
                    perfection — it's about
                    showing up and taking
                    one step at a time.
                  </div>

                </div>


                <div
                  class="motivation-right"
                >

                  <div
                    class="
                      motivation-heart
                    "
                  >
                    ♥
                  </div>

                  <div
                    class="keep-going"
                  >
                    Keep going!
                  </div>

                  <div
                    class="every-step"
                  >
                    Every step matters.
                  </div>

                </div>

              </div>

            </div>

          </div>

        </body>

        </html>
      `;
    };

  /* =========================================================
     DIRECT WEB PDF DOWNLOAD
  ========================================================= */

  const downloadWebPdf =
    async (
      html: string
    ) => {

      /*
       * Import only on web.
       */
      const html2canvasModule =
        await import(
          'html2canvas'
        );

      const jsPdfModule =
        await import(
          'jspdf'
        );

      const html2canvas =
        html2canvasModule.default;

      const {
        jsPDF,
      } = jsPdfModule;

      /*
       * Create temporary
       * invisible container.
       */
      const container =
        document.createElement(
          'div'
        );

      container.innerHTML =
        html;

      container.style.position =
        'fixed';

      container.style.left =
        '-10000px';

      container.style.top =
        '0';

      container.style.width =
        '794px';

      container.style.height =
        '1123px';

      container.style.overflow =
        'hidden';

      document.body.appendChild(
        container
      );

      try {

        /*
         * Find report.
         */
        const reportElement =
          container.querySelector(
            '#carecircle-report'
          ) as HTMLElement;

        if (!reportElement) {
          throw new Error(
            'Report element was not created.'
          );
        }

        /*
         * Wait for the image.
         */
        const images =
          Array.from(
            reportElement.querySelectorAll(
              'img'
            )
          );

        await Promise.all(
          images.map(
            (img) =>
              new Promise<void>(
                (resolve) => {

                  if (
                    img.complete
                  ) {
                    resolve();

                    return;
                  }

                  img.onload =
                    () => resolve();

                  img.onerror =
                    () => resolve();

                }
              )
          )
        );

        /*
         * Allow browser layout
         * to finish.
         */
        await new Promise<void>(
          (resolve) => {
            setTimeout(
              resolve,
              300
            );
          }
        );

        /*
         * Capture ONLY the
         * standalone report.
         */
        const canvas =
          await html2canvas(
            reportElement,
            {
              scale: 2,

              width: 794,

              height: 1123,

              backgroundColor:
                '#F2F8FC',

              useCORS:
                false,

              allowTaint:
                true,

              logging:
                false,
            }
          );

        /*
         * Convert to image.
         */
        const image =
          canvas.toDataURL(
            'image/jpeg',
            0.95
          );

        /*
         * Create A4 PDF.
         */
        const pdf =
          new jsPDF({
            orientation:
              'portrait',

            unit:
              'mm',

            format:
              'a4',

            compress:
              true,
          });

        /*
         * A4 dimensions.
         */
        pdf.addImage(
          image,
          'JPEG',
          0,
          0,
          210,
          297,
          undefined,
          'FAST'
        );

        /*
         * DIRECT DOWNLOAD.
         */
        pdf.save(
          'carecircle-progress-report.pdf'
        );

      } finally {

        document.body.removeChild(
          container
        );
      }
    };

  /* =========================================================
     DOWNLOAD
  ========================================================= */

  const download =
    async () => {

      try {

        const html =
          await createReportHtml();

        /* ===================================================
           WEB
           
           DIRECT DOWNLOAD
        =================================================== */

        if (
          Platform.OS === 'web'
        ) {

          await downloadWebPdf(
            html
          );

          return;
        }

        /* ===================================================
           ANDROID / IOS
        =================================================== */

        const {
          uri,
        } =
          await Print.printToFileAsync({
            html,
          });

        if (
          await Sharing.isAvailableAsync()
        ) {

          await Sharing.shareAsync(
            uri,
            {
              mimeType:
                'application/pdf',

              dialogTitle:
                'CareCircle Progress Report',

              UTI:
                'com.adobe.pdf',
            }
          );

        } else {

          await Share.share({
            title:
              'CareCircle Progress Report',

            message:
              'CareCircle Progress Report',

            url:
              uri,
          });

        }

      } catch (error: any) {

        console.error(
          'PDF export error:',
          error
        );

        Alert.alert(
          'Export failed',
          error?.message ||
            'Unable to create the PDF report.'
        );
      }
    };

  /* =========================================================
     EXISTING SCREEN
  ========================================================= */

  return (
    <View
      style={[
        styles.page,
        wide &&
          styles.pageWide,
      ]}
    >

      <Text
        style={
          styles.kicker
        }
      >
        WEEKLY COMPARISON
      </Text>


      <View
        style={[
          styles.row,
          wide &&
            styles.rowWide,
        ]}
      >

        <View
          style={
            styles.card
          }
        >

          <Text
            style={
              styles.cardLabel
            }
          >
            Goals completed
          </Text>

          <Text
            style={
              styles.cardValue
            }
          >
            {
              thisWeek
                ?.goalsCompleted ??
              0
            }
          </Text>

          <Text
            style={
              styles.cardSub
            }
          >
            was{' '}
            {
              lastWeek
                ?.goalsCompleted ??
              0
            }
          </Text>

          <Text
            style={
              styles.delta
            }
          >
            {
              completedDelta >=
              0
                ? `+${completedDelta}`
                : completedDelta
            }{' '}
            vs last wk
          </Text>

        </View>


        <View
          style={
            styles.card
          }
        >

          <Text
            style={
              styles.cardLabel
            }
          >
            Avg. progress
          </Text>

          <Text
            style={
              styles.cardValue
            }
          >
            {
              Math.round(
                thisWeek
                  ?.averageProgress ||
                0
              )
            }%
          </Text>

          <Text
            style={
              styles.cardSub
            }
          >
            was{' '}
            {
              Math.round(
                lastWeek
                  ?.averageProgress ||
                0
              )
            }%
          </Text>

          <Text
            style={
              styles.delta
            }
          >
            {
              progressDelta >=
              0
                ? `+${progressDelta}`
                : progressDelta
            }%
            vs last wk
          </Text>

        </View>

      </View>


      <View
        style={
          styles.chartCard
        }
      >

        <View
          style={
            styles.chartHead
          }
        >

          <Text
            style={
              styles.kicker
            }
          >
            LAST 4 WEEKS
          </Text>

          <Text
            style={
              styles.chartHint
            }
          >
            Total goals this week:{' '}
            {
              last
                ?.goalsTracked ??
              0
            }

            {
              weekChange
                ? ` (${
                    weekChange >
                    0
                      ? '+'
                      : ''
                  }${weekChange}%)`
                : ''
            }

          </Text>

        </View>


        <View
          style={
            styles.chart
          }
        >

          {trend.map(
            (
              week,
              index
            ) => {

              const height =
                Math.max(
                  8,
                  Math.round(
                    (
                      (
                        week.goalsCompleted ||
                        0
                      ) /
                      maxCompleted
                    ) * 110
                  )
                );

              const active =
                index ===
                trend.length - 1;

              return (
                <View
                  key={`${week.start}-${index}`}
                  style={
                    styles.barCol
                  }
                >

                  <View
                    style={
                      styles.barTrack
                    }
                  >

                    <View
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor:
                            active
                              ? GOAL_BRAND
                              : '#C5D8E8',
                        },
                      ]}
                    />

                  </View>

                  <Text
                    style={
                      styles.barLabel
                    }
                  >
                    W{index + 1}
                  </Text>

                </View>
              );
            }
          )}

        </View>

      </View>


      <Text
        style={
          styles.kicker
        }
      >
        PER-GOAL BREAKDOWN
      </Text>


      {goals.map(
        (goal) => (

          <View
            key={
              goal._id
            }
            style={
              styles.breakCard
            }
          >

            <View
              style={{
                flex: 1,
              }}
            >

              <Text
                style={
                  styles.breakTitle
                }
              >
                {
                  goal.title
                }
              </Text>

              <Text
                style={
                  styles.breakMeta
                }
              >

                {
                  isStepGoal(
                    goal
                  )
                    ? `${formatSteps(
                        todaySteps.steps
                      )} avg`
                    : `${progressCaption(
                        goal
                      )}${
                        goal.targetValue
                          ? ` days`
                          : ''
                      }`
                }

              </Text>

            </View>


            {
              goal.status ===
              'completed'
                ? (

                  <View
                    style={
                      styles.done
                    }
                  >

                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={
                        GOAL_BRAND
                      }
                    />

                    <Text
                      style={
                        styles.doneText
                      }
                    >
                      Completed
                    </Text>

                  </View>

                )
                : (

                  <Text
                    style={
                      styles.breakHint
                    }
                  >
                    {
                      Math.round(
                        goal.progress ||
                        0
                      )
                    }%
                  </Text>

                )
            }

          </View>
        )
      )}


      {
        goals.length ===
        0 ? (
          <Text
            style={
              styles.empty
            }
          >
            No goal history
            to chart yet.
          </Text>
        ) : null
      }


      <TouchableOpacity
        style={
          styles.download
        }
        onPress={
          download
        }
        activeOpacity={
          0.85
        }
      >

        <Ionicons
          name="document-text-outline"
          size={18}
          color="#FFFFFF"
        />

        <Text
          style={
            styles.downloadText
          }
        >
          Download report (PDF)
        </Text>

      </TouchableOpacity>

    </View>
  );
}


/* ===========================================================
   EXISTING SCREEN STYLES
=========================================================== */

const styles =
  StyleSheet.create({

    page: {
      paddingHorizontal:
        16,

      paddingTop:
        18,

      paddingBottom:
        36,
    },

    pageWide: {
      maxWidth:
        980,

      width:
        '100%',

      alignSelf:
        'center',
    },

    kicker: {
      fontSize:
        12,

      fontWeight:
        '800',

      color:
        '#7A828C',

      letterSpacing:
        0.8,

      marginBottom:
        10,
    },

    row: {
      flexDirection:
        'row',

      gap:
        10,

      marginBottom:
        16,
    },

    rowWide: {
      maxWidth:
        640,
    },

    card: {
      flex:
        1,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        16,

      padding:
        16,

      borderWidth:
        1,

      borderColor:
        '#E7ECF1',
    },

    cardLabel: {
      color:
        '#6B7380',

      fontWeight:
        '700',
    },

    cardValue: {
      fontSize:
        28,

      fontWeight:
        '800',

      color:
        '#1C242C',

      marginTop:
        6,
    },

    cardSub: {
      color:
        '#8A929C',

      marginTop:
        4,
    },

    delta: {
      color:
        GOAL_BRAND,

      fontWeight:
        '800',

      marginTop:
        8,
    },

    chartCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        16,

      padding:
        16,

      borderWidth:
        1,

      borderColor:
        '#E7ECF1',

      marginBottom:
        18,
    },

    chartHead: {
      marginBottom:
        12,
    },

    chartHint: {
      color:
        '#6B7380',

      marginTop:
        4,
    },

    chart: {
      flexDirection:
        'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-around',

      height:
        150,

      paddingTop:
        8,
    },

    barCol: {
      alignItems:
        'center',

      flex:
        1,
    },

    barTrack: {
      height:
        110,

      justifyContent:
        'flex-end',
    },

    bar: {
      width:
        28,

      borderRadius:
        8,
    },

    barLabel: {
      marginTop:
        8,

      fontWeight:
        '700',

      color:
        '#6B7380',
    },

    breakCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        14,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        '#E7ECF1',

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        8,
    },

    breakTitle: {
      fontWeight:
        '800',

      color:
        '#1C242C',
    },

    breakMeta: {
      color:
        '#6B7380',

      marginTop:
        4,
    },

    breakHint: {
      fontWeight:
        '800',

      color:
        GOAL_BRAND,
    },

    done: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    doneText: {
      color:
        GOAL_BRAND,

      fontWeight:
        '700',

      fontSize:
        12,
    },

    empty: {
      textAlign:
        'center',

      color:
        '#7A828C',

      marginVertical:
        12,
    },

    download: {
      marginTop:
        16,

      backgroundColor:
        GOAL_BRAND,

      borderRadius:
        14,

      paddingVertical:
        16,

      alignItems:
        'center',

      flexDirection:
        'row',

      justifyContent:
        'center',

      gap:
        8,
    },

    downloadText: {
      color:
        '#FFFFFF',

      fontWeight:
        '800',

      fontSize:
        16,
    },

  });