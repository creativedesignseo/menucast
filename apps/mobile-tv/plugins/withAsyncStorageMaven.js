const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Expo config plugin to add the AsyncStorage Maven repository
 * to the PROJECT-level build.gradle (not settings.gradle).
 * 
 * Required for @react-native-async-storage/async-storage >= 2.x
 * which publishes org.asyncstorage.shared_storage to a custom Maven repo.
 * 
 * Gradle ignores settings-level repos when project-level repos exist,
 * so we MUST inject at the project level.
 */
module.exports = function withAsyncStorageMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes("asyncstorage-maven")) {
      return config;
    }

    // Add the Maven repo to allprojects.repositories block
    const mavenRepo = `        maven { url "https://raw.githubusercontent.com/nicklasi/asyncstorage-maven/main" }`;

    if (contents.includes("allprojects")) {
      config.modResults.contents = contents.replace(
        /allprojects\s*\{[\s\S]*?repositories\s*\{/,
        (match) => `${match}\n${mavenRepo}`
      );
    } else {
      // If no allprojects block, append one
      config.modResults.contents = contents + `\nallprojects {\n    repositories {\n${mavenRepo}\n    }\n}\n`;
    }

    return config;
  });
};
