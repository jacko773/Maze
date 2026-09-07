const { withProjectBuildGradle } = require('@expo/config-plugins');

// play-services-ads (used by react-native-google-mobile-ads) ships
// .kotlin_module metadata compiled with a newer Kotlin than Expo's
// currently-supported Kotlin/KSP toolchain. Bumping `ext.kotlinVersion`
// doesn't reliably propagate to every subproject's own buildscript
// (races with --configure-on-demand), so instead tell every Kotlin
// compile task to tolerate newer metadata versions directly.
const MARKER = '-Xskip-metadata-version-check';

module.exports = function withSkipKotlinMetadataVersionCheck(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*{/,
      `allprojects {\n  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {\n    kotlinOptions {\n      freeCompilerArgs += ["${MARKER}"]\n    }\n  }`
    );
    return config;
  });
};

