import pytest
import tempfile
from pathlib import Path
import sys
import os

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from requirements_manager import RequirementsManager
from packaging.requirements import Requirement

class TestRequirementsParsingImprovement:
    """Test suite for the improved requirement parsing using packaging library"""
    
    def test_packaging_requirement_parsing(self):
        """Test that packaging library correctly parses various requirement formats"""
        test_cases = [
            ("requests>=2.31.0", "requests"),
            ("fastapi>=0.104.0,<1.0.0", "fastapi"), 
            ("pydantic[email]>=2.4.0", "pydantic"),
            ("torch>=2.1.0; sys_platform != 'darwin'", "torch"),
            ("beautifulsoup4", "beautifulsoup4"),
            ("python-dotenv>=1.0.0", "python-dotenv"),
            ("package~=1.0", "package"),
            ("package!=1.5", "package"),
            ("package>=1.0,<=2.0,!=1.5", "package"),
        ]
        
        for requirement_str, expected_name in test_cases:
            req = Requirement(requirement_str)
            assert req.name == expected_name, f"Expected {expected_name}, got {req.name} for {requirement_str}"
    
    def test_requirements_manager_with_valid_requirements(self):
        """Test RequirementsManager with a temporary requirements file"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create a test requirements file with packages that should be available
            test_req_content = """# Test requirements
packaging>=23.0
pathlib2>=2.0; python_version<"3.4"
requests>=2.0
"""
            req_file = temp_path / "requirements.txt"
            req_file.write_text(test_req_content)
            
            # Create manager instance and check dependencies
            original_cwd = os.getcwd()
            try:
                os.chdir(temp_path)
                manager = RequirementsManager()
                
                # This should not raise an exception
                result = manager.check_dependencies()
                
                # The result should be a boolean
                assert isinstance(result, bool)
                
            finally:
                os.chdir(original_cwd)
    
    def test_edge_cases_handled_correctly(self):
        """Test that edge cases that would break the old parsing method are handled"""
        edge_cases = [
            "package~=1.0",  # Compatible release operator
            "package!=1.5",  # Not equal operator
            "package[extra]>=1.0",  # Extras
            "package>=1.0; python_version>='3.8'",  # Environment markers
            "package>=1.0,<2.0,!=1.5",  # Multiple constraints
        ]
        
        for req_str in edge_cases:
            # Should not raise an exception
            req = Requirement(req_str)
            # Should extract package name correctly (no special characters)
            assert req.name.isalnum() or '-' in req.name or '_' in req.name
            assert '[' not in req.name  # No extras in name
            assert ';' not in req.name  # No environment markers in name
            assert '>' not in req.name and '<' not in req.name  # No operators in name
    
    def test_requirements_manager_generation_includes_packaging(self):
        """Test that generated requirements include the packaging library"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            original_cwd = os.getcwd()
            try:
                os.chdir(temp_path)
                manager = RequirementsManager()
                manager.generate_requirements()
                
                # Check that packaging is included in generated requirements
                req_file = temp_path / "requirements.txt"
                assert req_file.exists()
                
                content = req_file.read_text()
                assert "packaging>=23.0" in content
                
            finally:
                os.chdir(original_cwd)