// Python setup code for Pyodide including Matplotlib and Turtle simulation
export const PYTHON_SETUP_CODE = `
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
import math

# Global frame storage for animations
_animation_frames = []

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1a1a2e', edgecolor='none')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return img_str

def capture_animation_frame():
    """Capture current frame for animation"""
    _animation_frames.append(get_plot_as_base64())

def get_animation_frames():
    """Return all captured frames"""
    return _animation_frames

def clear_animation_frames():
    """Clear stored frames"""
    global _animation_frames
    _animation_frames = []

# Simple turtle simulation using Matplotlib
class SimpleTurtle:
    def __init__(self):
        self.x = 0
        self.y = 0
        self.angle = 90
        self.pen_down = True
        self.paths = []
        self.current_path = [(0, 0)]
        self.color = 'lime'
        
    def forward(self, distance):
        rad = math.radians(self.angle)
        new_x = self.x + distance * math.cos(rad)
        new_y = self.y + distance * math.sin(rad)
        if self.pen_down:
            self.current_path.append((new_x, new_y))
        else:
            if len(self.current_path) > 1:
                self.paths.append((self.current_path.copy(), self.color))
            self.current_path = [(new_x, new_y)]
        self.x, self.y = new_x, new_y
        
    def fd(self, distance): self.forward(distance)
    def backward(self, distance): self.forward(-distance)
    def bk(self, distance): self.backward(distance)
    def back(self, distance): self.backward(distance)
        
    def right(self, angle): self.angle -= angle
    def rt(self, angle): self.right(angle)
    def left(self, angle): self.angle += angle
    def lt(self, angle): self.left(angle)
        
    def penup(self):
        if len(self.current_path) > 1:
            self.paths.append((self.current_path.copy(), self.color))
        self.current_path = [(self.x, self.y)]
        self.pen_down = False
        
    def pu(self): self.penup()
    def up(self): self.penup()
        
    def pendown(self):
        self.pen_down = True
        self.current_path = [(self.x, self.y)]
        
    def pd(self): self.pendown()
    def down(self): self.pendown()
        
    def goto(self, x, y=None):
        if y is None and hasattr(x, '__iter__'):
            x, y = x
        if self.pen_down:
            self.current_path.append((x, y))
        else:
            if len(self.current_path) > 1:
                self.paths.append((self.current_path.copy(), self.color))
            self.current_path = [(x, y)]
        self.x, self.y = x, y
        
    def setpos(self, x, y=None): self.goto(x, y)
    def setposition(self, x, y=None): self.goto(x, y)
    def setheading(self, angle): self.angle = angle
    def seth(self, angle): self.setheading(angle)
        
    def circle(self, radius, extent=360):
        steps = max(int(abs(extent) / 5), 1)
        step_angle = extent / steps
        step_length = 2 * math.pi * abs(radius) * abs(extent) / 360 / steps
        for _ in range(steps):
            self.forward(step_length)
            if radius > 0:
                self.left(step_angle)
            else:
                self.right(step_angle)
                
    def pencolor(self, *args):
        if len(args) == 1:
            self.color = args[0]
        elif len(args) == 3:
            r, g, b = args
            if max(r, g, b) <= 1:
                r, g, b = int(r*255), int(g*255), int(b*255)
            self.color = f'#{r:02x}{g:02x}{b:02x}'
            
    def speed(self, s): pass
    def hideturtle(self): pass
    def ht(self): pass
    def showturtle(self): pass
    def st(self): pass
    def begin_fill(self): pass
    def end_fill(self): pass
    def fillcolor(self, *args): pass
    def width(self, w): pass
    def pensize(self, w): pass
        
    def draw(self):
        if len(self.current_path) > 1:
            self.paths.append((self.current_path.copy(), self.color))
        
        fig, ax = plt.subplots(figsize=(10, 10))
        ax.set_facecolor('#1a1a2e')
        fig.patch.set_facecolor('#1a1a2e')
        
        for path, color in self.paths:
            if len(path) > 1:
                xs, ys = zip(*path)
                ax.plot(xs, ys, color=color, linewidth=2)
        
        # Draw turtle marker
        ax.plot(self.x, self.y, 'g^', markersize=12)
        
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.2, color='white')
        ax.tick_params(colors='white')
        for spine in ax.spines.values():
            spine.set_color('white')
            spine.set_alpha(0.3)
        ax.set_xlabel('X', color='white')
        ax.set_ylabel('Y', color='white')
        ax.set_title('🐢 Turtle Graphics', color='lime', fontsize=16)
        
        return get_plot_as_base64()

t = SimpleTurtle()
turtle = t
Turtle = SimpleTurtle

def done(): pass
def mainloop(): pass
def exitonclick(): pass
def bye(): pass
def Screen(): return type('Screen', (), {'bgcolor': lambda self, c: None, 'setup': lambda self, *a: None, 'title': lambda self, t: None, 'tracer': lambda self, n: None, 'update': lambda self: None})()
`;
