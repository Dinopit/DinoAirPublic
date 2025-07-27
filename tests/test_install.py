#!/usr/bin/env python3
"""
Tests for the refactored install.py functions
"""

import sys
import unittest
from unittest.mock import patch, Mock
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import install

class TestInstallFunctions(unittest.TestCase):
    """Test suite for refactored install.py functions"""
    
    def test_parse_command_line_args_default(self):
        """Test command line argument parsing with defaults"""
        with patch('sys.argv', ['install.py']):
            args = install.parse_command_line_args()
            self.assertFalse(args.no_models)
    
    def test_parse_command_line_args_no_models(self):
        """Test command line argument parsing with --no-models flag"""
        with patch('sys.argv', ['install.py', '--no-models']):
            args = install.parse_command_line_args()
            self.assertTrue(args.no_models)
    
    @patch('builtins.print')
    def test_print_installation_banner_default(self, mock_print):
        """Test installation banner without skip_models flag"""
        install.print_installation_banner()
        
        # Check that banner was printed
        mock_print.assert_any_call("="*60)
        mock_print.assert_any_call("DinoAir Free Tier Installation")
        mock_print.assert_any_call("="*60)
        
        # Check that no-models message was not printed
        call_args_list = [str(call) for call in mock_print.call_args_list]
        self.assertFalse(any("--no-models" in call_str for call_str in call_args_list))
    
    @patch('builtins.print')
    def test_print_installation_banner_skip_models(self, mock_print):
        """Test installation banner with skip_models flag"""
        install.print_installation_banner(skip_models=True)
        
        # Check that no-models message was printed
        mock_print.assert_any_call("\n--no-models flag detected: Will skip model downloads")
    
    @patch('install.check_ollama')
    @patch('install.check_pip_version')
    @patch('install.check_python_version')
    def test_validate_system_prerequisites_success(self, mock_check_python, mock_check_pip, mock_check_ollama):
        """Test successful prerequisite validation"""
        mock_check_ollama.return_value = True
        
        result = install.validate_system_prerequisites()
        
        self.assertTrue(result)
        mock_check_python.assert_called_once()
        mock_check_pip.assert_called_once()
        mock_check_ollama.assert_called_once()
    
    @patch('install.check_ollama')
    @patch('install.check_pip_version')
    @patch('install.check_python_version')
    @patch('sys.exit')
    @patch('builtins.print')
    def test_validate_system_prerequisites_ollama_missing_models_needed(self, mock_print, mock_exit, mock_check_python, mock_check_pip, mock_check_ollama):
        """Test prerequisite validation when Ollama missing and models needed"""
        mock_check_ollama.return_value = False
        
        install.validate_system_prerequisites(skip_models=False)
        
        mock_exit.assert_called_once_with(1)
        mock_print.assert_called_with("\nError: Ollama is required when --no-models flag is not used.")
    
    @patch('install.check_ollama')
    @patch('install.check_pip_version')
    @patch('install.check_python_version')
    @patch('builtins.print')
    def test_validate_system_prerequisites_ollama_missing_skip_models(self, mock_print, mock_check_python, mock_check_pip, mock_check_ollama):
        """Test prerequisite validation when Ollama missing but skipping models"""
        mock_check_ollama.return_value = False
        
        result = install.validate_system_prerequisites(skip_models=True)
        
        self.assertTrue(result)
        mock_print.assert_called_with("\nWarning: Ollama not found, but skipping due to --no-models flag.")
    
    @patch('install.check_nodejs')
    @patch('builtins.print')
    def test_check_and_setup_nodejs_success(self, mock_print, mock_check_nodejs):
        """Test Node.js setup when available"""
        mock_check_nodejs.return_value = (True, "/usr/bin/npm")
        
        available, npm_cmd = install.check_and_setup_nodejs()
        
        self.assertTrue(available)
        self.assertEqual(npm_cmd, "/usr/bin/npm")
    
    @patch('install.check_nodejs')
    @patch('builtins.print')
    def test_check_and_setup_nodejs_unavailable(self, mock_print, mock_check_nodejs):
        """Test Node.js setup when unavailable"""
        mock_check_nodejs.return_value = False
        
        available, npm_cmd = install.check_and_setup_nodejs()
        
        self.assertFalse(available)
        self.assertIsNone(npm_cmd)
        mock_print.assert_any_call("\nWarning: Node.js/npm not found. Web GUI will not be installed.")
    
    @patch('install.copy_comfyui_workflows')
    @patch('install.install_comfyui')
    def test_install_core_components(self, mock_install_comfyui, mock_copy_workflows):
        """Test core component installation"""
        install.install_core_components()
        
        mock_install_comfyui.assert_called_once()
        mock_copy_workflows.assert_called_once()
    
    @patch('install.download_sdxl_models')
    @patch('install.pull_ollama_models')
    @patch('builtins.print')
    def test_install_models_if_requested_install(self, mock_print, mock_pull_ollama, mock_download_sdxl):
        """Test model installation when not skipping"""
        mock_download_sdxl.return_value = True
        
        result = install.install_models_if_requested(skip_models=False)
        
        self.assertTrue(result)
        mock_pull_ollama.assert_called_once()
        mock_download_sdxl.assert_called_once()
    
    @patch('builtins.print')
    def test_install_models_if_requested_skip(self, mock_print):
        """Test model installation when skipping"""
        result = install.install_models_if_requested(skip_models=True)
        
        self.assertFalse(result)
        mock_print.assert_any_call("\nSkipping Ollama model pull due to --no-models flag")
        mock_print.assert_any_call("Skipping SDXL model download due to --no-models flag")
    
    @patch('install.install_web_gui')
    def test_install_web_gui_if_available_success(self, mock_install_web_gui):
        """Test Web GUI installation when Node.js available"""
        mock_install_web_gui.return_value = True
        
        result = install.install_web_gui_if_available(True, "/usr/bin/npm")
        
        self.assertTrue(result)
        mock_install_web_gui.assert_called_once_with("/usr/bin/npm")
    
    def test_install_web_gui_if_available_unavailable(self):
        """Test Web GUI installation when Node.js unavailable"""
        result = install.install_web_gui_if_available(False, None)
        
        self.assertFalse(result)
    
    @patch('install.print_summary')
    @patch('install.generate_dependency_log')
    def test_finalize_installation(self, mock_generate_log, mock_print_summary):
        """Test installation finalization"""
        install.finalize_installation(True, True)
        
        mock_generate_log.assert_called_once()
        mock_print_summary.assert_called_once_with(True, True)

class TestComfyUIFunctions(unittest.TestCase):
    """Test suite for ComfyUI-specific functions"""
    
    @patch('os.path.exists')
    @patch('shutil.rmtree')
    @patch('builtins.print')
    def test_check_comfyui_installation_exists_valid(self, mock_print, mock_rmtree, mock_exists):
        """Test ComfyUI check when installation exists and is valid"""
        # Mock file existence checks
        def exists_side_effect(path):
            if path == "ComfyUI":
                return True
            if path in ["ComfyUI/requirements.txt", "ComfyUI/main.py", "ComfyUI/server.py"]:
                return True
            return False
        
        mock_exists.side_effect = exists_side_effect
        
        exists, valid = install.check_comfyui_installation()
        
        self.assertTrue(exists)
        self.assertTrue(valid)
        mock_rmtree.assert_not_called()
    
    @patch('os.path.exists')
    @patch('shutil.rmtree')
    @patch('builtins.print')
    def test_check_comfyui_installation_exists_invalid(self, mock_print, mock_rmtree, mock_exists):
        """Test ComfyUI check when installation exists but is invalid"""
        # Mock file existence checks
        def exists_side_effect(path):
            if path == "ComfyUI":
                return True
            # Missing required files
            return False
        
        mock_exists.side_effect = exists_side_effect
        
        exists, valid = install.check_comfyui_installation()
        
        self.assertFalse(exists)  # Should be false after removal
        self.assertFalse(valid)
        mock_rmtree.assert_called_once_with("ComfyUI", ignore_errors=True)
        mock_print.assert_called_with("ComfyUI directory exists but is empty or incomplete. Removing and re-cloning...")
    
    @patch('os.path.exists')
    def test_check_comfyui_installation_not_exists(self, mock_exists):
        """Test ComfyUI check when installation doesn't exist"""
        mock_exists.return_value = False
        
        exists, valid = install.check_comfyui_installation()
        
        self.assertFalse(exists)
        self.assertFalse(valid)

class TestNodeJSFunctions(unittest.TestCase):
    """Test suite for Node.js checking functions"""
    
    @patch('subprocess.run')
    @patch('shutil.which')
    @patch('builtins.print')
    def test_check_node_installation_success(self, mock_print, mock_which, mock_run):
        """Test successful Node.js installation check"""
        mock_which.return_value = "/usr/bin/node"
        mock_run.return_value = Mock(returncode=0, stdout="v18.17.0\n")
        
        success, info = install.check_node_installation()
        
        self.assertTrue(success)
        self.assertEqual(info, ("/usr/bin/node", "v18.17.0"))
        mock_print.assert_called_with("Node.js v18.17.0 found.")
    
    @patch('shutil.which')
    @patch('builtins.print')
    def test_check_node_installation_not_found(self, mock_print, mock_which):
        """Test Node.js installation check when not found"""
        mock_which.return_value = None
        
        success, info = install.check_node_installation()
        
        self.assertFalse(success)
        self.assertIsNone(info)
        mock_print.assert_called_with("Node.js not found in PATH.")
    
    @patch('subprocess.run')
    @patch('install.find_npm_command')
    @patch('builtins.print')
    def test_check_npm_installation_success(self, mock_print, mock_find_npm, mock_run):
        """Test successful npm installation check"""
        mock_find_npm.return_value = "/usr/bin/npm"
        mock_run.return_value = Mock(returncode=0, stdout="9.8.1\n")
        
        success, npm_cmd, version = install.check_npm_installation()
        
        self.assertTrue(success)
        self.assertEqual(npm_cmd, "/usr/bin/npm")
        self.assertEqual(version, "9.8.1")
        mock_print.assert_called_with("npm 9.8.1 found at: /usr/bin/npm")
    
    @patch('install.find_npm_command')
    @patch('builtins.print')
    def test_check_npm_installation_not_found(self, mock_print, mock_find_npm):
        """Test npm installation check when not found"""
        mock_find_npm.return_value = None
        
        success, npm_cmd, version = install.check_npm_installation()
        
        self.assertFalse(success)
        self.assertIsNone(npm_cmd)
        self.assertIsNone(version)
        mock_print.assert_any_call("npm not found. Searched common installation locations.")

if __name__ == '__main__':
    unittest.main()