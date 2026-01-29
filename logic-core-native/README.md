# LogicCore v2 - Native Edition

A professional IDE built with truly native technologies (no web rendering).

## Tech Stack
- **UI Shell**: PySide6 (Qt for Python)
- **Visual Canvas**: Godot Engine (embedded)
- **Code Editor**: QScintilla
- **Backend**: Python

## Setup
```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run application
python main.py
```

## Project Structure
```
logic-core-native/
├── main.py              # Application entry point
├── requirements.txt     # Python dependencies
├── src/
│   ├── ui/              # Qt UI components
│   │   ├── main_window.py
│   │   ├── titlebar.py
│   │   ├── sidebar.py
│   │   └── bottom_panel.py
│   ├── editor/          # Code editor
│   ├── services/        # Backend services
│   └── godot/           # Godot integration
└── resources/           # Icons, styles
```
