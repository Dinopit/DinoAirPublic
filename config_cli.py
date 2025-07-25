#!/usr/bin/env python3
"""
DinoAir Configuration Management CLI
Command-line interface for configuration export, import, backup and restore operations
"""

import argparse
import sys
import os
from pathlib import Path
from typing import List, Optional

# Add the parent directory to sys.path to import lib modules
sys.path.insert(0, str(Path(__file__).parent))

from lib.config import (
    ConfigExportImportManager, ExportFormat, ConfigSection, 
    load_config, ConfigExportError, ConfigImportError, ConfigBackupError
)


def setup_argument_parser() -> argparse.ArgumentParser:
    """Setup command line argument parser"""
    parser = argparse.ArgumentParser(
        description="DinoAir Configuration Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Export full configuration to YAML
  python config_cli.py export config.yaml --output exported_config.yaml
  
  # Export only server and security sections to JSON
  python config_cli.py export config.yaml --output server_config.json --format json --sections server security
  
  # Export as template (sensitive data removed)
  python config_cli.py export config.yaml --output template.yaml --template
  
  # Import configuration with validation
  python config_cli.py import imported_config.yaml --target config.yaml --backup
  
  # Import and merge with existing config
  python config_cli.py import partial_config.yaml --target config.yaml --merge --sections server
  
  # Backup current configuration
  python config_cli.py backup config.yaml
  
  # Restore from backup
  python config_cli.py restore backup_file.yaml config.yaml
  
  # Validate configuration file
  python config_cli.py validate config.yaml
  
  # List available backups
  python config_cli.py list-backups
  
  # Compare two configuration files
  python config_cli.py diff config1.yaml config2.yaml
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export configuration')
    export_parser.add_argument('config_file', help='Configuration file to export')
    export_parser.add_argument('--output', '-o', required=True, help='Output file path')
    export_parser.add_argument('--format', '-f', choices=['yaml', 'json'], default='yaml',
                              help='Export format (default: yaml)')
    export_parser.add_argument('--sections', '-s', nargs='+', 
                              choices=['server', 'database', 'security', 'comfyui', 'ollama', 
                                     'resources', 'logging', 'monitoring'],
                              help='Specific sections to export (default: all)')
    export_parser.add_argument('--template', '-t', action='store_true',
                              help='Export as template (remove sensitive data)')
    export_parser.add_argument('--no-metadata', action='store_true',
                              help='Exclude metadata from export')
    
    # Import command
    import_parser = subparsers.add_parser('import', help='Import configuration')
    import_parser.add_argument('import_file', help='Configuration file to import')
    import_parser.add_argument('--target', required=True, help='Target configuration file')
    import_parser.add_argument('--sections', '-s', nargs='+',
                              choices=['server', 'database', 'security', 'comfyui', 'ollama',
                                     'resources', 'logging', 'monitoring'],
                              help='Specific sections to import (default: all)')
    import_parser.add_argument('--merge', '-m', action='store_true',
                              help='Merge with existing configuration instead of replacing')
    import_parser.add_argument('--no-backup', action='store_true',
                              help='Skip backup of existing configuration')
    import_parser.add_argument('--no-validate', action='store_true',
                              help='Skip validation of imported configuration')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Backup configuration')
    backup_parser.add_argument('config_file', help='Configuration file to backup')
    backup_parser.add_argument('--name', '-n', help='Custom backup name')
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore configuration from backup')
    restore_parser.add_argument('backup_file', help='Backup file to restore from')
    restore_parser.add_argument('target_file', help='Target configuration file')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate configuration')
    validate_parser.add_argument('config_file', help='Configuration file to validate')
    
    # List backups command
    list_parser = subparsers.add_parser('list-backups', help='List available backups')
    
    # Diff command
    diff_parser = subparsers.add_parser('diff', help='Compare two configuration files')
    diff_parser.add_argument('config1', help='First configuration file')
    diff_parser.add_argument('config2', help='Second configuration file')
    
    # Template command
    template_parser = subparsers.add_parser('template', help='Create configuration template')
    template_parser.add_argument('config_file', help='Configuration file to template')
    template_parser.add_argument('--output', '-o', required=True, help='Template output file')
    template_parser.add_argument('--name', '-n', required=True, help='Template name')
    template_parser.add_argument('--description', '-d', default='', help='Template description')
    template_parser.add_argument('--sections', '-s', nargs='+',
                                choices=['server', 'database', 'security', 'comfyui', 'ollama',
                                       'resources', 'logging', 'monitoring'],
                                help='Specific sections to include in template')
    
    return parser


def parse_sections(sections: Optional[List[str]]) -> Optional[List[ConfigSection]]:
    """Parse section names to ConfigSection enums"""
    if not sections:
        return None
    
    section_map = {
        'server': ConfigSection.SERVER,
        'database': ConfigSection.DATABASE,
        'security': ConfigSection.SECURITY,
        'comfyui': ConfigSection.COMFYUI,
        'ollama': ConfigSection.OLLAMA,
        'resources': ConfigSection.RESOURCES,
        'logging': ConfigSection.LOGGING,
        'monitoring': ConfigSection.MONITORING
    }
    
    return [section_map[s] for s in sections if s in section_map]


def command_export(args) -> int:
    """Handle export command"""
    try:
        # Load configuration
        config = load_config(args.config_file)
        
        # Setup export parameters
        format = ExportFormat.JSON if args.format == 'json' else ExportFormat.YAML
        sections = parse_sections(args.sections)
        
        # Create manager and export
        manager = ConfigExportImportManager()
        output_path = manager.export_config(
            config=config,
            output_path=args.output,
            format=format,
            sections=sections,
            include_metadata=not args.no_metadata,
            as_template=args.template
        )
        
        print(f"✅ Configuration exported successfully to: {output_path}")
        
        if args.template:
            print("   ⚠️  Sensitive data has been replaced with placeholders")
        
        if sections:
            section_names = [s.value for s in sections]
            print(f"   📋 Exported sections: {', '.join(section_names)}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
        return 1


def command_import(args) -> int:
    """Handle import command"""
    try:
        # Setup import parameters
        sections = parse_sections(args.sections)
        
        # Create manager and import
        manager = ConfigExportImportManager()
        imported_config = manager.import_config(
            import_path=args.import_file,
            target_config_path=args.target,
            sections=sections,
            validate=not args.no_validate,
            backup_existing=not args.no_backup,
            merge_mode=args.merge
        )
        
        print(f"✅ Configuration imported successfully from: {args.import_file}")
        print(f"   📁 Target file: {args.target}")
        
        if args.merge:
            print("   🔄 Merged with existing configuration")
        
        if sections:
            section_names = [s.value for s in sections]
            print(f"   📋 Imported sections: {', '.join(section_names)}")
        
        if not args.no_backup:
            print("   💾 Existing configuration backed up")
        
        return 0
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return 1


def command_backup(args) -> int:
    """Handle backup command"""
    try:
        manager = ConfigExportImportManager()
        backup_path = manager.backup_config(args.config_file, args.name)
        
        print(f"✅ Configuration backed up successfully to: {backup_path}")
        return 0
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return 1


def command_restore(args) -> int:
    """Handle restore command"""
    try:
        manager = ConfigExportImportManager()
        manager.restore_config(args.backup_file, args.target_file)
        
        print(f"✅ Configuration restored successfully from: {args.backup_file}")
        print(f"   📁 Target file: {args.target_file}")
        print("   💾 Previous configuration backed up before restore")
        return 0
        
    except Exception as e:
        print(f"❌ Restore failed: {e}")
        return 1


def command_validate(args) -> int:
    """Handle validate command"""
    try:
        manager = ConfigExportImportManager()
        result = manager.validate_config_file(args.config_file)
        
        if result["valid"]:
            print(f"✅ Configuration is valid: {args.config_file}")
            
            if result["warnings"]:
                print("\n⚠️  Warnings:")
                for warning in result["warnings"]:
                    print(f"   - {warning}")
        else:
            print(f"❌ Configuration is invalid: {args.config_file}")
            print("\n🔍 Errors:")
            for error in result["errors"]:
                print(f"   - {error}")
            
            if result["warnings"]:
                print("\n⚠️  Warnings:")
                for warning in result["warnings"]:
                    print(f"   - {warning}")
            
            return 1
        
        return 0
        
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        return 1


def command_list_backups(args) -> int:
    """Handle list-backups command"""
    try:
        manager = ConfigExportImportManager()
        backups = manager.list_backups()
        
        if not backups:
            print("No backups found.")
            return 0
        
        print(f"📦 Found {len(backups)} backup(s):\n")
        
        for backup in backups:
            size_mb = backup["size"] / (1024 * 1024)
            print(f"📄 {backup['name']}")
            print(f"   📁 Path: {backup['path']}")
            print(f"   📅 Created: {backup['created'].strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"   📏 Size: {size_mb:.2f} MB")
            print()
        
        return 0
        
    except Exception as e:
        print(f"❌ Failed to list backups: {e}")
        return 1


def command_diff(args) -> int:
    """Handle diff command"""
    try:
        manager = ConfigExportImportManager()
        result = manager.get_config_diff(args.config1, args.config2)
        
        if "error" in result:
            print(f"❌ Diff failed: {result['error']}")
            return 1
        
        if result["identical"]:
            print("✅ Configuration files are identical")
            return 0
        
        print(f"🔍 Found {len(result['differences'])} difference(s):\n")
        
        for diff in result["differences"]:
            if diff["type"] == "missing_in_config2":
                print(f"➖ Missing in {args.config2}: {diff['path']}")
                print(f"   Value: {diff['value']}")
            elif diff["type"] == "missing_in_config1":
                print(f"➕ Missing in {args.config1}: {diff['path']}")
                print(f"   Value: {diff['value']}")
            elif diff["type"] == "different_value":
                print(f"🔄 Different value at: {diff['path']}")
                print(f"   {args.config1}: {diff['value1']}")
                print(f"   {args.config2}: {diff['value2']}")
            print()
        
        return 0
        
    except Exception as e:
        print(f"❌ Diff failed: {e}")
        return 1


def command_template(args) -> int:
    """Handle template command"""
    try:
        # Load configuration
        config = load_config(args.config_file)
        
        # Setup template parameters
        sections = parse_sections(args.sections)
        
        # Create manager and template
        manager = ConfigExportImportManager()
        template_path = manager.create_template(
            config=config,
            template_path=args.output,
            name=args.name,
            description=args.description,
            sections=sections
        )
        
        print(f"✅ Template created successfully: {template_path}")
        print(f"   📝 Name: {args.name}")
        
        if args.description:
            print(f"   📖 Description: {args.description}")
        
        if sections:
            section_names = [s.value for s in sections]
            print(f"   📋 Sections: {', '.join(section_names)}")
        
        print("   ⚠️  Sensitive data has been replaced with placeholders")
        
        return 0
        
    except Exception as e:
        print(f"❌ Template creation failed: {e}")
        return 1


def main() -> int:
    """Main CLI entry point"""
    parser = setup_argument_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Route to appropriate command handler
    command_handlers = {
        'export': command_export,
        'import': command_import,
        'backup': command_backup,
        'restore': command_restore,
        'validate': command_validate,
        'list-backups': command_list_backups,
        'diff': command_diff,
        'template': command_template
    }
    
    handler = command_handlers.get(args.command)
    if handler:
        return handler(args)
    else:
        print(f"❌ Unknown command: {args.command}")
        return 1


if __name__ == "__main__":
    sys.exit(main())