"""
LogicCore v2 - Main Window
Native Qt main window with custom frameless design.
"""
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QSplitter, QFrame
)
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QColor

from .titlebar import TitleBar
from .sidebar import Sidebar
from .bottom_panel import BottomPanel


class MainWindow(QMainWindow):
    """
    Main application window with native frameless design.
    """
    
    def __init__(self):
        super().__init__()
        
        # Frameless window with custom title bar
        self.setWindowFlags(Qt.FramelessWindowHint)
        self.setAttribute(Qt.WA_TranslucentBackground, False)
        
        # Window size
        self.setMinimumSize(1200, 800)
        self.resize(1400, 900)
        
        # Central widget
        central_widget = QWidget()
        central_widget.setObjectName("centralWidget")
        central_widget.setStyleSheet("""
            #centralWidget {
                background-color: #0a0a0b;
            }
        """)
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Title bar
        self.title_bar = TitleBar(self)
        main_layout.addWidget(self.title_bar)
        
        # Content area (horizontal split)
        content_widget = QWidget()
        content_layout = QHBoxLayout(content_widget)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)
        
        # Sidebar
        self.sidebar = Sidebar()
        content_layout.addWidget(self.sidebar)
        
        # Main splitter (vertical: canvas/editor + bottom panel)
        main_splitter = QSplitter(Qt.Vertical)
        main_splitter.setHandleWidth(1)
        main_splitter.setStyleSheet("""
            QSplitter::handle {
                background-color: #2a2a30;
            }
        """)
        
        # Canvas placeholder (will be replaced with Godot embed)
        self.canvas_area = QFrame()
        self.canvas_area.setObjectName("canvasArea")
        self.canvas_area.setStyleSheet("""
            #canvasArea {
                background-color: #121214;
                border: none;
            }
        """)
        self.canvas_area.setMinimumHeight(300)
        
        # Bottom panel
        self.bottom_panel = BottomPanel()
        
        main_splitter.addWidget(self.canvas_area)
        main_splitter.addWidget(self.bottom_panel)
        main_splitter.setSizes([600, 200])
        
        content_layout.addWidget(main_splitter)
        main_layout.addWidget(content_widget)
        
        # Status bar
        self.create_status_bar(main_layout)
        
        # Window dragging
        self._drag_pos = None
    
    def create_status_bar(self, layout):
        """Create native status bar."""
        status_bar = QWidget()
        status_bar.setFixedHeight(22)
        status_bar.setStyleSheet("""
            background-color: #121214;
            border-top: 1px solid #2a2a30;
            color: #52525b;
            font-size: 11px;
        """)
        
        status_layout = QHBoxLayout(status_bar)
        status_layout.setContentsMargins(12, 0, 12, 0)
        
        from PySide6.QtWidgets import QLabel
        
        ready_label = QLabel("● LOGIC.CORE READY")
        ready_label.setStyleSheet("color: #3b82f6;")
        status_layout.addWidget(ready_label)
        
        status_layout.addStretch()
        
        status_layout.addWidget(QLabel("Python 3.10"))
        status_layout.addWidget(QLabel("│"))
        status_layout.addWidget(QLabel("UTF-8"))
        
        layout.addWidget(status_bar)
    
    def mousePressEvent(self, event):
        """Handle window dragging."""
        if event.button() == Qt.LeftButton:
            self._drag_pos = event.globalPosition().toPoint()
    
    def mouseMoveEvent(self, event):
        """Handle window dragging."""
        if self._drag_pos is not None:
            diff = event.globalPosition().toPoint() - self._drag_pos
            self.move(self.pos() + diff)
            self._drag_pos = event.globalPosition().toPoint()
    
    def mouseReleaseEvent(self, event):
        """Handle window dragging."""
        self._drag_pos = None
