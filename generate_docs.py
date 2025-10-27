#!/usr/bin/env python3
"""Generate complete Nova64 API documentation pages"""

import os

# HTML template for documentation pages
def create_doc_page(title, subtitle, icon, sections):
    """Generate a complete HTML documentation page"""
    
    sections_html = ""
    for section in sections:
        functions_html = ""
        for func in section.get('functions', []):
            params_html = ""
            if func.get('params'):
                params_html = "<div class='param-list'>"
                for param in func['params']:
                    params_html += f"""
                    <div class='param'>
                        <span class='param-name'>{param['name']}</span> 
                        <span class='param-type'>{param['type']}</span> - {param['desc']}
                    </div>
                    """
                params_html += "</div>"
            
            return_html = ""
            if func.get('returns'):
                return_html = f"""
                <div class='return-info'>
                    <strong>Returns:</strong> <span class='param-type'>{func['returns']['type']}</span> - {func['returns']['desc']}
                </div>
                """
            
            example_html = ""
            if func.get('example'):
                example_html = f"""
                <div class='example'>
                    <div class='example-title'>Example:</div>
                    <pre><code>{func['example']}</code></pre>
                </div>
                """
            
            functions_html += f"""
            <div class='function'>
                <div class='function-sig'>{func['signature']}</div>
                <p>{func['description']}</p>
                {params_html}
                {return_html}
                {example_html}
            </div>
            """
        
        sections_html += f"""
        <section>
            <h2>{section['title']}</h2>
            {section.get('description', '')}
            {functions_html}
        </section>
        """
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Nova64 Documentation</title>
    <style>
        :root {{
            --bg-primary: #0f1115;
            --bg-secondary: #151822;
            --bg-tertiary: #1a1d2e;
            --text-primary: #dcdfe4;
            --text-secondary: #99a1b3;
            --accent-cyan: #00ffff;
            --accent-magenta: #ff0080;
            --accent-yellow: #ffff00;
            --border: #2a324a;
            --code-bg: #1a1d2e;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1625 50%, var(--bg-primary) 100%);
            background-attachment: fixed;
            color: var(--text-primary);
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        header {{
            background: var(--bg-secondary);
            border: 2px solid var(--accent-cyan);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        }}
        
        h1 {{
            color: var(--accent-cyan);
            font-size: 2.5em;
            text-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
            margin-bottom: 10px;
        }}
        
        .back-link {{
            display: inline-block;
            color: var(--accent-cyan);
            text-decoration: none;
            margin-bottom: 15px;
            transition: color 0.3s ease;
        }}
        
        .back-link:hover {{
            color: #33ffff;
            text-decoration: underline;
        }}
        
        .subtitle {{
            color: var(--text-secondary);
            font-size: 1.1em;
        }}
        
        section {{
            background: var(--bg-secondary);
            border-left: 4px solid var(--accent-cyan);
            padding: 25px;
            margin-bottom: 30px;
            border-radius: 8px;
        }}
        
        h2 {{
            color: var(--accent-magenta);
            font-size: 2em;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(255, 0, 128, 0.5);
        }}
        
        h3 {{
            color: var(--accent-cyan);
            font-size: 1.4em;
            margin: 25px 0 15px 0;
        }}
        
        .function {{
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }}
        
        .function-sig {{
            font-family: 'Courier New', Courier, monospace;
            font-size: 1.2em;
            color: var(--accent-yellow);
            margin-bottom: 15px;
            padding: 10px;
            background: var(--code-bg);
            border-radius: 4px;
            border-left: 3px solid var(--accent-yellow);
        }}
        
        .param-list, .return-info {{
            margin: 15px 0;
        }}
        
        .param {{
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
        }}
        
        .param:last-child {{
            border-bottom: none;
        }}
        
        .param-name {{
            color: var(--accent-cyan);
            font-weight: bold;
            font-family: 'Courier New', Courier, monospace;
        }}
        
        .param-type {{
            color: var(--accent-magenta);
            font-style: italic;
            font-size: 0.9em;
        }}
        
        .example {{
            background: var(--code-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            overflow-x: auto;
        }}
        
        .example-title {{
            color: var(--accent-yellow);
            font-weight: bold;
            margin-bottom: 10px;
        }}
        
        pre {{
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
            line-height: 1.5;
        }}
        
        code {{
            color: var(--text-primary);
        }}
        
        .note {{
            background: var(--bg-tertiary);
            border-left: 4px solid var(--accent-yellow);
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }}
        
        .note-title {{
            color: var(--accent-yellow);
            font-weight: bold;
            margin-bottom: 10px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        
        th, td {{
            padding: 12px;
            text-align: left;
            border: 1px solid var(--border);
        }}
        
        th {{
            background: var(--bg-tertiary);
            color: var(--accent-cyan);
            font-weight: bold;
        }}
        
        tr:nth-child(even) {{
            background: var(--bg-tertiary);
        }}
        
        footer {{
            text-align: center;
            padding: 30px 20px;
            color: var(--text-secondary);
            border-top: 1px solid var(--border);
            margin-top: 40px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <a href="index.html" class="back-link">← Back to Documentation Index</a>
        
        <header>
            <h1>{icon} {title}</h1>
            <p class="subtitle">{subtitle}</p>
        </header>

        {sections_html}

        <footer>
            <p>Nova64 Fantasy Console © 2025 | <a href="index.html" style="color: var(--accent-cyan);">Back to Documentation</a></p>
        </footer>
    </div>
</body>
</html>"""

# Define all API documentation structures
apis = {
    'input.html': {
        'title': 'Input System',
        'subtitle': 'Keyboard, mouse, and gamepad input handling',
        'icon': '🕹️',
        'sections': [
            {
                'title': '📋 Overview',
                'description': '<p>Unified input system supporting keyboard, mouse, and gamepad with button state tracking.</p>',
                'functions': []
            },
            {
                'title': '⌨️ Keyboard Functions',
                'description': '',
                'functions': [
                    {
                        'signature': 'btn(buttonIndex)',
                        'description': 'Checks if a button is currently held down.',
                        'params': [
                            {'name': 'buttonIndex', 'type': 'number (0-13)', 'desc': 'Button index to check'}
                        ],
                        'returns': {'type': 'boolean', 'desc': 'true if button is held'},
                        'example': 'if (btn(0)) player.x -= 2; // Move left'
                    },
                    {
                        'signature': 'btnp(buttonIndex)',
                        'description': 'Checks if a button was just pressed (one-shot).',
                        'params': [
                            {'name': 'buttonIndex', 'type': 'number (0-13)', 'desc': 'Button index to check'}
                        ],
                        'returns': {'type': 'boolean', 'desc': 'true only on first frame of press'},
                        'example': 'if (btnp(4)) player.jump(); // Jump on Z key press'
                    },
                    {
                        'signature': 'isKeyDown(keyCode)',
                        'description': 'Checks if a specific keyboard key is currently held.',
                        'params': [
                            {'name': 'keyCode', 'type': 'string', 'desc': 'Key code (e.g., "w", "Space", "ArrowLeft")'}
                        ],
                        'returns': {'type': 'boolean', 'desc': 'true if key is held'},
                        'example': 'if (isKeyDown("w")) player.moveForward();'
                    },
                    {
                        'signature': 'isKeyPressed(keyCode)',
                        'description': 'Checks if a key was just pressed (one-shot).',
                        'params': [
                            {'name': 'keyCode', 'type': 'string', 'desc': 'Key code'}
                        ],
                        'returns': {'type': 'boolean', 'desc': 'true only on first frame'},
                        'example': 'if (isKeyPressed("Enter")) selectMenuItem();'
                    }
                ]
            },
            {
                'title': '🖱️ Mouse Functions',
                'description': '',
                'functions': [
                    {
                        'signature': 'mouseX()',
                        'description': 'Gets the current mouse X position (0-640).',
                        'params': [],
                        'returns': {'type': 'number', 'desc': 'Mouse X coordinate'},
                        'example': 'const mx = mouseX();'
                    },
                    {
                        'signature': 'mouseY()',
                        'description': 'Gets the current mouse Y position (0-360).',
                        'params': [],
                        'returns': {'type': 'number', 'desc': 'Mouse Y coordinate'},
                        'example': 'const my = mouseY();'
                    },
                    {
                        'signature': 'mouseDown()',
                        'description': 'Checks if mouse button is held.',
                        'params': [],
                        'returns': {'type': 'boolean', 'desc': 'true if mouse button is down'},
                        'example': 'if (mouseDown()) dragObject();'
                    },
                    {
                        'signature': 'mousePressed()',
                        'description': 'Checks if mouse button was just clicked (one-shot).',
                        'params': [],
                        'returns': {'type': 'boolean', 'desc': 'true only on first frame of click'},
                        'example': 'if (mousePressed()) handleClick();'
                    }
                ]
            },
            {
                'title': '🎮 Gamepad Functions',
                'description': '',
                'functions': [
                    {
                        'signature': 'gamepadConnected()',
                        'description': 'Checks if a gamepad is connected.',
                        'params': [],
                        'returns': {'type': 'boolean', 'desc': 'true if gamepad is connected'},
                        'example': 'if (gamepadConnected()) useAnalogStick();'
                    },
                    {
                        'signature': 'leftStickX()',
                        'description': 'Gets left analog stick X axis (-1.0 to 1.0).',
                        'params': [],
                        'returns': {'type': 'number', 'desc': 'Left stick X value with deadzone'},
                        'example': 'player.x += leftStickX() * speed;'
                    },
                    {
                        'signature': 'leftStickY()',
                        'description': 'Gets left analog stick Y axis (-1.0 to 1.0).',
                        'params': [],
                        'returns': {'type': 'number', 'desc': 'Left stick Y value with deadzone'},
                        'example': 'player.y += leftStickY() * speed;'
                    },
                    {
                        'signature': 'rightStickX()',
                        'description': 'Gets right analog stick X axis.',
                        'params': [],
                        'returns': {'type': 'number', 'desc': 'Right stick X value'},
                        'example': 'camera.rotateY(rightStickX() * 0.05);'
                    },
                    {
                        'signature': 'rightStickY()',
                        'description': 'Gets right analog stick Y axis.',
                        'params': [],
                        'returns': {'type': 'number', 'desc': 'Right stick Y value'},
                        'example': 'camera.rotateX(rightStickY() * 0.05);'
                    }
                ]
            }
        ]
    }
}

# Create documentation files
docs_dir = 'docs'
for filename, api_data in apis.items():
    filepath = os.path.join(docs_dir, filename)
    html_content = create_doc_page(
        api_data['title'],
        api_data['subtitle'],
        api_data['icon'],
        api_data['sections']
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Created: {filepath}")

print("\nDocumentation generation complete!")
