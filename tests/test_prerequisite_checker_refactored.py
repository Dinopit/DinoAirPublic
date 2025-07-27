#!/usr/bin/env python3
"""
Tests for the refactored prerequisite checker functions
"""

import sys
import os
import unittest
from unittest.mock import patch, Mock
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.installation.prerequisite_checker import (
    PrerequisiteChecker, CheckStatus
)

class TestPrerequisiteCheckerRefactored(unittest.TestCase):
    """Test suite for refactored PrerequisiteChecker methods"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.checker = PrerequisiteChecker(verbose=False)
    
    def test_check_node_availability_and_version_not_found(self):
        """Test Node.js check when not found"""
        with patch.object(self.checker, '_find_executable', return_value=[]):
            node_info, error_result = self.checker._check_node_availability_and_version()
            
            self.assertIsNone(node_info)
            self.assertIsNotNone(error_result)
            self.assertEqual(error_result.status, CheckStatus.FAILED)
            self.assertIn("Node.js not found", error_result.message)
    
    def test_check_node_availability_and_version_no_version(self):
        """Test Node.js check when version cannot be determined"""
        with patch.object(self.checker, '_find_executable', return_value=['/usr/bin/node']):
            with patch.object(self.checker, '_get_version', return_value=None):
                node_info, error_result = self.checker._check_node_availability_and_version()
                
                self.assertIsNone(node_info)
                self.assertIsNotNone(error_result)
                self.assertEqual(error_result.status, CheckStatus.FAILED)
                self.assertIn("Could not determine Node.js version", error_result.message)
    
    def test_check_node_availability_and_version_success(self):
        """Test successful Node.js check"""
        with patch.object(self.checker, '_find_executable', return_value=['/usr/bin/node']):
            with patch.object(self.checker, '_get_version', return_value='v18.17.0'):
                node_info, error_result = self.checker._check_node_availability_and_version()
                
                self.assertIsNotNone(node_info)
                self.assertIsNone(error_result)
                self.assertEqual(node_info, ('/usr/bin/node', 'v18.17.0'))
    
    def test_evaluate_node_version_meets_minimum(self):
        """Test Node.js version evaluation when meets minimum"""
        with patch.object(self.checker, '_parse_version', return_value=(18, 17, 0)):
            status, message = self.checker._evaluate_node_version('v18.17.0')
            
            self.assertEqual(status, CheckStatus.PASSED)
            self.assertEqual(message, 'Node.js v18.17.0')
    
    def test_evaluate_node_version_below_minimum(self):
        """Test Node.js version evaluation when below minimum"""
        with patch.object(self.checker, '_parse_version', return_value=(14, 0, 0)):
            status, message = self.checker._evaluate_node_version('v14.0.0')
            
            self.assertEqual(status, CheckStatus.WARNING)
            self.assertIn('minimum recommended', message)
    
    def test_check_npm_availability_and_version_not_found(self):
        """Test npm check when not found"""
        with patch.object(self.checker, '_find_npm', return_value=[]):
            npm_info, error_result = self.checker._check_npm_availability_and_version('Node.js v18.17.0')
            
            self.assertIsNone(npm_info)
            self.assertIsNotNone(error_result)
            self.assertEqual(error_result.status, CheckStatus.FAILED)
            self.assertIn("npm not found", error_result.message)
    
    def test_check_npm_availability_and_version_success(self):
        """Test successful npm check"""
        with patch.object(self.checker, '_find_npm', return_value=['/usr/bin/npm']):
            with patch.object(self.checker, '_get_version', return_value='9.8.1'):
                npm_info, error_result = self.checker._check_npm_availability_and_version('Node.js v18.17.0')
                
                self.assertIsNotNone(npm_info)
                self.assertIsNone(error_result)
                self.assertEqual(npm_info, ('/usr/bin/npm', '9.8.1'))
    
    def test_create_nodejs_result_with_version(self):
        """Test creating Node.js result when npm version is available"""
        node_info = ('/usr/bin/node', 'v18.17.0')
        npm_info = ('/usr/bin/npm', '9.8.1')
        
        result = self.checker._create_nodejs_result(node_info, npm_info, CheckStatus.PASSED, 'Node.js v18.17.0')
        
        self.assertEqual(result.status, CheckStatus.PASSED)
        self.assertIn('npm 9.8.1', result.message)
        self.assertIn('node_path', result.details)
        self.assertIn('npm_version', result.details)
    
    def test_create_nodejs_result_without_version(self):
        """Test creating Node.js result when npm version is unknown"""
        node_info = ('/usr/bin/node', 'v18.17.0')
        npm_info = ('/usr/bin/npm', None)
        
        result = self.checker._create_nodejs_result(node_info, npm_info, CheckStatus.PASSED, 'Node.js v18.17.0')
        
        self.assertEqual(result.status, CheckStatus.WARNING)
        self.assertIn('version unknown', result.message)
        self.assertNotIn('npm_version', result.details)

class TestExecutableFinding(unittest.TestCase):
    """Test suite for executable finding methods"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.checker = PrerequisiteChecker(verbose=False)
    
    def test_get_windows_search_paths(self):
        """Test getting Windows search paths"""
        with patch.dict(os.environ, {'ProgramFiles': 'C:\\Program Files', 'APPDATA': 'C:\\Users\\test\\AppData\\Roaming'}):
            paths = self.checker._get_windows_search_paths()
            
            self.assertIn('C:\\Program Files', paths)
            self.assertIn('C:\\Users\\test\\AppData\\Roaming', paths)
    
    @patch('os.path.exists')
    def test_search_windows_paths_found(self, mock_exists):
        """Test searching Windows paths when executables are found"""
        mock_exists.return_value = True
        search_paths = ['C:\\Program Files']
        
        found_paths = self.checker._search_windows_paths('node', search_paths)
        
        self.assertTrue(len(found_paths) > 0)
        # Should find node.exe, node.cmd, node.bat
        self.assertTrue(any('node.exe' in path for path in found_paths))
    
    @patch('os.path.exists')
    def test_search_windows_paths_not_found(self, mock_exists):
        """Test searching Windows paths when no executables are found"""
        mock_exists.return_value = False
        search_paths = ['C:\\Program Files']
        
        found_paths = self.checker._search_windows_paths('node', search_paths)
        
        self.assertEqual(len(found_paths), 0)
    
    @patch('platform.system')
    @patch('shutil.which')
    def test_find_executable_path_only(self, mock_which, mock_system):
        """Test finding executable when only in PATH"""
        mock_system.return_value = 'Linux'
        mock_which.return_value = '/usr/bin/node'
        
        paths = self.checker._find_executable('node')
        
        self.assertEqual(paths, ['/usr/bin/node'])
    
    @patch('platform.system')
    @patch('shutil.which')
    @patch.object(PrerequisiteChecker, '_get_windows_search_paths')
    @patch.object(PrerequisiteChecker, '_search_windows_paths')
    def test_find_executable_windows(self, mock_search_windows, mock_get_paths, mock_which, mock_system):
        """Test finding executable on Windows"""
        mock_system.return_value = 'Windows'
        mock_which.return_value = None
        mock_get_paths.return_value = ['C:\\Program Files']
        mock_search_windows.return_value = ['C:\\Program Files\\nodejs\\node.exe']
        
        paths = self.checker._find_executable('node')
        
        self.assertEqual(paths, ['C:\\Program Files\\nodejs\\node.exe'])
        mock_search_windows.assert_called_once_with('node', ['C:\\Program Files'])
    
    @patch('platform.system')
    def test_get_npm_specific_paths_windows(self, mock_system):
        """Test getting npm-specific paths on Windows"""
        mock_system.return_value = 'Windows'
        with patch.dict(os.environ, {'APPDATA': 'C:\\Users\\test\\AppData\\Roaming'}):
            paths = self.checker._get_npm_specific_paths()
            
            self.assertTrue(any('npm.cmd' in path for path in paths))
            self.assertTrue(any('AppData' in path for path in paths))
    
    @patch('platform.system')
    @patch('os.path.expanduser')
    def test_get_npm_specific_paths_unix(self, mock_expanduser, mock_system):
        """Test getting npm-specific paths on Unix"""
        mock_system.return_value = 'Linux'
        mock_expanduser.return_value = '/home/user/.npm-global/bin/npm'
        
        paths = self.checker._get_npm_specific_paths()
        
        self.assertIn('/usr/local/lib/node_modules/npm/bin/npm-cli.js', paths)
        self.assertIn('/home/user/.npm-global/bin/npm', paths)
    
    @patch('os.path.exists')
    @patch.object(PrerequisiteChecker, '_find_executable')
    @patch.object(PrerequisiteChecker, '_get_npm_specific_paths')
    def test_find_npm_with_additional_paths(self, mock_get_npm_paths, mock_find_executable, mock_exists):
        """Test finding npm with additional paths"""
        mock_find_executable.return_value = ['/usr/bin/npm']
        mock_get_npm_paths.return_value = ['/usr/local/lib/node_modules/npm/bin/npm-cli.js']
        mock_exists.return_value = True
        
        npm_paths = self.checker._find_npm()
        
        self.assertIn('/usr/bin/npm', npm_paths)
        self.assertIn('/usr/local/lib/node_modules/npm/bin/npm-cli.js', npm_paths)

class TestVersionParsing(unittest.TestCase):
    """Test suite for version parsing methods"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.checker = PrerequisiteChecker(verbose=False)
    
    @patch('subprocess.run')
    def test_get_version_success(self, mock_run):
        """Test successful version retrieval"""
        mock_run.return_value = Mock(returncode=0, stdout='v18.17.0\n')
        
        version = self.checker._get_version('/usr/bin/node', '--version')
        
        self.assertEqual(version, 'v18.17.0')
    
    @patch('subprocess.run')
    def test_get_version_failure(self, mock_run):
        """Test version retrieval failure"""
        mock_run.return_value = Mock(returncode=1, stdout='')
        
        version = self.checker._get_version('/usr/bin/node', '--version')
        
        self.assertIsNone(version)
    
    @patch('subprocess.run')
    def test_get_version_exception(self, mock_run):
        """Test version retrieval with exception"""
        mock_run.side_effect = Exception('Command failed')
        
        version = self.checker._get_version('/usr/bin/node', '--version')
        
        self.assertIsNone(version)
    
    def test_parse_version_standard(self):
        """Test parsing standard version string"""
        version_tuple = self.checker._parse_version('18.17.0')
        
        self.assertEqual(version_tuple, (18, 17, 0))
    
    def test_parse_version_with_v_prefix(self):
        """Test parsing version string with 'v' prefix"""
        version_tuple = self.checker._parse_version('v18.17.0')
        
        self.assertEqual(version_tuple, (18, 17, 0))
    
    def test_parse_version_extra_parts(self):
        """Test parsing version string with extra parts"""
        version_tuple = self.checker._parse_version('18.17.0-beta.1')
        
        self.assertEqual(version_tuple, (18, 17, 0))  # Should only take first 3 parts
    
    def test_parse_version_invalid(self):
        """Test parsing invalid version string"""
        version_tuple = self.checker._parse_version('invalid.version')
        
        self.assertIsNone(version_tuple)

if __name__ == '__main__':
    unittest.main()