"""
DinoAir Sandbox Module
Provides secure execution environment for untrusted operations
"""

from .process_sandbox import (
    ProcessSandbox,
    CodeSandbox,
    SandboxConfig,
    SandboxResult,
    SandboxPermission,
    SandboxIsolation,
    run_sandboxed,
    run_code_sandboxed
)

__all__ = [
    'ProcessSandbox',
    'CodeSandbox',
    'SandboxConfig',
    'SandboxResult',
    'SandboxPermission',
    'SandboxIsolation',
    'run_sandboxed',
    'run_code_sandboxed'
]

# Module version
__version__ = '1.0.0'