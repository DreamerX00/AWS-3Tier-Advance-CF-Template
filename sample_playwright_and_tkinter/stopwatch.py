"""
Cyberpunk-themed Tkinter stopwatch window for timing SSO app creation steps.
Runs in a daemon thread so it doesn't block the Playwright automation.
"""

import os
import threading
import time
import tkinter as tk
from datetime import datetime


class StopwatchWindow:
    """A dark neon stopwatch that tracks step-by-step timing."""

    # Theme colors
    BG = "#0a0a1a"
    CYAN = "#00ffff"
    GREEN = "#00ff41"
    MAGENTA = "#ff00ff"
    DIM = "#444466"
    WHITE = "#e0e0ff"

    def __init__(self):
        self._steps: list[tuple[str, float]] = []  # (name, duration)
        self._current_step: str | None = None
        self._step_start: float = 0.0
        self._global_start: float = time.time()
        self._running = True
        self._pulse_on = True

        self._root: tk.Tk | None = None
        self._ready = threading.Event()

        # Launch Tk in a daemon thread
        self._thread = threading.Thread(target=self._run_tk, daemon=True)
        self._thread.start()
        self._ready.wait(timeout=5)

    # ── Tk setup (runs in thread) ──────────────────────────────────

    def _run_tk(self):
        self._root = tk.Tk()
        self._root.title("SSO App Creator — Stopwatch")
        self._root.configure(bg=self.BG)
        self._root.geometry("420x520")
        self._root.attributes("-topmost", True)
        self._root.resizable(False, False)

        # Title
        tk.Label(
            self._root, text="SSO APP CREATOR", font=("Courier", 18, "bold"),
            fg=self.CYAN, bg=self.BG,
        ).pack(pady=(14, 2))

        # Separator
        tk.Frame(self._root, bg=self.CYAN, height=2).pack(fill="x", padx=30, pady=4)

        # Elapsed timer
        self._timer_var = tk.StringVar(value="00:00.0")
        tk.Label(
            self._root, textvariable=self._timer_var,
            font=("Courier", 36, "bold"), fg=self.GREEN, bg=self.BG,
        ).pack(pady=(6, 2))

        # Current step label
        self._step_var = tk.StringVar(value="Initializing...")
        self._step_label = tk.Label(
            self._root, textvariable=self._step_var,
            font=("Courier", 11), fg=self.MAGENTA, bg=self.BG,
            wraplength=380, justify="center",
        )
        self._step_label.pack(pady=(0, 6))

        # Separator
        tk.Frame(self._root, bg=self.DIM, height=1).pack(fill="x", padx=20, pady=2)

        # Step log header
        tk.Label(
            self._root, text="  STEP                          TIME",
            font=("Courier", 10), fg=self.DIM, bg=self.BG, anchor="w",
        ).pack(fill="x", padx=20)

        # Scrollable step log
        log_frame = tk.Frame(self._root, bg=self.BG)
        log_frame.pack(fill="both", expand=True, padx=20, pady=(2, 4))

        scrollbar = tk.Scrollbar(log_frame, orient="vertical")
        scrollbar.pack(side="right", fill="y")

        self._log_list = tk.Listbox(
            log_frame, font=("Courier", 10), fg=self.CYAN, bg="#0d0d24",
            selectbackground=self.DIM, highlightthickness=0,
            borderwidth=0, yscrollcommand=scrollbar.set, activestyle="none",
        )
        self._log_list.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self._log_list.yview)

        # Separator
        tk.Frame(self._root, bg=self.DIM, height=1).pack(fill="x", padx=20, pady=2)

        # Total time
        self._total_var = tk.StringVar(value="")
        tk.Label(
            self._root, textvariable=self._total_var,
            font=("Courier", 13, "bold"), fg=self.GREEN, bg=self.BG,
        ).pack(pady=(2, 10))

        self._ready.set()
        self._tick()
        self._pulse()
        self._root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._root.mainloop()

    # ── Periodic updates ───────────────────────────────────────────

    def _tick(self):
        """Update the running elapsed timer every 100ms."""
        if not self._running:
            return
        elapsed = time.time() - self._global_start
        mins, secs = divmod(elapsed, 60)
        self._timer_var.set(f"{int(mins):02d}:{secs:04.1f}")
        self._root.after(100, self._tick)

    def _pulse(self):
        """Pulse the current-step label between magenta and dim."""
        if not self._running:
            return
        self._pulse_on = not self._pulse_on
        color = self.MAGENTA if self._pulse_on else self.DIM
        self._step_label.configure(fg=color)
        self._root.after(600, self._pulse)

    def _on_close(self):
        self._running = False
        self._root.destroy()

    # ── Public API (called from main thread) ───────────────────────

    def start_step(self, name: str):
        """Begin timing a new step."""
        # End the previous step if one was running
        if self._current_step is not None:
            self.end_step()
        self._current_step = name
        self._step_start = time.time()
        if self._root and self._running:
            self._root.after(0, lambda: self._step_var.set(f"▶ {name}"))

    def end_step(self):
        """Finish the current step and log its duration."""
        if self._current_step is None:
            return
        duration = time.time() - self._step_start
        name = self._current_step
        self._steps.append((name, duration))
        self._current_step = None

        if self._root and self._running:
            entry = f"  {name:<32s} {duration:>6.1f}s"
            self._root.after(0, lambda e=entry: self._append_log(e))

    def _append_log(self, entry: str):
        self._log_list.insert(tk.END, entry)
        self._log_list.see(tk.END)

    def finish(self, grace_seconds: float = 10.0):
        """Stop the timer, display total time, and keep the window visible for a grace period."""
        # End any running step
        if self._current_step is not None:
            self.end_step()

        self._total_elapsed = time.time() - self._global_start
        self._running = False
        mins, secs = divmod(self._total_elapsed, 60)
        total_str = f"{int(mins):02d}:{secs:04.1f}"

        if self._root:
            self._root.after(0, lambda: self._timer_var.set(total_str))
            self._root.after(0, lambda: self._step_var.set("✔ COMPLETE"))
            self._root.after(0, lambda: self._step_label.configure(fg=self.GREEN))
            self._root.after(0, lambda: self._total_var.set(f"TOTAL: {total_str}"))
            # Countdown grace period on the step label
            self._root.after(0, lambda: self._grace_countdown(grace_seconds))

        # Block the caller so the window stays visible during grace period
        time.sleep(grace_seconds)

    def _grace_countdown(self, remaining: float):
        """Show a countdown on the step label during grace period."""
        if remaining <= 0 or not self._root:
            return
        secs_left = int(remaining)
        self._step_var.set(f"✔ COMPLETE — closing in {secs_left}s")
        self._root.after(1000, lambda: self._grace_countdown(remaining - 1))

    def save_report(self, app_name: str = "Unknown") -> str:
        """Write a timing report to alternate_sso/reports/ and return the path."""
        reports_dir = os.path.join(os.path.dirname(__file__), "reports")
        os.makedirs(reports_dir, exist_ok=True)

        now = datetime.now()
        filename = now.strftime("%Y-%m-%d_%H-%M-%S") + ".txt"
        filepath = os.path.join(reports_dir, filename)

        step_total = sum(d for _, d in self._steps)
        wall_total = getattr(self, "_total_elapsed", step_total)
        overhead = wall_total - step_total
        bar = "═" * 47

        lines = [
            bar,
            "  SSO Application Creation Timing Report",
            f"  App: {app_name}",
            f"  Date: {now.strftime('%Y-%m-%d %H:%M:%S')}",
            bar,
            "",
            f"  {'Step':<36s} Duration",
            "  " + "─" * 43,
        ]
        for name, duration in self._steps:
            lines.append(f"  {name:<36s} {duration:>6.1f}s")
        if overhead > 0.1:
            lines.append(f"  {'(overhead / transitions)':<36s} {overhead:>6.1f}s")
        lines += [
            "",
            "  " + "─" * 43,
            f"  {'TOTAL (wall clock)':<36s} {wall_total:>6.1f}s",
            bar,
        ]

        with open(filepath, "w") as f:
            f.write("\n".join(lines) + "\n")

        print(f"Timing report saved: {filepath}")
        return filepath
