"""
LogicCore v2 - Bottom Panel
Native Qt bottom panel with terminal and metrics tabs.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton,
    QTabWidget, QTextEdit, QLabel, QFrame, QGridLayout
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QTextCharFormat, QColor


class MetricCard(QFrame):
    """Display a single metric value."""
    
    def __init__(self, label, value, unit, color="#3b82f6"):
        super().__init__()
        
        self.setStyleSheet(f"""
            MetricCard {{
                background-color: #121214;
                border: 1px solid #2a2a30;
                border-radius: 4px;
            }}
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(4)
        
        # Label
        label_widget = QLabel(label)
        label_widget.setStyleSheet("color: #52525b; font-size: 10px; font-weight: 600;")
        layout.addWidget(label_widget)
        
        # Value
        value_layout = QHBoxLayout()
        value_layout.setSpacing(4)
        
        value_widget = QLabel(value)
        value_widget.setStyleSheet(f"color: {color}; font-size: 24px; font-weight: 600;")
        value_layout.addWidget(value_widget)
        
        unit_widget = QLabel(unit)
        unit_widget.setStyleSheet("color: #52525b; font-size: 11px;")
        unit_widget.setAlignment(Qt.AlignBottom)
        value_layout.addWidget(unit_widget)
        
        value_layout.addStretch()
        layout.addLayout(value_layout)


class TerminalWidget(QTextEdit):
    """Simple terminal-like text display."""
    
    def __init__(self):
        super().__init__()
        
        self.setReadOnly(True)
        self.setFont(QFont("JetBrains Mono", 11))
        self.setStyleSheet("""
            QTextEdit {
                background-color: #0a0a0b;
                color: #a1a1aa;
                border: none;
                padding: 8px;
            }
        """)
        
        # Initial content
        self.append_line("➜ LogicCore Terminal v2.0", "#3b82f6")
        self.append_line("System ready.", "#52525b")
        self.append_line("")
    
    def append_line(self, text, color="#a1a1aa"):
        """Append a colored line to the terminal."""
        cursor = self.textCursor()
        format = QTextCharFormat()
        format.setForeground(QColor(color))
        cursor.insertText(text + "\n", format)


class BottomPanel(QWidget):
    """
    Native bottom panel with terminal and metrics tabs.
    """
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setMinimumHeight(150)
        self.setStyleSheet("""
            BottomPanel {
                background-color: #0a0a0b;
                border-top: 1px solid #2a2a30;
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Tab widget
        tabs = QTabWidget()
        tabs.setStyleSheet("""
            QTabWidget::pane {
                border: none;
                background-color: #0a0a0b;
            }
            QTabBar::tab {
                background-color: #0a0a0b;
                color: #52525b;
                padding: 8px 16px;
                border: none;
                border-bottom: 2px solid transparent;
                font-size: 10px;
                font-weight: 600;
            }
            QTabBar::tab:selected {
                color: #eeeeee;
                border-bottom: 2px solid #3b82f6;
            }
            QTabBar::tab:hover {
                color: #a1a1aa;
            }
        """)
        
        # Terminal tab
        terminal = TerminalWidget()
        tabs.addTab(terminal, "TERMINAL")
        
        # Metrics tab
        metrics = self.create_metrics_panel()
        tabs.addTab(metrics, "METRICS")
        
        # Output tab
        output = QTextEdit()
        output.setReadOnly(True)
        output.setFont(QFont("JetBrains Mono", 11))
        output.setStyleSheet("""
            QTextEdit {
                background-color: #0a0a0b;
                color: #a1a1aa;
                border: none;
                padding: 8px;
            }
        """)
        output.setPlainText("Ready.")
        tabs.addTab(output, "OUTPUT")
        
        layout.addWidget(tabs)
    
    def create_metrics_panel(self):
        """Create the metrics dashboard."""
        panel = QWidget()
        panel.setStyleSheet("background-color: #0a0a0b;")
        
        layout = QGridLayout(panel)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)
        
        # Metric cards
        layout.addWidget(MetricCard("THROUGHPUT", "0", "REQ/S", "#3b82f6"), 0, 0)
        layout.addWidget(MetricCard("LATENCY", "0.0", "MS", "#eab308"), 0, 1)
        layout.addWidget(MetricCard("CPU LOAD", "0", "%", "#ef4444"), 0, 2)
        layout.addWidget(MetricCard("MEMORY", "0", "MB", "#a1a1aa"), 0, 3)
        
        return panel
