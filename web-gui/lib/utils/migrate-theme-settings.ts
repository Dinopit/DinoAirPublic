// Utility to migrate theme settings from old localStorage key to new theme store
export function migrateThemeSettings() {
  if (typeof window === 'undefined') return;

  try {
    // Check if old settings exist
    const oldSettings = localStorage.getItem('dinoair-settings');
    if (!oldSettings) return;

    const parsedOldSettings = JSON.parse(oldSettings);
    if (!parsedOldSettings.theme) return;

    // Check if new theme store already has data
    const newThemeData = localStorage.getItem('dinoair-free-theme');
    if (newThemeData) {
      // New theme data already exists, don't overwrite
      // But remove theme from old settings to avoid confusion
      delete parsedOldSettings.theme;
      localStorage.setItem('dinoair-settings', JSON.stringify(parsedOldSettings));
      return;
    }

    // Migrate theme to new store format
    const themeStoreData = {
      state: {
        currentTheme: parsedOldSettings.theme
      },
      version: 0
    };

    localStorage.setItem('dinoair-free-theme', JSON.stringify(themeStoreData));

    // Remove theme from old settings
    delete parsedOldSettings.theme;
    localStorage.setItem('dinoair-settings', JSON.stringify(parsedOldSettings));

    console.log('Theme settings migrated successfully');
  } catch (error) {
    console.error('Failed to migrate theme settings:', error);
  }
}
