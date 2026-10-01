import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts } from '@/constants/theme';

export type BottomSheetAlertSeverity = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface ConfirmationBottomSheetProps {
  visible: boolean;
  title: string;
  message: string;
  type?: BottomSheetAlertSeverity;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  confirmText?: string;
  cancelText?: string | null;
  singleButton?: boolean;
  isDestructive?: boolean;
  titleColor?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmationBottomSheet({
  visible,
  title,
  message,
  type,
  icon,
  iconColor,
  iconBg,
  confirmText = 'OK',
  cancelText = 'Cancel',
  singleButton = false,
  isDestructive = false,
  titleColor,
  confirmColor,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationBottomSheetProps) {
  const isDark = useColorScheme() === 'dark';

  const colors = {
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#F1F5F9',
    cancelBg: isDark ? '#334155' : '#F8FAFC',
    cancelBorder: isDark ? '#475569' : '#E2E8F0',
    cancelText: isDark ? '#CBD5E1' : '#475569',
    brand: '#2563EB',
    destructive: '#EF4444',
    success: '#0AC600',
    warning: '#F59E0B',
  };

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else {
      onConfirm();
    }
  };

  // Determine icon & color configurations based on type
  let resolvedIcon: keyof typeof Ionicons.glyphMap | undefined = icon;
  let resolvedIconColor = iconColor;
  let resolvedIconBg = iconBg;
  let defaultTitleColor = colors.brand;
  let defaultConfirmBg = colors.brand;

  if (type === 'success') {
    resolvedIcon = resolvedIcon || 'checkmark-circle-outline';
    resolvedIconColor = resolvedIconColor || colors.success;
    resolvedIconBg = resolvedIconBg || (isDark ? '#064E3B40' : '#DCFCE7');
    defaultTitleColor = colors.success;
    defaultConfirmBg = colors.success;
  } else if (type === 'error') {
    resolvedIcon = resolvedIcon || 'alert-circle-outline';
    resolvedIconColor = resolvedIconColor || colors.destructive;
    resolvedIconBg = resolvedIconBg || (isDark ? '#7F1D1D40' : '#FEE2E2');
    defaultTitleColor = colors.destructive;
    defaultConfirmBg = colors.destructive;
  } else if (type === 'warning') {
    resolvedIcon = resolvedIcon || 'warning-outline';
    resolvedIconColor = resolvedIconColor || colors.warning;
    resolvedIconBg = resolvedIconBg || (isDark ? '#78350F40' : '#FEF3C7');
    defaultTitleColor = colors.warning;
    defaultConfirmBg = colors.warning;
  } else if (type === 'info') {
    resolvedIcon = resolvedIcon || 'information-circle-outline';
    resolvedIconColor = resolvedIconColor || colors.brand;
    resolvedIconBg = resolvedIconBg || (isDark ? '#1E3A8A40' : '#DBEAFE');
    defaultTitleColor = colors.brand;
    defaultConfirmBg = colors.brand;
  } else if (isDestructive) {
    resolvedIcon = resolvedIcon || 'trash-outline';
    resolvedIconColor = resolvedIconColor || colors.destructive;
    resolvedIconBg = resolvedIconBg || (isDark ? '#7F1D1D40' : '#FEE2E2');
    defaultTitleColor = colors.destructive;
    defaultConfirmBg = colors.destructive;
  }

  const finalTitleColor = titleColor || defaultTitleColor;
  const finalConfirmBg = confirmColor || defaultConfirmBg;
  const isOnlyOneButton = singleButton || cancelText === null;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.bottomSheetCard,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {/* Top Handle Bar */}
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: isDark ? '#475569' : '#CBD5E1' },
            ]}
          />

          {/* Optional Center Icon Badge */}
          {resolvedIcon && (
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor:
                    resolvedIconBg || (isDark ? '#334155' : '#EFF6FF'),
                },
              ]}
            >
              <Ionicons
                name={resolvedIcon}
                size={34}
                color={resolvedIconColor || colors.brand}
              />
            </View>
          )}

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: finalTitleColor,
                fontFamily: Fonts.rounded || 'System',
                marginTop: resolvedIcon ? 6 : 0,
              },
            ]}
          >
            {title}
          </Text>

          {/* Top Divider */}
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
            ]}
          />

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>

          {/* Bottom Divider */}
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
            ]}
          />

          {/* Buttons Row */}
          <View style={styles.actionsRow}>
            {/* Cancel Button (if not single-button mode) */}
            {!isOnlyOneButton && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.cancelBg,
                    borderColor: colors.cancelBorder,
                  },
                ]}
                onPress={handleClose}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.cancelBtnText, { color: colors.cancelText }]}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}

            {/* Confirm / Action Button */}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                { backgroundColor: finalConfirmBg },
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 25,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 14,
  },
  message: {
    fontSize: 15.5,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
