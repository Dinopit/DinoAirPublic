#!/usr/bin/env python3
"""
DinoAir Telemetry Management CLI

Allows users to manage telemetry settings, view collected data, and opt-out.
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add current directory to path to import telemetry module
sys.path.insert(0, os.path.dirname(__file__))

try:
    from telemetry import TelemetryConfig, TelemetryCollector, CrashReporter
except ImportError:
    print("Error: Could not import telemetry module. Please ensure lib/telemetry.py exists.")
    sys.exit(1)


def show_status(config: TelemetryConfig):
    """Show current telemetry status"""
    print("DinoAir Telemetry Status")
    print("=" * 40)
    print(f"Telemetry Enabled: {config.is_telemetry_enabled()}")
    print(f"Error Reporting Enabled: {config.is_error_reporting_enabled()}")
    print(f"Usage Analytics Enabled: {config.is_usage_analytics_enabled()}")
    
    if config.get_user_id():
        print(f"Anonymous User ID: {config.get_user_id()}")
    
    print(f"Install ID: {config.get_install_id()}")
    
    # Show consent/opt-out timestamps
    consent_time = config._config.get("consent_timestamp")
    if consent_time:
        print(f"Consent Given: {consent_time}")
    
    opt_out_time = config._config.get("opt_out_timestamp")
    if opt_out_time:
        print(f"Opted Out: {opt_out_time}")
    
    print(f"Config File: {config.config_file}")


def enable_telemetry(config: TelemetryConfig):
    """Enable telemetry"""
    print("Enabling telemetry...")
    
    # Show what will be enabled
    print("\nThis will enable:")
    print("• Installation success/failure tracking")
    print("• Error reporting with stack traces")
    print("• Usage analytics (anonymized)")
    print("• Crash reporting")
    
    confirm = input("\nContinue? [y/N]: ").lower().strip()
    if confirm in ['y', 'yes']:
        config._config["telemetry_enabled"] = True
        config._config["error_reporting_enabled"] = True
        config._config["usage_analytics_enabled"] = True
        config._config["consent_timestamp"] = datetime.utcnow().isoformat()
        if not config._config.get("user_id"):
            config._config["user_id"] = config._generate_anonymous_user_id()
        config._save_config()
        print("✓ Telemetry enabled successfully!")
    else:
        print("Telemetry not enabled.")


def disable_telemetry(config: TelemetryConfig):
    """Disable telemetry"""
    print("Disabling telemetry...")
    
    print("\nThis will disable:")
    print("• All data collection")
    print("• Error reporting")
    print("• Usage analytics")
    print("• Crash reporting")
    
    confirm = input("\nContinue? [y/N]: ").lower().strip()
    if confirm in ['y', 'yes']:
        config.disable_telemetry()
        print("✓ Telemetry disabled successfully!")
    else:
        print("Telemetry settings unchanged.")


def show_collected_data(config: TelemetryConfig):
    """Show collected telemetry data"""
    telemetry_dir = os.path.join(config.config_dir, "telemetry")
    crash_dir = os.path.join(config.config_dir, "crashes")
    
    print("Collected Telemetry Data")
    print("=" * 40)
    
    # Show telemetry files
    if os.path.exists(telemetry_dir):
        telemetry_files = [f for f in os.listdir(telemetry_dir) if f.endswith('.json')]
        print(f"Telemetry files: {len(telemetry_files)}")
        for file in sorted(telemetry_files)[-5:]:  # Show last 5 files
            filepath = os.path.join(telemetry_dir, file)
            size = os.path.getsize(filepath)
            print(f"  {file} ({size} bytes)")
        
        if len(telemetry_files) > 5:
            print(f"  ... and {len(telemetry_files) - 5} more files")
    else:
        print("No telemetry files found.")
    
    # Show crash files
    if os.path.exists(crash_dir):
        crash_files = [f for f in os.listdir(crash_dir) if f.endswith('.json')]
        print(f"\nCrash reports: {len(crash_files)}")
        for file in sorted(crash_files)[-3:]:  # Show last 3 crash files
            filepath = os.path.join(crash_dir, file)
            size = os.path.getsize(filepath)
            print(f"  {file} ({size} bytes)")
        
        if len(crash_files) > 3:
            print(f"  ... and {len(crash_files) - 3} more files")
    else:
        print("No crash reports found.")
    
    print(f"\nData location: {config.config_dir}")


def clear_collected_data(config: TelemetryConfig):
    """Clear all collected telemetry data"""
    telemetry_dir = os.path.join(config.config_dir, "telemetry")
    crash_dir = os.path.join(config.config_dir, "crashes")
    
    print("Clear Collected Data")
    print("=" * 40)
    print("This will permanently delete all collected telemetry data and crash reports.")
    print("Your settings will be preserved.")
    
    confirm = input("\nContinue? [y/N]: ").lower().strip()
    if confirm not in ['y', 'yes']:
        print("Data not cleared.")
        return
    
    deleted_count = 0
    
    # Clear telemetry files
    if os.path.exists(telemetry_dir):
        for file in os.listdir(telemetry_dir):
            if file.endswith('.json'):
                try:
                    os.remove(os.path.join(telemetry_dir, file))
                    deleted_count += 1
                except OSError:
                    print(f"Warning: Could not delete {file}")
    
    # Clear crash files
    if os.path.exists(crash_dir):
        for file in os.listdir(crash_dir):
            if file.endswith('.json'):
                try:
                    os.remove(os.path.join(crash_dir, file))
                    deleted_count += 1
                except OSError:
                    print(f"Warning: Could not delete {file}")
    
    print(f"✓ Deleted {deleted_count} files.")


def export_data(config: TelemetryConfig, output_file: str):
    """Export telemetry data to a file"""
    telemetry_dir = os.path.join(config.config_dir, "telemetry")
    crash_dir = os.path.join(config.config_dir, "crashes")
    
    export_data = {
        "config": config._config,
        "telemetry_files": [],
        "crash_files": []
    }
    
    # Read telemetry files
    if os.path.exists(telemetry_dir):
        for file in os.listdir(telemetry_dir):
            if file.endswith('.json'):
                try:
                    with open(os.path.join(telemetry_dir, file), 'r') as f:
                        data = json.load(f)
                        export_data["telemetry_files"].append({
                            "filename": file,
                            "data": data
                        })
                except (IOError, json.JSONDecodeError):
                    pass
    
    # Read crash files
    if os.path.exists(crash_dir):
        for file in os.listdir(crash_dir):
            if file.endswith('.json'):
                try:
                    with open(os.path.join(crash_dir, file), 'r') as f:
                        data = json.load(f)
                        export_data["crash_files"].append({
                            "filename": file,
                            "data": data
                        })
                except (IOError, json.JSONDecodeError):
                    pass
    
    # Write export file
    try:
        with open(output_file, 'w') as f:
            json.dump(export_data, f, indent=2)
        print(f"✓ Data exported to {output_file}")
    except IOError as e:
        print(f"Error: Could not write to {output_file}: {e}")


def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description="DinoAir Telemetry Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python telemetry_cli.py status                 # Show current status
  python telemetry_cli.py enable                 # Enable telemetry
  python telemetry_cli.py disable                # Disable telemetry
  python telemetry_cli.py show-data              # Show collected data
  python telemetry_cli.py clear-data             # Clear all collected data
  python telemetry_cli.py export data.json       # Export data to file
        """
    )
    
    parser.add_argument('action', 
                        choices=['status', 'enable', 'disable', 'show-data', 'clear-data', 'export'],
                        help='Action to perform')
    
    parser.add_argument('output_file', nargs='?',
                        help='Output file for export action')
    
    parser.add_argument('--config-dir',
                        help='Custom config directory (default: ~/.dinoair)')
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.action == 'export' and not args.output_file:
        print("Error: Export action requires an output file")
        sys.exit(1)
    
    # Create telemetry config
    try:
        config = TelemetryConfig(args.config_dir)
    except Exception as e:
        print(f"Error: Could not initialize telemetry config: {e}")
        sys.exit(1)
    
    # Perform requested action
    try:
        if args.action == 'status':
            show_status(config)
        elif args.action == 'enable':
            enable_telemetry(config)
        elif args.action == 'disable':
            disable_telemetry(config)
        elif args.action == 'show-data':
            show_collected_data(config)
        elif args.action == 'clear-data':
            clear_collected_data(config)
        elif args.action == 'export':
            export_data(config, args.output_file)
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Import datetime here to avoid circular imports
    from datetime import datetime
    main()