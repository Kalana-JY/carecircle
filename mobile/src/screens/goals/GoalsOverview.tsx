import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  GoalDashboard,
  GoalHistoryRow,
  GoalItem,
  goalApi,
} from '@/services/api';

import {
  StepSnapshot,
  saveManualSteps,
} from '@/services/steps';

import {
  GOAL_BRAND,
  GOAL_FILTERS,
  formatSteps,
  isStepGoal,
  progressCaption,
  toDisplayDate,
  tonightAt,
} from '@/constants/goals';

type FilterKey =
  (typeof GOAL_FILTERS)[number]['key'];

type Props = {
  goals: GoalItem[];
  dashboard: GoalDashboard | null;
  todaySteps: StepSnapshot;
  error?: string | null;

  onCreate: () => void;
  onEdit: (goal: GoalItem) => void;

  onChanged: () =>
    | Promise<void>
    | void;

  onStepsChanged: (
    snapshot: StepSnapshot
  ) => void;
};

export function GoalsOverview({
  goals,
  dashboard,
  todaySteps,
  error,
  onCreate,
  onEdit,
  onChanged,
  onStepsChanged,
}: Props) {
  const { width } = useWindowDimensions();

  const wide = width >= 900;

  const [
    filter,
    setFilter,
  ] = useState<FilterKey>('all');

  const [
    historyGoal,
    setHistoryGoal,
  ] = useState<GoalItem | null>(null);

  const [
    historyRows,
    setHistoryRows,
  ] = useState<GoalHistoryRow[]>([]);

  const [
    busyId,
    setBusyId,
  ] = useState<string | null>(null);

  const [
    manualSteps,
    setManualSteps,
  ] = useState(
    String(todaySteps.steps || 0)
  );

  /* ---------------- STEP DATA ---------------- */

  useEffect(() => {
    setManualSteps(
      String(todaySteps.steps || 0)
    );
  }, [todaySteps.steps]);

  /* ---------------- FILTER ---------------- */

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return goals;
    }

    if (filter === 'active') {
      return goals.filter(
        (goal) =>
          goal.status === 'active' ||
          goal.status === 'in_progress' ||
          goal.status === 'overdue'
      );
    }

    return goals.filter(
      (goal) =>
        goal.status === filter
    );
  }, [filter, goals]);

  /* ---------------- STEPS ---------------- */

  const target =
    todaySteps.dailyTarget || 8000;

  const steps =
    todaySteps.steps || 0;

  const stepPct =
    target > 0
      ? Math.min(
          100,
          Math.round(
            (steps / target) * 100
          )
        )
      : 0;

  const goalReached =
    steps >= target &&
    target > 0;

  /* ---------------- HISTORY ---------------- */

  const openHistory = async (
    goal: GoalItem
  ) => {
    setHistoryGoal(goal);

    try {
      const response =
        await goalApi.history(
          goal._id
        );

      setHistoryRows(
        response.data || []
      );
    } catch {
      setHistoryRows([]);
    }
  };

  /* ---------------- DELETE ---------------- */

  const deleteGoal = async (
    goal: GoalItem
  ) => {
    setBusyId(goal._id);

    try {
      console.log(
        'Deleting goal:',
        goal._id
      );

      await goalApi.remove(
        goal._id
      );

      console.log(
        'Goal deleted:',
        goal._id
      );

      await onChanged();
    } catch (err: any) {
      console.error(
        'Delete goal error:',
        err
      );

      Alert.alert(
        'Could not delete',
        err?.message ||
          'Unable to delete this goal. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (
    goal: GoalItem
  ) => {
    // React Native Alert.alert does not behave
    // reliably as a confirmation dialog on web.
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      const confirmed =
        window.confirm(
          `Delete "${goal.title}"?\n\nThis goal will be permanently removed.`
        );

      if (confirmed) {
        deleteGoal(goal);
      }

      return;
    }

    Alert.alert(
      'Delete this goal?',
      `“${goal.title}” will be removed permanently.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteGoal(goal),
        },
      ]
    );
  };

  /* ---------------- REMINDER ---------------- */

  const toggleReminder = async (
    goal: GoalItem
  ) => {
    setBusyId(goal._id);

    try {
      try {
        await goalApi.getReminder(
          goal._id
        );

        Alert.alert(
          'Daily reminder',
          'This goal already has a reminder. Cancel it?',
          [
            {
              text: 'Keep',
              style: 'cancel',
            },

            {
              text: 'Cancel reminder',
              style: 'destructive',

              onPress: async () => {
                await goalApi.cancelReminder(
                  goal._id
                );

                Alert.alert(
                  'Reminder off',
                  'You will not get a nudge for this goal.'
                );
              },
            },
          ]
        );
      } catch {
        await goalApi.createReminder(
          goal._id,
          {
            remindAt: tonightAt(20),
            frequency: 'daily',
            message:
              `Time to work on ${goal.title}`,
          }
        );

        Alert.alert(
          'Reminder on',
          'You’ll get a gentle nudge at 8:00 PM.'
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Reminder',
        err.message ||
          'Unable to update reminder.'
      );
    } finally {
      setBusyId(null);
    }
  };

  /* ---------------- MARK TODAY DONE ---------------- */

  const markTodayDone = async (
    goal: GoalItem
  ) => {
    setBusyId(goal._id);

    try {
      await goalApi.logProgress(
        goal._id,
        1,
        'Marked today done'
      );

      await onChanged();
    } catch (err: any) {
      Alert.alert(
        'Could not update',
        err.message ||
          'Try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  /* ---------------- PAUSE ---------------- */

  const togglePaused = async (
    goal: GoalItem
  ) => {
    const paused =
      goal.status === 'paused';

    setBusyId(goal._id);

    try {
      await goalApi.updateStatus(
        goal._id,
        paused
          ? 'in_progress'
          : 'paused'
      );

      await onChanged();
    } catch (err: any) {
      Alert.alert(
        'Could not update status',
        err.message ||
          'Try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  /* ---------------- MANUAL STEPS ---------------- */

  const submitManualSteps =
    async () => {
      const amount = Number(
        manualSteps.replace(/,/g, '')
      );

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        Alert.alert(
          'Steps',
          'Enter a number of 0 or more.'
        );

        return;
      }

      try {
        const snapshot =
          await saveManualSteps(
            amount
          );

        onStepsChanged(snapshot);

        await onChanged();
      } catch (err: any) {
        Alert.alert(
          'Could not save steps',
          err.message ||
            'Try again.'
        );
      }
    };

  /* ---------------- SECTION TITLE ---------------- */

  const sectionTitle =
    filter === 'completed'
      ? 'COMPLETED'
      : filter === 'paused'
      ? 'PAUSED'
      : 'IN PROGRESS';

  /* ---------------- UI ---------------- */

  return (
    <View
      style={[
        styles.page,
        wide && styles.pageWide,
      ]}
    >

      {/* ================================================= */}
      {/* PAGE TITLE */}
      {/* ================================================= */}

      <View style={styles.headingRow}>

        <Text style={styles.heading}>
          Your goals
        </Text>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={onCreate}
          activeOpacity={0.85}
        >
          <Text style={styles.createText}>
            Create Goal
          </Text>
        </TouchableOpacity>

      </View>


      {/* ================================================= */}
      {/* FILTERS */}
      {/* ================================================= */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filters
        }
      >
        {GOAL_FILTERS.map(
          (item) => {
            const selected =
              filter === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() =>
                  setFilter(item.key)
                }
                style={[
                  styles.chip,
                  selected &&
                    styles.chipActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected &&
                      styles.chipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </ScrollView>


      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}


      {/* ================================================= */}
      {/* SUMMARY CARDS */}
      {/* ================================================= */}

      <View
        style={[
          styles.summaryRow,
          wide &&
            styles.summaryRowWide,
        ]}
      >

        {/* ACTIVE GOALS */}

        <View style={styles.summaryCard}>

          <View>
            <Text
              style={
                styles.summaryValue
              }
            >
              {dashboard?.activeGoals
                .count ??
                goals.filter(
                  (g) =>
                    g.status !==
                      'completed' &&
                    g.status !==
                      'paused'
                ).length}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Active goals
            </Text>
          </View>

          <View
            style={
              styles.summaryIconBlue
            }
          >
            <Ionicons
              name="radio-button-on-outline"
              size={20}
              color={GOAL_BRAND}
            />
          </View>

        </View>


        {/* DAY STREAK */}

        <View style={styles.summaryCard}>

          <View>
            <Text
              style={
                styles.summaryValue
              }
            >
              {dashboard?.streaks
                .current ?? 0}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Day streak
            </Text>
          </View>

          <View
            style={
              styles.summaryIconOrange
            }
          >
            <Ionicons
              name="flame"
              size={20}
              color="#E67A2A"
            />
          </View>

        </View>

      </View>


      {/* ================================================= */}
      {/* TODAY'S STEPS */}
      {/* ================================================= */}

      <View
        style={styles.stepsCard}
      >

        <View
          style={
            styles.stepsContent
          }
        >

          <Text
            style={
              styles.stepsEyebrow
            }
          >
            Today's steps
          </Text>

          <Text
            style={styles.stepsCount}
          >
            {formatSteps(steps)}

            <Text
              style={
                styles.stepsTarget
              }
            >
              {' '}
              / {formatSteps(target)}
            </Text>
          </Text>


          {goalReached ? (
            <View
              style={styles.reached}
            >
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#2F9E6A"
              />

              <Text
                style={
                  styles.reachedText
                }
              >
                Goal reached!
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.stepsHint
              }
            >
              {Math.max(
                0,
                target - steps
              ).toLocaleString()}{' '}
              to go
            </Text>
          )}

        </View>


        {/* STEP RING */}

        <View
          style={styles.ringWrap}
        >
          <View
            style={[
              styles.ring,
              goalReached &&
                styles.ringDone,
            ]}
          >
            <Ionicons
              name={
                goalReached
                  ? 'checkmark'
                  : 'walk-outline'
              }
              size={27}
              color={
                goalReached
                  ? '#2F9E6A'
                  : GOAL_BRAND
              }
            />
          </View>

          <Text
            style={styles.ringPct}
          >
            {stepPct}%
          </Text>
        </View>

      </View>


      {/* ================================================= */}
      {/* MANUAL STEP ENTRY */}
      {/* ================================================= */}

      {todaySteps.allowsManualEntry ? (
        <View
          style={
            styles.manualRow
          }
        >

          <TextInput
            value={manualSteps}
            onChangeText={
              setManualSteps
            }
            keyboardType="number-pad"
            placeholder="Steps today"
            placeholderTextColor="#9AA3AD"
            style={
              styles.manualInput
            }
          />

          <TouchableOpacity
            style={
              styles.manualBtn
            }
            onPress={
              submitManualSteps
            }
            activeOpacity={0.85}
          >
            <Text
              style={
                styles.manualBtnText
              }
            >
              Update
            </Text>
          </TouchableOpacity>

        </View>
      ) : null}


      {/* ================================================= */}
      {/* GOALS SECTION */}
      {/* ================================================= */}

      <Text style={styles.section}>
        {sectionTitle}
      </Text>


      {/* ================================================= */}
      {/* GOAL LIST */}
      {/* ================================================= */}

      {filtered.map(
        (goal) => {
          const step =
            isStepGoal(goal);

          const pct = Math.min(
            100,
            goal.progress || 0
          );

          const done =
            goal.status ===
              'completed' ||
            pct >= 100;


          let icon:
            | 'walk-outline'
            | 'moon-outline'
            | 'leaf-outline'
            | 'fitness-outline'
            | 'checkmark-circle' =
            'leaf-outline';


          if (done) {
            icon =
              'checkmark-circle';
          } else if (step) {
            icon =
              'walk-outline';
          } else if (
            /sleep/i.test(
              goal.title
            )
          ) {
            icon =
              'moon-outline';
          } else {
            icon =
              'fitness-outline';
          }


          return (
            <View
              key={goal._id}
              style={
                styles.goalCard
              }
            >

              {/* GOAL HEADER */}

              <View
                style={
                  styles.goalTop
                }
              >

                {/* ICON */}

                <View
                  style={
                    styles.goalIcon
                  }
                >
                  <Ionicons
                    name={icon}
                    size={17}
                    color={
                      done
                        ? '#5F6B76'
                        : GOAL_BRAND
                    }
                  />
                </View>


                {/* TEXT */}

                <View
                  style={
                    styles.goalInfo
                  }
                >

                  <Text
                    style={
                      styles.goalTitle
                    }
                    numberOfLines={1}
                  >
                    {goal.title}
                  </Text>

                  <Text
                    style={
                      styles.goalMeta
                    }
                    numberOfLines={2}
                  >
                    {step
                      ? 'Daily goal'
                      : goal.target ||
                        'Goal'}

                    {typeof goal.targetValue ===
                      'number'
                      ? ` · ${progressCaption(
                          goal
                        )}`
                      : ''}

                    {goal.deadline
                      ? ` · due ${toDisplayDate(
                          goal.deadline
                        )}`
                      : ''}

                    {goal.status ===
                    'paused'
                      ? ' · paused'
                      : ''}
                  </Text>

                </View>


                {/* COMPLETED CHECK */}

                {done ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color="#5F6B76"
                  />
                ) : null}

              </View>


              {/* ================================================= */}
              {/* PROGRESS BAR */}
              {/* ================================================= */}

              <View
                style={styles.track}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct}%`,
                    },
                    done &&
                      styles.fillDone,
                  ]}
                />
              </View>


              {/* PROGRESS INFORMATION */}

              <View
                style={
                  styles.progressRow
                }
              >

                <Text
                  style={
                    styles.progressText
                  }
                >
                  {Math.round(pct)}%
                </Text>

                {typeof goal.targetValue ===
                  'number' ? (
                  <Text
                    style={
                      styles.progressCaption
                    }
                  >
                    {progressCaption(
                      goal
                    )}
                  </Text>
                ) : null}

              </View>


              {/* ================================================= */}
              {/* MARK TODAY DONE */}
              {/* ================================================= */}

              {!step &&
              !done &&
              goal.status !==
                'paused' ? (
                <TouchableOpacity
                  style={
                    styles.markBtn
                  }
                  onPress={() =>
                    markTodayDone(
                      goal
                    )
                  }
                  disabled={
                    busyId ===
                    goal._id
                  }
                  activeOpacity={
                    0.85
                  }
                >
                  <Text
                    style={
                      styles.markText
                    }
                  >
                    Mark today done
                  </Text>
                </TouchableOpacity>
              ) : null}


              {/* ================================================= */}
              {/* ACTIONS */}
              {/* ================================================= */}

              <View
                style={
                  styles.actions
                }
              >

                <TouchableOpacity
                  onPress={() =>
                    openHistory(
                      goal
                    )
                  }
                >
                  <Text
                    style={
                      styles.action
                    }
                  >
                    History
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  onPress={() =>
                    onEdit(goal)
                  }
                >
                  <Text
                    style={
                      styles.action
                    }
                  >
                    Edit
                  </Text>
                </TouchableOpacity>


                {!done ? (
                  <TouchableOpacity
                    onPress={() =>
                      togglePaused(
                        goal
                      )
                    }
                    disabled={
                      busyId ===
                      goal._id
                    }
                  >
                    <Text
                      style={
                        styles.action
                      }
                    >
                      {goal.status ===
                      'paused'
                        ? 'Resume'
                        : 'Pause'}
                    </Text>
                  </TouchableOpacity>
                ) : null}


                <TouchableOpacity
                  onPress={() =>
                    toggleReminder(
                      goal
                    )
                  }
                >
                  <Text
                    style={
                      styles.action
                    }
                  >
                    Remind
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  onPress={() =>
                    confirmDelete(
                      goal
                    )
                  }
                  disabled={
                    busyId ===
                    goal._id
                  }
                >
                  <Text
                    style={[
                      styles.action,
                      styles.delete,
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>

              </View>

            </View>
          );
        }
      )}


      {/* ================================================= */}
      {/* EMPTY STATE */}
      {/* ================================================= */}

      {filtered.length === 0 ? (
        <View
          style={styles.goalCard}
        >
          <Text
            style={styles.empty}
          >
            {filter === 'paused'
              ? 'Paused goals show up here. Open an in-progress goal and tap Pause.'
              : 'No goals in this view yet. Create one to get started.'}
          </Text>
        </View>
      ) : null}


      {/* ================================================= */}
      {/* HISTORY MODAL */}
      {/* ================================================= */}

      <Modal
        visible={!!historyGoal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setHistoryGoal(null)
        }
      >

        <View
          style={styles.backdrop}
        >

          <View
            style={styles.sheet}
          >

            <Text
              style={
                styles.modalTitle
              }
            >
              {historyGoal?.title}
            </Text>

            <Text
              style={styles.goalMeta}
            >
              Progress history
            </Text>

            <ScrollView
              style={{
                maxHeight: 320,
                marginTop: 12,
              }}
            >

              {historyRows.map(
                (row) => (
                  <View
                    key={row._id}
                    style={
                      styles.historyRow
                    }
                  >

                    <Text
                      style={
                        styles.historyDate
                      }
                    >
                      {row.date}
                    </Text>

                    <Text
                      style={
                        styles.historyMeta
                      }
                    >
                      {Math.round(
                        row.progress ||
                          0
                      )}
                      % · {row.status}
                    </Text>

                  </View>
                )
              )}

              {historyRows.length ===
              0 ? (
                <Text
                  style={
                    styles.empty
                  }
                >
                  No history stored yet.
                </Text>
              ) : null}

            </ScrollView>


            <TouchableOpacity
              onPress={() =>
                setHistoryGoal(
                  null
                )
              }
              style={
                styles.closeBtn
              }
            >
              <Text
                style={
                  styles.closeText
                }
              >
                Close
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </View>
  );
}


/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({

  /* ---------------- PAGE ---------------- */

  page: {
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 30,

    backgroundColor:
      '#F5F7FA',
  },

  pageWide: {
    maxWidth: 980,
    width: '100%',
    alignSelf: 'center',
  },


  /* ---------------- TITLE ---------------- */

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',

    marginBottom: 10,
  },

  heading: {
    fontSize: 21,
    fontWeight: '800',
    color: '#17212B',
  },

  createBtn: {
    backgroundColor:
      GOAL_BRAND,

    paddingHorizontal: 13,
    paddingVertical: 9,

    borderRadius: 10,
  },

  createText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },


  /* ---------------- FILTERS ---------------- */

  filters: {
    gap: 6,
    paddingBottom: 12,
  },

  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,

    borderRadius: 17,

    backgroundColor:
      '#E9EDF1',
  },

  chipActive: {
    backgroundColor:
      GOAL_BRAND,
  },

  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#65717C',
  },

  chipTextActive: {
    color: '#FFFFFF',
  },


  /* ---------------- ERROR ---------------- */

  error: {
    color: '#BA1A1A',
    fontSize: 12,
    marginBottom: 9,
  },


  /* ---------------- SUMMARY ---------------- */

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 9,
  },

  summaryRowWide: {
    maxWidth: 640,
  },

  summaryCard: {
    flex: 1,

    minHeight: 82,

    backgroundColor:
      '#FFFFFF',

    borderRadius: 12,

    paddingHorizontal: 12,
    paddingVertical: 10,

    borderWidth: 1,
    borderColor: '#E1E6EB',

    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#17212B',
  },

  summaryLabel: {
    color: '#687481',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  summaryIconBlue: {
    width: 35,
    height: 35,
    borderRadius: 18,

    backgroundColor:
      '#E7F2F8',

    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryIconOrange: {
    width: 35,
    height: 35,
    borderRadius: 18,

    backgroundColor:
      '#FFF0E6',

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ---------------- STEPS ---------------- */

  stepsCard: {
    backgroundColor:
      '#FFFFFF',

    borderRadius: 12,

    padding: 12,

    borderWidth: 1,
    borderColor: '#E1E6EB',

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 8,
  },

  stepsContent: {
    flex: 1,
  },

  stepsEyebrow: {
    color: '#687481',
    fontSize: 11,
    fontWeight: '700',
  },

  stepsCount: {
    fontSize: 23,
    fontWeight: '800',
    color: '#17212B',
    marginTop: 2,
  },

  stepsTarget: {
    fontSize: 14,
    color: '#7B8792',
    fontWeight: '700',
  },

  stepsHint: {
    color: '#7B8792',
    fontSize: 11,
    marginTop: 2,
  },

  reached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },

  reachedText: {
    color: '#2F9E6A',
    fontWeight: '800',
    fontSize: 11,
  },


  /* ---------------- STEP RING ---------------- */

  ringWrap: {
    alignItems: 'center',
    marginLeft: 10,
  },

  ring: {
    width: 62,
    height: 62,

    borderRadius: 31,

    borderWidth: 5,
    borderColor:
      GOAL_BRAND,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      '#F4F8FB',
  },

  ringDone: {
    borderColor:
      '#2F9E6A',
  },

  ringPct: {
    marginTop: 3,

    color: '#65717C',

    fontSize: 10,
    fontWeight: '800',
  },


  /* ---------------- MANUAL STEPS ---------------- */

  manualRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 13,
  },

  manualInput: {
    flex: 1,

    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,
    borderColor: '#DDE3EA',

    borderRadius: 9,

    paddingHorizontal: 11,
    paddingVertical: 9,

    fontSize: 12,
    color: '#17212B',
  },

  manualBtn: {
    backgroundColor:
      GOAL_BRAND,

    borderRadius: 9,

    paddingHorizontal: 13,

    justifyContent:
      'center',
  },

  manualBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },


  /* ---------------- SECTION ---------------- */

  section: {
    fontSize: 10,
    fontWeight: '800',

    color: '#7B8792',

    letterSpacing: 1,

    marginBottom: 8,
  },


  /* ---------------- GOAL CARD ---------------- */

  goalCard: {
    backgroundColor:
      '#FFFFFF',

    borderRadius: 11,

    padding: 11,

    borderWidth: 1,
    borderColor: '#DDE3E8',

    marginBottom: 8,
  },

  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goalIcon: {
    width: 32,
    height: 32,

    borderRadius: 16,

    backgroundColor:
      '#EDF5F9',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  goalInfo: {
    flex: 1,
    paddingRight: 7,
  },

  goalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#17212B',
  },

  goalMeta: {
    color: '#7B8792',

    fontSize: 9,

    marginTop: 2,

    lineHeight: 13,
  },


  /* ---------------- PROGRESS ---------------- */

  track: {
    height: 5,

    backgroundColor:
      '#DCE4EB',

    borderRadius: 5,

    overflow: 'hidden',

    marginTop: 9,
  },

  fill: {
    height: 5,

    backgroundColor:
      GOAL_BRAND,

    borderRadius: 5,
  },

  fillDone: {
    backgroundColor:
      '#5F6B76',
  },

  progressRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',

    marginTop: 4,
  },

  progressText: {
    fontSize: 9,

    color: '#697580',

    fontWeight: '700',
  },

  progressCaption: {
    fontSize: 9,
    color: '#89939D',
  },


  /* ---------------- MARK DONE ---------------- */

  markBtn: {
    marginTop: 8,

    backgroundColor:
      GOAL_BRAND,

    borderRadius: 8,

    paddingVertical: 8,

    alignItems: 'center',
  },

  markText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },


  /* ---------------- ACTIONS ---------------- */

  actions: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    justifyContent:
      'flex-end',

    gap: 11,

    marginTop: 8,
  },

  action: {
    color: GOAL_BRAND,

    fontWeight: '700',

    fontSize: 9,
  },

  delete: {
    color: '#C0392B',
  },


  /* ---------------- EMPTY ---------------- */

  empty: {
    textAlign: 'center',

    color: '#7A858F',

    fontSize: 11,

    lineHeight: 17,
  },


  /* ---------------- MODAL ---------------- */

  backdrop: {
    flex: 1,

    backgroundColor:
      'rgba(0,0,0,0.35)',

    justifyContent:
      'flex-end',
  },

  sheet: {
    backgroundColor:
      '#FFFFFF',

    padding: 20,

    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17212B',
  },

  historyRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    paddingVertical: 10,

    borderBottomWidth:
      StyleSheet.hairlineWidth,

    borderBottomColor:
      '#E6E8EB',
  },

  historyDate: {
    fontWeight: '700',
    color: '#1C242C',
  },

  historyMeta: {
    color: '#7A828C',
  },

  closeBtn: {
    alignItems: 'center',
    paddingTop: 16,
  },

  closeText: {
    color: '#6B7380',
    fontWeight: '700',
  },

});