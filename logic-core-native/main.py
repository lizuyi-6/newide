"""
LogicCore v2 - Native Edition
Entry point for the Qt-based native application.
"""
import sys
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from src.ui.main_window import MainWindow

def main():
    # Enable High DPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    
    app = QApplication(sys.argv)
    app.setApplicationName("LogicCore")
    app.setOrganizationName("LogicCore Team")
    app.setApplicationVersion("2.0.0")
    
    # Apply dark theme
    try:
        import qdarktheme
        app.setStyleSheet(qdarktheme.load_stylesheet("dark"))
    except ImportError:
        pass  # Fallback to default styling
    
    # Create and show main window
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
