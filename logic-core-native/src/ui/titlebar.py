"""
LogicCore v2 - Native Title Bar
Custom frameless title bar with window controls.
"""
from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QLabel, QPushButton, QFrame
)
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QIcon


class TitleBar(QWidget):
    """
    Custom native title bar with window controls.
    """
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent_window = parent
        
        self.setFixedHeight(40)
        self.setStyleSheet("""
            TitleBar {
                background-color: #121214;
                border-bottom: 1px solid #2a2a30;
            }
        """)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 0, 0, 0)
        layout.setSpacing(0)
        
        # Logo
        logo_layout = QHBoxLayout()
        logo_layout.setSpacing(8)
        
        logo_icon = QLabel("◆")
        logo_icon.setStyleSheet("color: #3b82f6; font-size: 16px;")
        logo_layout.addWidget(logo_icon)
        
        logo_text = QLabel("LOGICCORE")
        logo_text.setStyleSheet("""
            color: #eeeeee;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 1px;
        """)
        logo_layout.addWidget(logo_text)
        
        layout.addLayout(logo_layout)
        
        # Separator
        sep = QFrame()
        sep.setFixedWidth(1)
        sep.setFixedHeight(20)
        sep.setStyleSheet("background-color: #2a2a30;")
        layout.addWidget(sep)
        layout.addSpacing(12)
        
        # Breadcrumb
        breadcrumb = QLabel("workspace / main.pipeline")
        breadcrumb.setStyleSheet("color: #52525b; font-size: 11px;")
        layout.addWidget(breadcrumb)
        
        layout.addStretch()
        
        # Window controls
        self.create_window_controls(layout)
    
    def create_window_controls(self, layout):
        """Create minimize, maximize, close buttons."""
        button_style = """
            QPushButton {
                background-color: transparent;
                border: none;
                color: #a1a1aa;
                font-size: 16px;
                padding: 0;
            }
            QPushButton:hover {
                background-color: #27272a;
                color: #eeeeee;
            }
        """
        
        close_button_style = """
            QPushButton {
                background-color: transparent;
                border: none;
                color: #a1a1aa;
                font-size: 16px;
                padding: 0;
            }
            QPushButton:hover {
                background-color: #dc2626;
                color: #ffffff;
            }
        """
        
        # Minimize
        min_btn = QPushButton("─")
        min_btn.setFixedSize(46, 40)
        min_btn.setStyleSheet(button_style)
        min_btn.clicked.connect(self.minimize_window)
        layout.addWidget(min_btn)
        
        # Maximize
        max_btn = QPushButton("□")
        max_btn.setFixedSize(46, 40)
        max_btn.setStyleSheet(button_style)
        max_btn.clicked.connect(self.maximize_window)
        layout.addWidget(max_btn)
        
        # Close
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(46, 40)
        close_btn.setStyleSheet(close_button_style)
        close_btn.clicked.connect(self.close_window)
        layout.addWidget(close_btn)
    
    def minimize_window(self):
        if self.parent_window:
            self.parent_window.showMinimized()
    
    def maximize_window(self):
        if self.parent_window:
            if self.parent_window.isMaximized():
                self.parent_window.showNormal()
            else:
                self.parent_window.showMaximized()
    
    def close_window(self):
        if self.parent_window:
            self.parent_window.close()
    
    def mouseDoubleClickEvent(self, event):
        """Double click to maximize/restore."""
        if event.button() == Qt.LeftButton:
            self.maximize_window()
