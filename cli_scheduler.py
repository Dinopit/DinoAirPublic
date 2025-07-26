#!/usr/bin/env python3
"""
CLI Installer Scheduling System
Implements scheduling for automated updates in the DinoAir CLI installer.
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import subprocess
import platform

class ScheduleType(Enum):
    """Types of scheduled tasks."""
    UPDATE_CHECK = "update_check"
    FULL_UPDATE = "full_update"
    MODEL_UPDATE = "model_update"
    CLEANUP = "cleanup"
    BACKUP = "backup"
    HEALTH_CHECK = "health_check"

class ScheduleStatus(Enum):
    """Status of scheduled tasks."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ScheduledTask:
    """Represents a scheduled task."""
    id: str
    name: str
    task_type: ScheduleType
    schedule_expression: str  # cron-like expression or simple interval
    command: str
    args: List[str]
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    status: ScheduleStatus = ScheduleStatus.PENDING
    retry_count: int = 0
    max_retries: int = 3
    timeout_seconds: int = 3600  # 1 hour default
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

class TaskScheduler:
    """Manages scheduled tasks for the CLI installer."""
    
    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = Path(config_dir) if config_dir else Path.home() / ".dinoair"
        self.config_file = self.config_dir / "scheduler_config.json"
        self.log_file = self.config_dir / "scheduler.log"
        self.tasks: Dict[str, ScheduledTask] = {}
        self.running = False
        self.scheduler_thread = None
        
        # Ensure config directory exists
        self.config_dir.mkdir(exist_ok=True)
        
        # Load existing tasks
        self.load_tasks()
        
    def load_tasks(self):
        """Load scheduled tasks from configuration file."""
        if not self.config_file.exists():
            self._create_default_tasks()
            return
            
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            for task_data in data.get('tasks', []):
                # Convert datetime strings back to datetime objects
                if task_data.get('last_run'):
                    task_data['last_run'] = datetime.fromisoformat(task_data['last_run'])
                if task_data.get('next_run'):
                    task_data['next_run'] = datetime.fromisoformat(task_data['next_run'])
                    
                # Convert enums
                task_data['task_type'] = ScheduleType(task_data['task_type'])
                task_data['status'] = ScheduleStatus(task_data['status'])
                
                task = ScheduledTask(**task_data)
                self.tasks[task.id] = task
                
        except Exception as e:
            self.log(f"Error loading tasks: {e}")
            self._create_default_tasks()
            
    def save_tasks(self):
        """Save scheduled tasks to configuration file."""
        try:
            tasks_data = []
            for task in self.tasks.values():
                task_dict = asdict(task)
                
                # Convert datetime objects to strings
                if task_dict['last_run']:
                    task_dict['last_run'] = task_dict['last_run'].isoformat()
                if task_dict['next_run']:
                    task_dict['next_run'] = task_dict['next_run'].isoformat()
                    
                # Convert enums to strings
                task_dict['task_type'] = task_dict['task_type'].value
                task_dict['status'] = task_dict['status'].value
                
                tasks_data.append(task_dict)
                
            data = {
                'version': '1.0.0',
                'tasks': tasks_data,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            self.log(f"Error saving tasks: {e}")
            
    def _create_default_tasks(self):
        """Create default scheduled tasks."""
        # Daily update check
        self.add_task(
            task_id="daily_update_check",
            name="Daily Update Check",
            task_type=ScheduleType.UPDATE_CHECK,
            schedule_expression="daily_at_02:00",
            command=sys.executable,
            args=["-m", "dinoair.updater", "--check-only"],
            metadata={"description": "Check for DinoAir updates daily at 2 AM"}
        )
        
        # Weekly full update
        self.add_task(
            task_id="weekly_full_update",
            name="Weekly Full Update",
            task_type=ScheduleType.FULL_UPDATE,
            schedule_expression="weekly_sunday_at_03:00",
            command=sys.executable,
            args=["-m", "dinoair.updater", "--full-update"],
            metadata={"description": "Perform full update weekly on Sunday at 3 AM"}
        )
        
        # Monthly cleanup
        self.add_task(
            task_id="monthly_cleanup",
            name="Monthly Cleanup",
            task_type=ScheduleType.CLEANUP,
            schedule_expression="monthly_first_sunday_at_04:00",
            command=sys.executable,
            args=["-m", "dinoair.cleanup", "--deep-clean"],
            metadata={"description": "Deep cleanup on first Sunday of each month at 4 AM"}
        )
        
        # Weekly backup
        self.add_task(
            task_id="weekly_backup",
            name="Weekly Backup",
            task_type=ScheduleType.BACKUP,
            schedule_expression="weekly_saturday_at_01:00",
            command=sys.executable,
            args=["-m", "dinoair.backup", "--create-backup"],
            metadata={"description": "Create backup weekly on Saturday at 1 AM"}
        )
        
        self.save_tasks()
        
    def add_task(self, task_id: str, name: str, task_type: ScheduleType, 
                 schedule_expression: str, command: str, args: List[str],
                 enabled: bool = True, timeout_seconds: int = 3600,
                 metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Add a new scheduled task."""
        try:
            task = ScheduledTask(
                id=task_id,
                name=name,
                task_type=task_type,
                schedule_expression=schedule_expression,
                command=command,
                args=args,
                enabled=enabled,
                timeout_seconds=timeout_seconds,
                metadata=metadata or {}
            )
            
            # Calculate next run time
            task.next_run = self._calculate_next_run(schedule_expression)
            
            self.tasks[task_id] = task
            self.save_tasks()
            
            self.log(f"Added scheduled task: {name} ({task_id})")
            return True
            
        except Exception as e:
            self.log(f"Error adding task {task_id}: {e}")
            return False
            
    def remove_task(self, task_id: str) -> bool:
        """Remove a scheduled task."""
        if task_id in self.tasks:
            task_name = self.tasks[task_id].name
            del self.tasks[task_id]
            self.save_tasks()
            self.log(f"Removed scheduled task: {task_name} ({task_id})")
            return True
        return False
        
    def enable_task(self, task_id: str) -> bool:
        """Enable a scheduled task."""
        if task_id in self.tasks:
            self.tasks[task_id].enabled = True
            self.tasks[task_id].next_run = self._calculate_next_run(
                self.tasks[task_id].schedule_expression
            )
            self.save_tasks()
            return True
        return False
        
    def disable_task(self, task_id: str) -> bool:
        """Disable a scheduled task."""
        if task_id in self.tasks:
            self.tasks[task_id].enabled = False
            self.tasks[task_id].next_run = None
            self.save_tasks()
            return True
        return False
        
    def _calculate_next_run(self, schedule_expression: str) -> datetime:
        """Calculate the next run time based on schedule expression."""
        now = datetime.now()
        
        # Simple schedule expressions
        if schedule_expression == "daily_at_02:00":
            next_run = now.replace(hour=2, minute=0, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
                
        elif schedule_expression == "weekly_sunday_at_03:00":
            days_ahead = 6 - now.weekday()  # Sunday is 6
            if days_ahead <= 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=3, minute=0, second=0, microsecond=0)
            
        elif schedule_expression == "weekly_saturday_at_01:00":
            days_ahead = 5 - now.weekday()  # Saturday is 5
            if days_ahead <= 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=1, minute=0, second=0, microsecond=0)
            
        elif schedule_expression == "monthly_first_sunday_at_04:00":
            # Find first Sunday of next month
            next_month = now.replace(day=1) + timedelta(days=32)
            next_month = next_month.replace(day=1, hour=4, minute=0, second=0, microsecond=0)
            
            # Find first Sunday
            days_ahead = 6 - next_month.weekday()
            if days_ahead == 7:
                days_ahead = 0
            next_run = next_month + timedelta(days=days_ahead)
            
        elif schedule_expression.startswith("every_"):
            # Handle "every_X_hours" or "every_X_minutes"
            parts = schedule_expression.split("_")
            if len(parts) >= 3:
                interval = int(parts[1])
                unit = parts[2]
                
                if unit == "hours":
                    next_run = now + timedelta(hours=interval)
                elif unit == "minutes":
                    next_run = now + timedelta(minutes=interval)
                else:
                    next_run = now + timedelta(hours=24)  # Default to daily
            else:
                next_run = now + timedelta(hours=24)
                
        else:
            # Default to daily
            next_run = now + timedelta(hours=24)
            
        return next_run
        
    def execute_task(self, task: ScheduledTask) -> bool:
        """Execute a scheduled task."""
        try:
            self.log(f"Executing task: {task.name} ({task.id})")
            
            task.status = ScheduleStatus.RUNNING
            task.last_run = datetime.now()
            self.save_tasks()
            
            # Execute the command
            cmd = [task.command] + task.args
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=task.timeout_seconds
            )
            
            if result.returncode == 0:
                task.status = ScheduleStatus.COMPLETED
                task.retry_count = 0
                self.log(f"Task completed successfully: {task.name}")
                success = True
            else:
                task.status = ScheduleStatus.FAILED
                task.retry_count += 1
                self.log(f"Task failed: {task.name} - {result.stderr}")
                success = False
                
        except subprocess.TimeoutExpired:
            task.status = ScheduleStatus.FAILED
            task.retry_count += 1
            self.log(f"Task timed out: {task.name}")
            success = False
            
        except Exception as e:
            task.status = ScheduleStatus.FAILED
            task.retry_count += 1
            self.log(f"Task execution error: {task.name} - {e}")
            success = False
            
        # Calculate next run time if task is still enabled
        if task.enabled:
            task.next_run = self._calculate_next_run(task.schedule_expression)
            
        self.save_tasks()
        return success
        
    def check_and_run_tasks(self):
        """Check for tasks that need to run and execute them."""
        now = datetime.now()
        
        for task in self.tasks.values():
            if not task.enabled:
                continue
                
            if task.next_run and task.next_run <= now:
                if task.status != ScheduleStatus.RUNNING:
                    # Execute task in a separate thread to avoid blocking
                    thread = threading.Thread(
                        target=self.execute_task,
                        args=(task,),
                        daemon=True
                    )
                    thread.start()
                    
    def start_scheduler(self):
        """Start the task scheduler."""
        if self.running:
            return
            
        self.running = True
        self.log("Starting task scheduler")
        
        def scheduler_loop():
            while self.running:
                try:
                    self.check_and_run_tasks()
                    time.sleep(60)  # Check every minute
                except Exception as e:
                    self.log(f"Scheduler error: {e}")
                    time.sleep(60)
                    
        self.scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        
    def stop_scheduler(self):
        """Stop the task scheduler."""
        if not self.running:
            return
            
        self.running = False
        self.log("Stopping task scheduler")
        
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
            
    def get_task_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all scheduled tasks."""
        status = {}
        
        for task_id, task in self.tasks.items():
            status[task_id] = {
                'name': task.name,
                'type': task.task_type.value,
                'enabled': task.enabled,
                'status': task.status.value,
                'last_run': task.last_run.isoformat() if task.last_run else None,
                'next_run': task.next_run.isoformat() if task.next_run else None,
                'retry_count': task.retry_count,
                'max_retries': task.max_retries
            }
            
        return status
        
    def log(self, message: str):
        """Log a message to the scheduler log file."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception:
            pass  # Fail silently for logging errors
            
        # Also print to console
        print(log_entry.strip())

class SystemSchedulerIntegration:
    """Integrates with system schedulers (cron, Task Scheduler, etc.)."""
    
    @staticmethod
    def install_system_scheduler():
        """Install DinoAir scheduler as a system service."""
        system = platform.system().lower()
        
        if system == "linux" or system == "darwin":
            return SystemSchedulerIntegration._install_cron()
        elif system == "windows":
            return SystemSchedulerIntegration._install_windows_task()
        else:
            return False
            
    @staticmethod
    def _install_cron():
        """Install cron job for Linux/macOS."""
        try:
            # Create a cron job that runs the scheduler
            cron_command = f"{sys.executable} -m dinoair.scheduler --daemon"
            cron_entry = f"@reboot {cron_command}\n"
            
            # Add to user's crontab
            result = subprocess.run(
                ["crontab", "-l"],
                capture_output=True,
                text=True
            )
            
            current_crontab = result.stdout if result.returncode == 0 else ""
            
            if "dinoair.scheduler" not in current_crontab:
                new_crontab = current_crontab + cron_entry
                
                process = subprocess.Popen(
                    ["crontab", "-"],
                    stdin=subprocess.PIPE,
                    text=True
                )
                process.communicate(input=new_crontab)
                
                return process.returncode == 0
                
            return True
            
        except Exception as e:
            print(f"Error installing cron job: {e}")
            return False
            
    @staticmethod
    def _install_windows_task():
        """Install Windows Task Scheduler task."""
        try:
            task_name = "DinoAir Scheduler"
            command = f"{sys.executable} -m dinoair.scheduler --daemon"
            
            # Create task using schtasks command
            cmd = [
                "schtasks", "/create",
                "/tn", task_name,
                "/tr", command,
                "/sc", "onstart",
                "/ru", "SYSTEM",
                "/f"  # Force overwrite if exists
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
            
        except Exception as e:
            print(f"Error installing Windows task: {e}")
            return False

# Global scheduler instance
_scheduler = None

def get_scheduler(config_dir: Optional[str] = None) -> TaskScheduler:
    """Get the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = TaskScheduler(config_dir)
    return _scheduler

def main():
    """Main entry point for scheduler daemon."""
    import argparse
    
    parser = argparse.ArgumentParser(description="DinoAir Task Scheduler")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    parser.add_argument("--install", action="store_true", help="Install system scheduler")
    parser.add_argument("--status", action="store_true", help="Show task status")
    
    args = parser.parse_args()
    
    scheduler = get_scheduler()
    
    if args.install:
        if SystemSchedulerIntegration.install_system_scheduler():
            print("System scheduler installed successfully")
        else:
            print("Failed to install system scheduler")
            
    elif args.status:
        status = scheduler.get_task_status()
        print(json.dumps(status, indent=2))
        
    elif args.daemon:
        scheduler.start_scheduler()
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            scheduler.stop_scheduler()
            
    else:
        print("Use --daemon to run scheduler, --install to install system scheduler, or --status to show status")

if __name__ == "__main__":
    main()