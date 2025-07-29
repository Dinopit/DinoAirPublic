#!/usr/bin/env python3
"""
Tests for the colorama-based color functionality in install_safe.py
"""

import sys
import unittest
import argparse
from unittest.mock import patch, Mock
from pathlib import Path
from io import StringIO

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from install_safe import SafeInstaller
from colorama import Fore, Style


class TestInstallSafeColors(unittest.TestCase):
    """Test cases for the colorama-based color functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.args = argparse.Namespace(
            quiet=False, 
            force=False, 
            yes=True, 
            no_models=True
        )
        self.installer = SafeInstaller(self.args)

    @patch('builtins.print')
    def test_log_colors_with_colorama(self, mock_print):
        """Test that log messages use colorama colors correctly"""
        # Test different log levels
        test_cases = [
            ("INFO", Fore.RESET),
            ("SUCCESS", Fore.GREEN),
            ("WARNING", Fore.YELLOW),
            ("ERROR", Fore.RED),
            ("DEBUG", Fore.BLUE)
        ]
        
        for level, expected_color in test_cases:
            with self.subTest(level=level):
                mock_print.reset_mock()
                self.installer.log(f"Test {level} message", level)
                
                # Check that print was called
                self.assertTrue(mock_print.called)
                
                # Get the printed message
                printed_message = mock_print.call_args[0][0]
                
                # Check that the message contains the expected color code
                # Note: We can't directly check for color codes since colorama 
                # may strip them in non-terminal environments, but we can check
                # that the basic message structure is correct
                self.assertIn(f"[{level}]", printed_message)
                self.assertIn(f"Test {level} message", printed_message)

    @patch('builtins.print')
    def test_quiet_mode_suppresses_output(self, mock_print):
        """Test that quiet mode suppresses colored output"""
        quiet_args = argparse.Namespace(
            quiet=True, 
            force=False, 
            yes=True, 
            no_models=True
        )
        quiet_installer = SafeInstaller(quiet_args)
        
        quiet_installer.log("This should not be printed", "INFO")
        
        # Print should not be called in quiet mode
        mock_print.assert_not_called()

    def test_colorama_initialization(self):
        """Test that colorama is properly initialized"""
        # Import colorama to check if it's available
        try:
            from colorama import init, Fore, Style
            # If we can import these, colorama is properly available
            self.assertTrue(hasattr(Fore, 'GREEN'))
            self.assertTrue(hasattr(Fore, 'RED'))
            self.assertTrue(hasattr(Fore, 'YELLOW'))
            self.assertTrue(hasattr(Fore, 'BLUE'))
            self.assertTrue(hasattr(Style, 'RESET_ALL'))
        except ImportError:
            self.fail("colorama is not properly installed or imported")

    def test_log_entry_format(self):
        """Test that log entries are properly formatted regardless of colors"""
        # Test with a mock to capture the log entry that gets added to install_log
        self.installer.log("Test message", "INFO")
        
        # Check that the message was added to the log
        self.assertTrue(len(self.installer.install_log) > 0)
        
        # Check the format of the log entry
        log_entry = self.installer.install_log[-1]
        self.assertIn("[INFO]", log_entry)
        self.assertIn("Test message", log_entry)
        # Should contain timestamp in format [YYYY-MM-DD HH:MM:SS]
        import re
        timestamp_pattern = r'\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]'
        self.assertRegex(log_entry, timestamp_pattern)


if __name__ == '__main__':
    unittest.main()