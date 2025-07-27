#!/usr/bin/env python3
"""
Changelog Automation System
Automatically generates changelogs for DinoAir releases based on git commits and version tags.
"""

import sys
import re
import json
import subprocess
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from collections import Counter

class ChangeType(Enum):
    """Types of changes for changelog categorization."""
    FEATURE = "feat"
    FIX = "fix"
    DOCS = "docs"
    STYLE = "style"
    REFACTOR = "refactor"
    PERF = "perf"
    TEST = "test"
    CHORE = "chore"
    BREAKING = "breaking"
    SECURITY = "security"

@dataclass
class ChangelogEntry:
    """Represents a single changelog entry."""
    type: ChangeType
    scope: Optional[str]
    description: str
    commit_hash: str
    author: str
    date: datetime
    breaking_change: bool = False
    closes_issues: List[str] = None
    
    def __post_init__(self):
        if self.closes_issues is None:
            self.closes_issues = []

@dataclass
class ReleaseInfo:
    """Information about a release."""
    version: str
    date: datetime
    entries: List[ChangelogEntry]
    is_prerelease: bool = False
    
class ChangelogGenerator:
    """Generates changelogs from git history."""
    
    def __init__(self, repo_path: Optional[str] = None):
        self.repo_path = Path(repo_path) if repo_path else Path.cwd()
        self.changelog_path = self.repo_path / "CHANGELOG.md"
        self.config_path = self.repo_path / ".changelog-config.json"
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load changelog configuration."""
        default_config = {
            "title": "# Changelog",
            "description": "All notable changes to this project will be documented in this file.",
            "format": "keepachangelog",
            "sections": {
                "feat": "### ✨ Features",
                "fix": "### 🐛 Bug Fixes", 
                "docs": "### 📚 Documentation",
                "style": "### 💄 Styling",
                "refactor": "### ♻️ Code Refactoring",
                "perf": "### ⚡ Performance Improvements",
                "test": "### ✅ Tests",
                "chore": "### 🔧 Chores",
                "breaking": "### 💥 BREAKING CHANGES",
                "security": "### 🔒 Security"
            },
            "commit_patterns": {
                "conventional": r"^(?P<type>\w+)(?:\((?P<scope>[\w\-]+)\))?: (?P<description>.+)$",
                "breaking_change": r"BREAKING CHANGE:",
                "closes_issues": r"(?:closes?|fixes?|resolves?)\s+#(\d+)"
            },
            "ignore_patterns": [
                r"^Merge ",
                r"^Revert ",
                r"^chore\(release\):",
                r"^docs\(changelog\):"
            ]
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                print(f"Warning: Could not load changelog config: {e}")
                
        return default_config
        
    def _run_git_command(self, args: List[str]) -> str:
        """Run a git command and return the output."""
        try:
            result = subprocess.run(
                ["git"] + args,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Git command failed: {e}")
            
    def get_git_tags(self) -> List[Tuple[str, datetime]]:
        """Get all git tags with their dates."""
        try:
            # Get tags with dates
            output = self._run_git_command([
                "tag", "-l", "--sort=-version:refname", 
                "--format=%(refname:short)|%(creatordate:iso)"
            ])
            
            tags = []
            for line in output.split('\n'):
                if '|' in line:
                    tag, date_str = line.split('|', 1)
                    try:
                        date = datetime.fromisoformat(date_str.replace(' ', 'T'))
                        tags.append((tag, date))
                    except ValueError:
                        # Fallback to current date if parsing fails
                        tags.append((tag, datetime.now()))
                        
            return tags
            
        except Exception:
            return []
            
    def get_commits_between_tags(self, from_tag: Optional[str], to_tag: Optional[str]) -> List[str]:
        """Get commit hashes between two tags."""
        if from_tag and to_tag:
            range_spec = f"{from_tag}..{to_tag}"
        elif to_tag:
            range_spec = to_tag
        else:
            range_spec = "HEAD"
            
        try:
            output = self._run_git_command([
                "rev-list", "--reverse", range_spec
            ])
            return output.split('\n') if output else []
        except Exception:
            return []
            
    def parse_commit(self, commit_hash: str) -> Optional[ChangelogEntry]:
        """Parse a commit into a changelog entry."""
        try:
            # Get commit info
            commit_info = self._run_git_command([
                "show", "--format=%s|%an|%ai", "--no-patch", commit_hash
            ])
            
            if '|' not in commit_info:
                return None
                
            parts = commit_info.split('|')
            if len(parts) < 3:
                return None
                
            subject, author, date_str = parts[0], parts[1], parts[2]
            
            # Parse date
            try:
                date = datetime.fromisoformat(date_str.replace(' ', 'T'))
            except ValueError:
                date = datetime.now()
                
            # Check ignore patterns
            for pattern in self.config["ignore_patterns"]:
                if re.match(pattern, subject):
                    return None
                    
            # Parse conventional commit format
            pattern = self.config["commit_patterns"]["conventional"]
            match = re.match(pattern, subject)
            
            if match:
                type_str = match.group("type").lower()
                scope = match.group("scope")
                description = match.group("description")
                
                # Map type to ChangeType enum
                try:
                    change_type = ChangeType(type_str)
                except ValueError:
                    change_type = ChangeType.CHORE
                    
            else:
                # Fallback parsing for non-conventional commits
                if any(word in subject.lower() for word in ["fix", "bug", "patch"]):
                    change_type = ChangeType.FIX
                elif any(word in subject.lower() for word in ["feat", "feature", "add"]):
                    change_type = ChangeType.FEATURE
                elif any(word in subject.lower() for word in ["doc", "readme"]):
                    change_type = ChangeType.DOCS
                else:
                    change_type = ChangeType.CHORE
                    
                scope = None
                description = subject
                
            # Check for breaking changes
            commit_body = self._run_git_command([
                "show", "--format=%B", "--no-patch", commit_hash
            ])
            
            breaking_change = bool(re.search(
                self.config["commit_patterns"]["breaking_change"], 
                commit_body, 
                re.IGNORECASE
            ))
            
            if breaking_change:
                change_type = ChangeType.BREAKING
                
            # Extract closed issues
            closes_issues = re.findall(
                self.config["commit_patterns"]["closes_issues"],
                commit_body,
                re.IGNORECASE
            )
            
            return ChangelogEntry(
                type=change_type,
                scope=scope,
                description=description,
                commit_hash=commit_hash[:8],
                author=author,
                date=date,
                breaking_change=breaking_change,
                closes_issues=closes_issues
            )
            
        except Exception as e:
            print(f"Warning: Could not parse commit {commit_hash}: {e}")
            return None
            
    def generate_release_changelog(self, version: str, from_tag: Optional[str] = None) -> ReleaseInfo:
        """Generate changelog for a specific release."""
        # Get commits for this release
        commits = self.get_commits_between_tags(from_tag, version)
        
        # Parse commits into changelog entries
        entries = []
        for commit_hash in commits:
            entry = self.parse_commit(commit_hash)
            if entry:
                entries.append(entry)
                
        # Determine release date
        tags = self.get_git_tags()
        release_date = datetime.now()
        for tag, date in tags:
            if tag == version:
                release_date = date
                break
                
        return ReleaseInfo(
            version=version,
            date=release_date,
            entries=entries,
            is_prerelease=bool(re.search(r'(alpha|beta|rc)', version, re.IGNORECASE))
        )
        
    def format_changelog_entry(self, entry: ChangelogEntry) -> str:
        """Format a single changelog entry."""
        # Build the entry text
        parts = []
        
        if entry.scope:
            parts.append(f"**{entry.scope}**: {entry.description}")
        else:
            parts.append(entry.description)
            
        # Add commit hash
        parts.append(f"([{entry.commit_hash}])")
        
        # Add closed issues
        if entry.closes_issues:
            issues_text = ", ".join([f"#{issue}" for issue in entry.closes_issues])
            parts.append(f"(closes {issues_text})")
            
        return "- " + " ".join(parts)
        
    def format_release_changelog(self, release: ReleaseInfo) -> str:
        """Format a complete release changelog."""
        lines = []
        
        # Release header
        date_str = release.date.strftime("%Y-%m-%d")
        if release.is_prerelease:
            lines.append(f"## [{release.version}] - {date_str} (Pre-release)")
        else:
            lines.append(f"## [{release.version}] - {date_str}")
            
        lines.append("")
        
        # Group entries by type
        grouped_entries = {}
        for entry in release.entries:
            if entry.type not in grouped_entries:
                grouped_entries[entry.type] = []
            grouped_entries[entry.type].append(entry)
            
        # Sort sections by importance
        section_order = [
            ChangeType.BREAKING,
            ChangeType.SECURITY,
            ChangeType.FEATURE,
            ChangeType.FIX,
            ChangeType.PERF,
            ChangeType.REFACTOR,
            ChangeType.DOCS,
            ChangeType.TEST,
            ChangeType.STYLE,
            ChangeType.CHORE
        ]
        
        for change_type in section_order:
            if change_type in grouped_entries:
                entries = grouped_entries[change_type]
                section_title = self.config["sections"].get(change_type.value, f"### {change_type.value.title()}")
                
                lines.append(section_title)
                lines.append("")
                
                for entry in sorted(entries, key=lambda e: e.date):
                    lines.append(self.format_changelog_entry(entry))
                    
                lines.append("")
                
        return "\n".join(lines)
        
    def generate_full_changelog(self) -> str:
        """Generate the complete changelog."""
        lines = []
        
        # Header
        lines.append(self.config["title"])
        lines.append("")
        lines.append(self.config["description"])
        lines.append("")
        lines.append("The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),")
        lines.append("and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).")
        lines.append("")
        
        # Get all tags
        tags = self.get_git_tags()
        
        if not tags:
            # No tags, generate unreleased section
            unreleased = self.generate_release_changelog("HEAD", None)
            if unreleased.entries:
                lines.append("## [Unreleased]")
                lines.append("")
                lines.extend(self.format_release_changelog(unreleased).split('\n')[2:])  # Skip header
                
        else:
            # Generate changelog for each release
            prev_tag = None
            
            for i, (tag, date) in enumerate(tags):
                release = self.generate_release_changelog(tag, prev_tag)
                if release.entries:
                    lines.append(self.format_release_changelog(release))
                    
                prev_tag = tag
                
        return "\n".join(lines)
        
    def update_changelog(self, version: Optional[str] = None) -> bool:
        """Update the changelog file."""
        try:
            if version:
                # Update for specific version
                prev_tags = self.get_git_tags()
                prev_tag = prev_tags[0][0] if prev_tags else None
                
                release = self.generate_release_changelog(version, prev_tag)
                new_content = self.format_release_changelog(release)
                
                # Insert into existing changelog
                if self.changelog_path.exists():
                    with open(self.changelog_path, 'r', encoding='utf-8') as f:
                        existing_content = f.read()
                        
                    # Find insertion point (after header)
                    lines = existing_content.split('\n')
                    insert_index = 0
                    
                    for i, line in enumerate(lines):
                        if line.startswith('## '):
                            insert_index = i
                            break
                    else:
                        # No existing releases, insert after header
                        for i, line in enumerate(lines):
                            if line.strip() == "":
                                insert_index = i + 1
                                break
                                
                    # Insert new release
                    new_lines = lines[:insert_index] + new_content.split('\n') + [''] + lines[insert_index:]
                    final_content = '\n'.join(new_lines)
                    
                else:
                    # Create new changelog
                    header = f"{self.config['title']}\n\n{self.config['description']}\n\n"
                    final_content = header + new_content
                    
            else:
                # Regenerate full changelog
                final_content = self.generate_full_changelog()
                
            # Write changelog
            with open(self.changelog_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
                
            print(f"Changelog updated: {self.changelog_path}")
            return True
            
        except Exception as e:
            print(f"Error updating changelog: {e}")
            return False
            
    def create_release_notes(self, version: str) -> str:
        """Create release notes for a specific version."""
        tags = self.get_git_tags()
        prev_tag = None
        
        for i, (tag, date) in enumerate(tags):
            if tag == version:
                if i + 1 < len(tags):
                    prev_tag = tags[i + 1][0]
                break
                
        release = self.generate_release_changelog(version, prev_tag)
        return self.format_release_changelog(release)
    
    def generate_release_statistics(self, version: Optional[str] = None) -> Dict[str, Any]:
        """Generate statistics for a release or all releases."""
        if version:
            # Statistics for specific version
            tags = self.get_git_tags()
            prev_tag = None
            
            for i, (tag, date) in enumerate(tags):
                if tag == version:
                    if i + 1 < len(tags):
                        prev_tag = tags[i + 1][0]
                    break
            
            release = self.generate_release_changelog(version, prev_tag)
            entries = release.entries
        else:
            # Statistics for all releases
            entries = []
            tags = self.get_git_tags()
            prev_tag = None
            
            for tag, date in tags:
                release = self.generate_release_changelog(tag, prev_tag)
                entries.extend(release.entries)
                prev_tag = tag
        
        # Calculate statistics
        stats = {
            'total_changes': len(entries),
            'by_type': Counter(entry.type.value for entry in entries),
            'by_author': Counter(entry.author for entry in entries),
            'breaking_changes': sum(1 for entry in entries if entry.breaking_change),
            'issues_closed': sum(len(entry.closes_issues) for entry in entries),
            'date_range': {
                'start': min(entry.date for entry in entries) if entries else None,
                'end': max(entry.date for entry in entries) if entries else None
            }
        }
        
        # Add scope statistics if available
        scopes = [entry.scope for entry in entries if entry.scope]
        if scopes:
            stats['by_scope'] = Counter(scopes)
        
        return stats
    
    def generate_release_summary(self, version: str) -> str:
        """Generate a comprehensive release summary."""
        stats = self.generate_release_statistics(version)
        release_notes = self.create_release_notes(version)
        
        summary_lines = [
            f"# Release Summary: {version}",
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## 📊 Statistics",
            f"- **Total Changes**: {stats['total_changes']}",
            f"- **Breaking Changes**: {stats['breaking_changes']}",
            f"- **Issues Closed**: {stats['issues_closed']}",
            ""
        ]
        
        # Add change type breakdown
        if stats['by_type']:
            summary_lines.extend([
                "### Changes by Type",
                ""
            ])
            for change_type, count in stats['by_type'].most_common():
                emoji = {
                    'feat': '✨', 'fix': '🐛', 'docs': '📚', 'style': '💄',
                    'refactor': '♻️', 'perf': '⚡', 'test': '✅', 'chore': '🔧',
                    'breaking': '💥', 'security': '🔒'
                }.get(change_type, '📝')
                summary_lines.append(f"- {emoji} **{change_type.title()}**: {count}")
            summary_lines.append("")
        
        # Add contributor breakdown
        if stats['by_author']:
            summary_lines.extend([
                "### Contributors",
                ""
            ])
            for author, count in stats['by_author'].most_common():
                summary_lines.append(f"- **{author}**: {count} changes")
            summary_lines.append("")
        
        # Add scope breakdown if available
        if 'by_scope' in stats and stats['by_scope']:
            summary_lines.extend([
                "### Changes by Scope",
                ""
            ])
            for scope, count in stats['by_scope'].most_common():
                summary_lines.append(f"- **{scope}**: {count} changes")
            summary_lines.append("")
        
        # Add date range
        if stats['date_range']['start'] and stats['date_range']['end']:
            start_date = stats['date_range']['start'].strftime('%Y-%m-%d')
            end_date = stats['date_range']['end'].strftime('%Y-%m-%d')
            duration = (stats['date_range']['end'] - stats['date_range']['start']).days
            summary_lines.extend([
                "### Development Timeline",
                f"- **Start Date**: {start_date}",
                f"- **End Date**: {end_date}",
                f"- **Duration**: {duration} days",
                ""
            ])
        
        # Add detailed changelog
        summary_lines.extend([
            "## 📝 Detailed Changelog",
            "",
            release_notes
        ])
        
        return "\n".join(summary_lines)
    
    def export_release_data(self, version: str, format: str = 'json') -> str:
        """Export release data in various formats."""
        tags = self.get_git_tags()
        prev_tag = None
        
        for i, (tag, date) in enumerate(tags):
            if tag == version:
                if i + 1 < len(tags):
                    prev_tag = tags[i + 1][0]
                break
        
        release = self.generate_release_changelog(version, prev_tag)
        stats = self.generate_release_statistics(version)
        
        data = {
            'version': version,
            'date': release.date.isoformat(),
            'is_prerelease': release.is_prerelease,
            'statistics': {
                'total_changes': stats['total_changes'],
                'breaking_changes': stats['breaking_changes'],
                'issues_closed': stats['issues_closed'],
                'by_type': dict(stats['by_type']),
                'by_author': dict(stats['by_author'])
            },
            'changes': [
                {
                    'type': entry.type.value,
                    'scope': entry.scope,
                    'description': entry.description,
                    'commit_hash': entry.commit_hash,
                    'author': entry.author,
                    'date': entry.date.isoformat(),
                    'breaking_change': entry.breaking_change,
                    'closes_issues': entry.closes_issues
                }
                for entry in release.entries
            ]
        }
        
        if format.lower() == 'json':
            return json.dumps(data, indent=2, ensure_ascii=False)
        elif format.lower() == 'yaml':
            # Simple YAML-like output without external dependencies
            def dict_to_yaml(d, indent=0):
                lines = []
                for key, value in d.items():
                    prefix = "  " * indent
                    if isinstance(value, dict):
                        lines.append(f"{prefix}{key}:")
                        lines.append(dict_to_yaml(value, indent + 1))
                    elif isinstance(value, list):
                        lines.append(f"{prefix}{key}:")
                        for item in value:
                            if isinstance(item, dict):
                                lines.append(f"{prefix}  -")
                                lines.append(dict_to_yaml(item, indent + 2))
                            else:
                                lines.append(f"{prefix}  - {item}")
                    else:
                        lines.append(f"{prefix}{key}: {value}")
                return "\n".join(lines)
            
            return dict_to_yaml(data)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def create_migration_guide(self, from_version: str, to_version: str) -> str:
        """Create a migration guide between two versions."""
        # Get changes between versions
        tags = self.get_git_tags()
        tag_dict = {tag: date for tag, date in tags}
        
        if from_version not in tag_dict or to_version not in tag_dict:
            raise ValueError("One or both versions not found in git tags")
        
        # Get all releases between versions
        migration_entries = []
        collecting = False
        
        for tag, date in tags:
            if tag == to_version:
                collecting = True
            
            if collecting and tag != from_version:
                release = self.generate_release_changelog(tag)
                migration_entries.extend(release.entries)
            
            if tag == from_version:
                break
        
        # Filter for breaking changes and important updates
        breaking_changes = [e for e in migration_entries if e.breaking_change]
        feature_changes = [e for e in migration_entries if e.type == ChangeType.FEATURE]
        
        guide_lines = [
            f"# Migration Guide: {from_version} → {to_version}",
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Overview",
            f"This guide helps you migrate from version {from_version} to {to_version}.",
            ""
        ]
        
        if breaking_changes:
            guide_lines.extend([
                "## 💥 Breaking Changes",
                "",
                "**⚠️ Important: These changes require action on your part.**",
                ""
            ])
            
            for entry in breaking_changes:
                guide_lines.extend([
                    f"### {entry.description}",
                    f"- **Commit**: `{entry.commit_hash[:8]}`",
                    f"- **Author**: {entry.author}",
                    f"- **Date**: {entry.date.strftime('%Y-%m-%d')}",
                    ""
                ])
        
        if feature_changes:
            guide_lines.extend([
                "## ✨ New Features",
                "",
                "These new features are available in the latest version:",
                ""
            ])
            
            for entry in feature_changes:
                scope_text = f" ({entry.scope})" if entry.scope else ""
                guide_lines.append(f"- {entry.description}{scope_text}")
            
            guide_lines.append("")
        
        # Add general migration steps
        guide_lines.extend([
            "## 🚀 Migration Steps",
            "",
            "1. **Backup your current installation**",
            "   ```bash",
            "   # Create a backup of your current setup",
            "   cp -r /path/to/dinoair /path/to/dinoair-backup",
            "   ```",
            "",
            "2. **Update to the new version**",
            "   ```bash",
            "   # Pull the latest changes",
            "   git fetch --tags",
            f"   git checkout {to_version}",
            "   ```",
            "",
            "3. **Update dependencies**",
            "   ```bash",
            "   # Update Python dependencies",
            "   pip install -r requirements.txt",
            "   ",
            "   # Update Node.js dependencies",
            "   cd web-gui && npm install",
            "   ```",
            "",
            "4. **Run migration scripts (if any)**",
            "   ```bash",
            "   # Check for and run any migration scripts",
            "   python migrate.py",
            "   ```",
            "",
            "5. **Test your installation**",
            "   ```bash",
            "   # Run tests to ensure everything works",
            "   python -m pytest tests/",
            "   ```",
            ""
        ])
        
        if breaking_changes:
            guide_lines.extend([
                "## ⚠️ Post-Migration Checklist",
                "",
                "After migrating, please verify:",
                ""
            ])
            
            for entry in breaking_changes:
                guide_lines.append(f"- [ ] Addressed breaking change: {entry.description}")
            
            guide_lines.extend([
                "- [ ] All tests pass",
                "- [ ] Application starts successfully",
                "- [ ] Core functionality works as expected",
                ""
            ])
        
        guide_lines.extend([
            "## 🆘 Need Help?",
            "",
            "If you encounter issues during migration:",
            "",
            "- Check the [troubleshooting guide](TROUBLESHOOTING.md)",
            "- Review the [full changelog](CHANGELOG.md)",
            "- Open an issue on [GitHub](https://github.com/Dinopit/DinoAirPublic/issues)",
            "- Join our [Discord community](https://discord.gg/dinoair)",
            ""
        ])
        
        return "\n".join(guide_lines)

def main():
    """Main entry point for enhanced changelog automation."""
    parser = argparse.ArgumentParser(
        description="DinoAir Enhanced Changelog Automation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --version v1.2.0                    # Generate changelog for specific version
  %(prog)s --full                              # Regenerate full changelog
  %(prog)s --release-notes v1.2.0              # Generate release notes
  %(prog)s --stats v1.2.0                      # Show release statistics
  %(prog)s --summary v1.2.0                    # Generate comprehensive release summary
  %(prog)s --export v1.2.0 --format json       # Export release data as JSON
  %(prog)s --migration v1.1.0 v1.2.0           # Generate migration guide
        """
    )
    
    # Basic operations
    parser.add_argument("--version", help="Generate changelog for specific version")
    parser.add_argument("--full", action="store_true", help="Regenerate full changelog")
    parser.add_argument("--release-notes", help="Generate release notes for version")
    
    # Enhanced features
    parser.add_argument("--stats", help="Generate statistics for version (or all if no version)")
    parser.add_argument("--summary", help="Generate comprehensive release summary")
    parser.add_argument("--export", help="Export release data for version")
    parser.add_argument("--format", choices=['json', 'yaml'], default='json', 
                       help="Export format (default: json)")
    parser.add_argument("--migration", nargs=2, metavar=('FROM', 'TO'),
                       help="Generate migration guide between two versions")
    
    # Configuration
    parser.add_argument("--config", help="Path to changelog configuration file")
    parser.add_argument("--repo", help="Path to git repository")
    parser.add_argument("--output", help="Output file path (default: stdout)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Initialize generator
    try:
        generator = ChangelogGenerator(args.repo)
        
        if args.config:
            generator.config_path = Path(args.config)
            generator.config = generator._load_config()
            
        if args.verbose:
            print(f"Repository: {generator.repo_path}")
            print(f"Changelog: {generator.changelog_path}")
            print(f"Config: {generator.config_path}")
            print()
            
    except Exception as e:
        print(f"Error initializing changelog generator: {e}", file=sys.stderr)
        sys.exit(1)
    
    output_content = None
    
    try:
        # Handle different operations
        if args.migration:
            from_version, to_version = args.migration
            if args.verbose:
                print(f"Generating migration guide: {from_version} → {to_version}")
            output_content = generator.create_migration_guide(from_version, to_version)
            
        elif args.export:
            if args.verbose:
                print(f"Exporting release data for {args.export} in {args.format} format")
            output_content = generator.export_release_data(args.export, args.format)
            
        elif args.summary:
            if args.verbose:
                print(f"Generating release summary for {args.summary}")
            output_content = generator.generate_release_summary(args.summary)
            
        elif args.stats:
            if args.verbose:
                print(f"Generating statistics for {args.stats}")
            stats = generator.generate_release_statistics(args.stats)
            
            # Format statistics for display
            stats_lines = [
                f"📊 Release Statistics: {args.stats}",
                f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "",
                f"Total Changes: {stats['total_changes']}",
                f"Breaking Changes: {stats['breaking_changes']}",
                f"Issues Closed: {stats['issues_closed']}",
                ""
            ]
            
            if stats['by_type']:
                stats_lines.append("Changes by Type:")
                for change_type, count in stats['by_type'].most_common():
                    stats_lines.append(f"  {change_type}: {count}")
                stats_lines.append("")
            
            if stats['by_author']:
                stats_lines.append("Changes by Author:")
                for author, count in stats['by_author'].most_common():
                    stats_lines.append(f"  {author}: {count}")
                stats_lines.append("")
            
            if 'by_scope' in stats:
                stats_lines.append("Changes by Scope:")
                for scope, count in stats['by_scope'].most_common():
                    stats_lines.append(f"  {scope}: {count}")
                stats_lines.append("")
            
            if stats['date_range']['start'] and stats['date_range']['end']:
                start_date = stats['date_range']['start'].strftime('%Y-%m-%d')
                end_date = stats['date_range']['end'].strftime('%Y-%m-%d')
                duration = (stats['date_range']['end'] - stats['date_range']['start']).days
                stats_lines.extend([
                    f"Development Period: {start_date} to {end_date} ({duration} days)",
                    ""
                ])
            
            output_content = "\n".join(stats_lines)
            
        elif args.release_notes:
            if args.verbose:
                print(f"Generating release notes for {args.release_notes}")
            output_content = generator.create_release_notes(args.release_notes)
            
        elif args.version:
            if args.verbose:
                print(f"Updating changelog for version {args.version}")
            success = generator.update_changelog(args.version)
            if not success:
                sys.exit(1)
            print(f"✅ Changelog updated for version {args.version}")
            
        elif args.full:
            if args.verbose:
                print("Regenerating full changelog")
            success = generator.update_changelog()
            if not success:
                sys.exit(1)
            print("✅ Full changelog regenerated")
            
        else:
            parser.print_help()
            sys.exit(1)
        
        # Output content if generated
        if output_content:
            if args.output:
                output_path = Path(args.output)
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(output_content)
                print(f"✅ Output written to {output_path}")
            else:
                print(output_content)
                
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()