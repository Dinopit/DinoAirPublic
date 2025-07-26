#!/usr/bin/env python3
"""
Changelog Automation System
Automatically generates changelogs for DinoAir releases based on git commits and version tags.
"""

import os
import sys
import re
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum

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

def main():
    """Main entry point for changelog automation."""
    import argparse
    
    parser = argparse.ArgumentParser(description="DinoAir Changelog Automation")
    parser.add_argument("--version", help="Generate changelog for specific version")
    parser.add_argument("--full", action="store_true", help="Regenerate full changelog")
    parser.add_argument("--release-notes", help="Generate release notes for version")
    parser.add_argument("--config", help="Path to changelog configuration file")
    parser.add_argument("--repo", help="Path to git repository")
    
    args = parser.parse_args()
    
    generator = ChangelogGenerator(args.repo)
    
    if args.config:
        generator.config_path = Path(args.config)
        generator.config = generator._load_config()
        
    if args.release_notes:
        notes = generator.create_release_notes(args.release_notes)
        print(notes)
        
    elif args.version:
        success = generator.update_changelog(args.version)
        if not success:
            sys.exit(1)
            
    elif args.full:
        success = generator.update_changelog()
        if not success:
            sys.exit(1)
            
    else:
        print("Use --version, --full, or --release-notes to generate changelog")

if __name__ == "__main__":
    main()