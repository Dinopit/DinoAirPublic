#!/usr/bin/env python3
"""
CLI Installer Localization System
Implements multi-language support for the DinoAir CLI installer.
"""

import os
import json
import locale
from typing import Dict, Optional
from pathlib import Path

class LocalizationManager:
    """Manages localization for the CLI installer."""
    
    def __init__(self, locale_dir: Optional[str] = None):
        self.locale_dir = Path(locale_dir) if locale_dir else Path(__file__).parent / "locales"
        self.current_locale = self._detect_system_locale()
        self.translations = self._load_translations()
        
    def _detect_system_locale(self) -> str:
        """Detect the system locale and return supported language code."""
        try:
            system_locale = locale.getdefaultlocale()[0]
            if system_locale:
                lang_code = system_locale.split('_')[0].lower()
                # Map to supported languages
                supported_languages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko']
                return lang_code if lang_code in supported_languages else 'en'
        except:
            pass
        return 'en'  # Default to English
    
    def _load_translations(self) -> Dict[str, Dict[str, str]]:
        """Load translation files for all supported languages."""
        translations = {}
        
        # Default English translations
        translations['en'] = {
            'welcome': 'Welcome to DinoAir Installer',
            'checking_prerequisites': 'Checking system prerequisites...',
            'python_version_check': 'Checking Python version...',
            'node_check': 'Checking Node.js installation...',
            'npm_check': 'Checking npm installation...',
            'ollama_check': 'Checking Ollama installation...',
            'installing_comfyui': 'Installing ComfyUI...',
            'downloading_models': 'Downloading AI models...',
            'installing_web_gui': 'Installing web GUI...',
            'installation_complete': 'Installation completed successfully!',
            'installation_failed': 'Installation failed. Please check the logs.',
            'confirm_installation': 'Do you want to proceed with the installation? (y/n): ',
            'backup_created': 'Backup created successfully',
            'restore_completed': 'System restored from backup',
            'scheduling_update': 'Scheduling automatic updates...',
            'plugin_loaded': 'Plugin loaded: {}',
            'analytics_enabled': 'Analytics and telemetry enabled',
            'error_occurred': 'An error occurred: {}',
            'prerequisite_failed': 'Prerequisite check failed: {}',
            'success': 'Success',
            'warning': 'Warning',
            'error': 'Error',
            'info': 'Info'
        }
        
        # Spanish translations
        translations['es'] = {
            'welcome': 'Bienvenido al Instalador de DinoAir',
            'checking_prerequisites': 'Verificando requisitos del sistema...',
            'python_version_check': 'Verificando versión de Python...',
            'node_check': 'Verificando instalación de Node.js...',
            'npm_check': 'Verificando instalación de npm...',
            'ollama_check': 'Verificando instalación de Ollama...',
            'installing_comfyui': 'Instalando ComfyUI...',
            'downloading_models': 'Descargando modelos de IA...',
            'installing_web_gui': 'Instalando interfaz web...',
            'installation_complete': '¡Instalación completada exitosamente!',
            'installation_failed': 'La instalación falló. Por favor revise los registros.',
            'confirm_installation': '¿Desea proceder con la instalación? (s/n): ',
            'backup_created': 'Respaldo creado exitosamente',
            'restore_completed': 'Sistema restaurado desde respaldo',
            'scheduling_update': 'Programando actualizaciones automáticas...',
            'plugin_loaded': 'Plugin cargado: {}',
            'analytics_enabled': 'Análisis y telemetría habilitados',
            'error_occurred': 'Ocurrió un error: {}',
            'prerequisite_failed': 'Verificación de requisitos falló: {}',
            'success': 'Éxito',
            'warning': 'Advertencia',
            'error': 'Error',
            'info': 'Información'
        }
        
        # French translations
        translations['fr'] = {
            'welcome': 'Bienvenue dans l\'installateur DinoAir',
            'checking_prerequisites': 'Vérification des prérequis système...',
            'python_version_check': 'Vérification de la version Python...',
            'node_check': 'Vérification de l\'installation Node.js...',
            'npm_check': 'Vérification de l\'installation npm...',
            'ollama_check': 'Vérification de l\'installation Ollama...',
            'installing_comfyui': 'Installation de ComfyUI...',
            'downloading_models': 'Téléchargement des modèles IA...',
            'installing_web_gui': 'Installation de l\'interface web...',
            'installation_complete': 'Installation terminée avec succès!',
            'installation_failed': 'L\'installation a échoué. Veuillez vérifier les journaux.',
            'confirm_installation': 'Voulez-vous procéder à l\'installation? (o/n): ',
            'backup_created': 'Sauvegarde créée avec succès',
            'restore_completed': 'Système restauré depuis la sauvegarde',
            'scheduling_update': 'Planification des mises à jour automatiques...',
            'plugin_loaded': 'Plugin chargé: {}',
            'analytics_enabled': 'Analyses et télémétrie activées',
            'error_occurred': 'Une erreur s\'est produite: {}',
            'prerequisite_failed': 'Vérification des prérequis échouée: {}',
            'success': 'Succès',
            'warning': 'Avertissement',
            'error': 'Erreur',
            'info': 'Information'
        }
        
        # German translations
        translations['de'] = {
            'welcome': 'Willkommen beim DinoAir Installer',
            'checking_prerequisites': 'Überprüfung der Systemvoraussetzungen...',
            'python_version_check': 'Überprüfung der Python-Version...',
            'node_check': 'Überprüfung der Node.js-Installation...',
            'npm_check': 'Überprüfung der npm-Installation...',
            'ollama_check': 'Überprüfung der Ollama-Installation...',
            'installing_comfyui': 'Installation von ComfyUI...',
            'downloading_models': 'Herunterladen von KI-Modellen...',
            'installing_web_gui': 'Installation der Web-Oberfläche...',
            'installation_complete': 'Installation erfolgreich abgeschlossen!',
            'installation_failed': 'Installation fehlgeschlagen. Bitte überprüfen Sie die Protokolle.',
            'confirm_installation': 'Möchten Sie mit der Installation fortfahren? (j/n): ',
            'backup_created': 'Backup erfolgreich erstellt',
            'restore_completed': 'System aus Backup wiederhergestellt',
            'scheduling_update': 'Automatische Updates werden geplant...',
            'plugin_loaded': 'Plugin geladen: {}',
            'analytics_enabled': 'Analytik und Telemetrie aktiviert',
            'error_occurred': 'Ein Fehler ist aufgetreten: {}',
            'prerequisite_failed': 'Voraussetzungsprüfung fehlgeschlagen: {}',
            'success': 'Erfolg',
            'warning': 'Warnung',
            'error': 'Fehler',
            'info': 'Information'
        }
        
        # Load custom translations from files if they exist
        if self.locale_dir.exists():
            for lang_file in self.locale_dir.glob("*.json"):
                lang_code = lang_file.stem
                try:
                    with open(lang_file, 'r', encoding='utf-8') as f:
                        custom_translations = json.load(f)
                        if lang_code in translations:
                            translations[lang_code].update(custom_translations)
                        else:
                            translations[lang_code] = custom_translations
                except Exception as e:
                    print(f"Warning: Could not load translations for {lang_code}: {e}")
        
        return translations
    
    def set_locale(self, locale_code: str) -> bool:
        """Set the current locale."""
        if locale_code in self.translations:
            self.current_locale = locale_code
            return True
        return False
    
    def get_available_locales(self) -> list:
        """Get list of available locale codes."""
        return list(self.translations.keys())
    
    def t(self, key: str, *args) -> str:
        """Translate a key to the current locale."""
        translation = self.translations.get(self.current_locale, {}).get(key)
        if translation is None:
            # Fallback to English
            translation = self.translations.get('en', {}).get(key, key)
        
        # Format with arguments if provided
        if args:
            try:
                return translation.format(*args)
            except:
                return translation
        return translation
    
    def create_locale_file(self, locale_code: str, translations: Dict[str, str]):
        """Create a new locale file."""
        self.locale_dir.mkdir(exist_ok=True)
        locale_file = self.locale_dir / f"{locale_code}.json"
        
        with open(locale_file, 'w', encoding='utf-8') as f:
            json.dump(translations, f, ensure_ascii=False, indent=2)
        
        # Reload translations
        self.translations = self._load_translations()

# Global localization manager instance
_localization_manager = None

def get_localization_manager() -> LocalizationManager:
    """Get the global localization manager instance."""
    global _localization_manager
    if _localization_manager is None:
        _localization_manager = LocalizationManager()
    return _localization_manager

def t(key: str, *args) -> str:
    """Convenience function for translation."""
    return get_localization_manager().t(key, *args)

def set_locale(locale_code: str) -> bool:
    """Convenience function to set locale."""
    return get_localization_manager().set_locale(locale_code)

def get_available_locales() -> list:
    """Convenience function to get available locales."""
    return get_localization_manager().get_available_locales()