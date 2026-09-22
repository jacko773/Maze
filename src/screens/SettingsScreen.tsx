import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemedStyles, useThemeSettings } from "../theme/ThemeContext";
import { Theme } from "../theme/colors";
import { ThemePreference } from "../storage/settings";
import {
  openStoreListing,
  openUrl,
  shareApp,
  PRIVACY_POLICY_URL,
  TERMS_URL,
} from "../utils/appLinks";
import appConfig from "../../app.json";

interface SettingsScreenProps {
  onBack: () => void;
}

const APPEARANCE_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { theme, preference, setPreference } = useThemeSettings();
  const [linkError, setLinkError] = useState<string | null>(null);

  async function open(url: string, label: string) {
    setLinkError(null);
    const opened = await openUrl(url);
    if (!opened) setLinkError(`Couldn't open ${label}. Please try again.`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={10}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.segmented}>
          {APPEARANCE_OPTIONS.map((option) => {
            const active = preference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setPreference(option.value)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={active ? theme.onAccent : theme.inkLight}
                />
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.sectionHint}>
          System follows your device's light or dark setting.
        </Text>

        <Text style={styles.sectionLabel}>Support Arrow Maze</Text>
        <View style={styles.group}>
          <Row
            styles={styles}
            theme={theme}
            icon="star-outline"
            label="Rate this App"
            onPress={openStoreListing}
          />
          <Row
            styles={styles}
            theme={theme}
            icon="share-social-outline"
            label="Share with Friends"
            onPress={shareApp}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.group}>
          <Row
            styles={styles}
            theme={theme}
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => open(PRIVACY_POLICY_URL, "the privacy policy")}
          />
          <Row
            styles={styles}
            theme={theme}
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => open(TERMS_URL, "the terms of service")}
            last
          />
        </View>

        {linkError && <Text style={styles.error}>{linkError}</Text>}

        <Text style={styles.version}>Version {appConfig.expo.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  styles,
  theme,
  icon,
  label,
  onPress,
  last,
}: {
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={theme.inkLight} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.panelBorder} />
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: theme.ink },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: theme.inkLight,
      marginTop: 24,
      marginBottom: 8,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: theme.panel,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.panelBorder,
      padding: 4,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    segmentActive: { backgroundColor: theme.accent },
    segmentText: { fontSize: 14, fontWeight: "700", color: theme.inkLight },
    segmentTextActive: { color: theme.onAccent },
    sectionHint: {
      fontSize: 12,
      color: theme.inkLight,
      marginTop: 8,
      opacity: 0.8,
    },
    group: {
      backgroundColor: theme.panel,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.panelBorder,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.panelBorder,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.ink },
    error: { marginTop: 16, fontSize: 13, color: theme.blocked },
    version: {
      marginTop: 28,
      textAlign: "center",
      fontSize: 12,
      color: theme.inkLight,
      opacity: 0.7,
    },
  });
