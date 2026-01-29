"""
LogicCore v2 - Sidebar
Native Qt sidebar with activity bar and file tree.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton,
    QTreeWidget, QTreeWidgetItem, QLabel, QFrame,
    QScrollArea
)
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QIcon


class ActivityButton(QPushButton):
    """Activity bar icon button."""
    
    def __init__(self, text, tooltip=""):
        super().__init__(text)
        self.setFixedSize(48, 40)
        self.setToolTip(tooltip)
        self.setCheckable(True)
        self.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                border: none;
                border-left: 2px solid transparent;
                color: #52525b;
                font-size: 18px;
            }
            QPushButton:hover {
                color: #a1a1aa;
            }
            QPushButton:checked {
                color: #eeeeee;
                border-left: 2px solid #3b82f6;
            }
        """)


class Sidebar(QWidget):
    """
    Native sidebar with activity bar and content panel.
    """
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setFixedWidth(280)
        self.setStyleSheet("""
            Sidebar {
                background-color: #0a0a0b;
                border-right: 1px solid #2a2a30;
            }
        """)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Activity bar
        activity_bar = self.create_activity_bar()
        layout.addWidget(activity_bar)
        
        # Content panel
        content_panel = self.create_content_panel()
        layout.addWidget(content_panel)
    
    def create_activity_bar(self):
        """Create the leftmost icon bar."""
        bar = QWidget()
        bar.setFixedWidth(48)
        bar.setStyleSheet("background-color: #0a0a0b; border-right: 1px solid #2a2a30;")
        
        layout = QVBoxLayout(bar)
        layout.setContentsMargins(0, 8, 0, 8)
        layout.setSpacing(4)
        
        # Icon buttons
        icons = [
            ("📁", "Explorer"),
            ("🔍", "Search"),
            ("🔀", "Git"),
            ("💬", "AI Chat"),
        ]
        
        self.activity_buttons = []
        for icon, tooltip in icons:
            btn = ActivityButton(icon, tooltip)
            btn.clicked.connect(lambda checked, b=btn: self.on_activity_clicked(b))
            self.activity_buttons.append(btn)
            layout.addWidget(btn)
        
        # Select first by default
        if self.activity_buttons:
            self.activity_buttons[0].setChecked(True)
        
        layout.addStretch()
        
        # Settings at bottom
        settings_btn = ActivityButton("⚙", "Settings")
        layout.addWidget(settings_btn)
        
        return bar
    
    def on_activity_clicked(self, clicked_button):
        """Handle activity button clicks."""
        for btn in self.activity_buttons:
            btn.setChecked(btn == clicked_button)
    
    def create_content_panel(self):
        """Create the file tree / content area."""
        panel = QWidget()
        panel.setStyleSheet("background-color: #0a0a0b;")
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Header
        header = QWidget()
        header.setFixedHeight(36)
        header.setStyleSheet("""
            background-color: #121214;
            border-bottom: 1px solid #2a2a30;
        """)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(12, 0, 12, 0)
        
        header_label = QLabel("EXPLORER")
        header_label.setStyleSheet("color: #52525b; font-size: 10px; font-weight: 600; letter-spacing: 1px;")
        header_layout.addWidget(header_label)
        header_layout.addStretch()
        
        layout.addWidget(header)
        
        # File tree
        tree = QTreeWidget()
        tree.setHeaderHidden(True)
        tree.setIndentation(16)
        tree.setStyleSheet("""
            QTreeWidget {
                background-color: #0a0a0b;
                border: none;
                color: #a1a1aa;
                font-size: 12px;
            }
            QTreeWidget::item {
                height: 26px;
                padding-left: 4px;
            }
            QTreeWidget::item:hover {
                background-color: #1e1e22;
            }
            QTreeWidget::item:selected {
                background-color: #1e1e22;
                color: #eeeeee;
            }
            QTreeWidget::branch {
                background-color: #0a0a0b;
            }
        """)
        
        # Sample tree items
        root = QTreeWidgetItem(tree, ["📁 workspace"])
        root.setExpanded(True)
        
        src = QTreeWidgetItem(root, ["📁 src"])
        src.setExpanded(True)
        QTreeWidgetItem(src, ["🐍 main.py"])
        QTreeWidgetItem(src, ["🐍 utils.py"])
        
        services = QTreeWidgetItem(src, ["📁 services"])
        QTreeWidgetItem(services, ["🐍 security.py"])
        QTreeWidgetItem(services, ["🐍 environment.py"])
        
        QTreeWidgetItem(root, ["📄 graph.json"])
        QTreeWidgetItem(root, ["📄 README.md"])
        
        layout.addWidget(tree)
        
        return panel
