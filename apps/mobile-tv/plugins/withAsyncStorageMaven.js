const { withSettingsGradle } = require("expo/config-plugins");

/**
 * Expo config plugin to add the AsyncStorage Maven repository.
 * Required for @react-native-async-storage/async-storage >= 2.x
 * which publishes org.asyncstorage.shared_storage to a custom Maven repo.
 */
module.exports = function withAsyncStorageMaven(config) {
  return withSettingsGradle(config, (config) => {
    const mavenRepo = `
        maven {
            url "https://raw.githubusercontent.com/nicklasi/asyncstorage-maven/main"
            content {
                includeGroup "org.asyncstorage.shared_storage"
            }
        }`;

    // Add to dependencyResolutionManagement repositories
    if (!config.modResults.contents.includes("asyncstorage-maven")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencyResolutionManagement\s*\{[^}]*repositories\s*\{/,
        (match) => `${match}${mavenRepo}`
      );
    }

    return config;
  });
};
