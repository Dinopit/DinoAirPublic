#!/usr/bin/env python3
"""
Tests for the refactored start.py functions
"""

import sys
import unittest
from unittest.mock import patch, Mock
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import start

class TestStartFunctions(unittest.TestCase):
    """Test suite for refactored start.py functions"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Clear running_processes list
        start.running_processes.clear()
    
    def tearDown(self):
        """Clean up after tests"""
        start.running_processes.clear()
    
    @patch('builtins.print')
    def test_print_startup_banner(self, mock_print):
        """Test that startup banner is printed correctly"""
        start.print_startup_banner()
        
        # Check that print was called with expected content
        self.assertEqual(mock_print.call_count, 3)
        mock_print.assert_any_call("="*60)
        mock_print.assert_any_call("DinoAir Free Tier Launcher")
    
    @patch('start.check_ollama')
    @patch('sys.exit')
    @patch('builtins.print')
    def test_validate_prerequisites_success(self, mock_print, mock_exit, mock_check_ollama):
        """Test successful prerequisite validation"""
        mock_check_ollama.return_value = True
        
        start.validate_prerequisites()
        
        mock_check_ollama.assert_called_once()
        mock_exit.assert_not_called()
    
    @patch('start.check_ollama')
    @patch('sys.exit')
    @patch('builtins.print')
    def test_validate_prerequisites_failure(self, mock_print, mock_exit, mock_check_ollama):
        """Test prerequisite validation failure"""
        mock_check_ollama.return_value = False
        
        start.validate_prerequisites()
        
        mock_check_ollama.assert_called_once()
        mock_exit.assert_called_once_with(1)
        mock_print.assert_called_with("\nCannot proceed without Ollama. Exiting...")
    
    @patch('start.start_web_gui')
    @patch('start.start_comfyui') 
    @patch('time.sleep')
    def test_start_services_both_successful(self, mock_sleep, mock_start_comfyui, mock_start_web_gui):
        """Test starting services when both start successfully"""
        mock_comfyui_process = Mock()
        mock_web_gui_process = Mock()
        
        mock_start_comfyui.return_value = mock_comfyui_process
        mock_start_web_gui.return_value = mock_web_gui_process
        
        result = start.start_services()
        
        self.assertTrue(result)
        self.assertEqual(len(start.running_processes), 2)
        self.assertIn(mock_comfyui_process, start.running_processes)
        self.assertIn(mock_web_gui_process, start.running_processes)
        mock_sleep.assert_called_once_with(3)
    
    @patch('start.start_web_gui')
    @patch('start.start_comfyui')
    @patch('time.sleep')
    def test_start_services_comfyui_only(self, mock_sleep, mock_start_comfyui, mock_start_web_gui):
        """Test starting services when only ComfyUI starts"""
        mock_comfyui_process = Mock()
        
        mock_start_comfyui.return_value = mock_comfyui_process
        mock_start_web_gui.return_value = None
        
        result = start.start_services()
        
        self.assertTrue(result)
        self.assertEqual(len(start.running_processes), 1)
        self.assertIn(mock_comfyui_process, start.running_processes)
    
    @patch('start.start_web_gui')
    @patch('start.start_comfyui')
    @patch('time.sleep')
    def test_start_services_none_successful(self, mock_sleep, mock_start_comfyui, mock_start_web_gui):
        """Test starting services when none start"""
        mock_start_comfyui.return_value = None
        mock_start_web_gui.return_value = None
        
        result = start.start_services()
        
        self.assertFalse(result)
        self.assertEqual(len(start.running_processes), 0)
    
    @patch('builtins.print')
    def test_print_running_banner(self, mock_print):
        """Test that running banner is printed correctly"""
        start.print_running_banner()
        
        # Check that the banner was printed
        self.assertTrue(mock_print.call_count >= 8)  # Multiple print calls expected
        
        # Check for key content
        call_args_list = [call[0][0] for call in mock_print.call_args_list]
        self.assertIn("DinoAir Free Tier is running!", call_args_list)
        # Check for the line that contains the stop message
        self.assertTrue(any("Press Ctrl+C to stop all services." in str(call) for call in call_args_list))
    
    @patch('time.sleep')
    @patch('builtins.print')
    def test_monitor_services_all_stop(self, mock_print, mock_sleep):
        """Test monitoring services until all stop"""
        # Create mock processes that will "stop" after one iteration
        mock_process1 = Mock()
        mock_process2 = Mock()
        
        # First call returns None (running), second call returns 0 (stopped)
        mock_process1.poll.side_effect = [None, 0]
        mock_process2.poll.side_effect = [None, 0]
        
        start.running_processes.extend([mock_process1, mock_process2])
        
        # Mock sleep to prevent infinite loop in test
        sleep_count = [0]
        def mock_sleep_side_effect(duration):
            sleep_count[0] += 1
            if sleep_count[0] > 3:  # Limit iterations
                # Simulate processes stopping
                for process in start.running_processes[:]:
                    process.poll.return_value = 0
        
        mock_sleep.side_effect = mock_sleep_side_effect
        
        start.monitor_services()
        
        # Check that monitoring message was printed
        mock_print.assert_called_with("\nAll services have stopped.")
        
        # Processes should have been removed
        self.assertEqual(len(start.running_processes), 0)
    
    @patch('time.sleep')
    @patch('builtins.print')
    def test_monitor_services_keyboard_interrupt(self, mock_print, mock_sleep):
        """Test monitoring services with keyboard interrupt"""
        mock_process = Mock()
        mock_process.poll.return_value = None  # Still running
        
        start.running_processes.append(mock_process)
        
        # Simulate KeyboardInterrupt after first sleep
        def mock_sleep_side_effect(duration):
            raise KeyboardInterrupt()
        
        mock_sleep.side_effect = mock_sleep_side_effect
        
        # Should not raise exception, should handle gracefully
        start.monitor_services()
        
        # Process should still be in list since it wasn't stopped
        self.assertEqual(len(start.running_processes), 1)

if __name__ == '__main__':
    unittest.main()