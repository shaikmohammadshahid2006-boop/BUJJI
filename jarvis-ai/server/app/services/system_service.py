"""
jarvis-ai/server/app/services/system_service.py
Hardware telemetry and system monitor service for JARVIS.
Ported from Mark LV actions/system_monitor.py architecture.
"""
from __future__ import annotations
import time
import psutil
from typing import Dict, Any


class SystemService:
    @classmethod
    def get_metrics(cls) -> Dict[str, Any]:
        """Collects real-time CPU, RAM, Disk, and system uptime metrics."""
        cpu = psutil.cpu_percent(interval=None)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = psutil.boot_time()
        uptime_secs = time.time() - boot_time
        uptime_h = int(uptime_secs // 3600)
        uptime_m = int((uptime_secs % 3600) // 60)

        gpu_usage = None
        try:
            # Check pynvml if present
            import pynvml
            pynvml.nvmlInit()
            h = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_usage = float(pynvml.nvmlDeviceGetUtilizationRates(h).gpu)
        except Exception:
            pass

        return {
            "cpu_percent": round(cpu, 1),
            "ram_percent": round(ram.percent, 1),
            "ram_used_gb": round(ram.used / (1024 ** 3), 1),
            "ram_total_gb": round(ram.total / (1024 ** 3), 1),
            "disk_percent": round(disk.percent, 1),
            "disk_free_gb": round(disk.free / (1024 ** 3), 1),
            "gpu_percent": gpu_usage,
            "uptime": f"{uptime_h}h {uptime_m}m",
            "process_count": len(psutil.pids()),
        }

    @classmethod
    def format_status_report(cls) -> str:
        """Human-readable telemetry status report in the style of JARVIS."""
        metrics = cls.get_metrics()
        gpu_str = f", GPU at {metrics['gpu_percent']}%" if metrics.get("gpu_percent") is not None else ""
        return (
            f"Hardware telemetry operational, sir: CPU utilization is currently at {metrics['cpu_percent']}%, "
            f"RAM load is at {metrics['ram_percent']}% ({metrics['ram_used_gb']} GB of {metrics['ram_total_gb']} GB)"
            f"{gpu_str}. Disk utilization is at {metrics['disk_percent']}%, with system uptime spanning {metrics['uptime']}."
        )
