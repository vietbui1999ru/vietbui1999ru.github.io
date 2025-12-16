# How to Add Background Animation to Hugo Profile

This guide explains which files you need to access to add background animations (like math-themed animations) to your Hugo Profile portfolio.

## File Structure for Background Animation

### Option 1: Using Hugo's Custom Scripts Feature (Recommended)

**1. Create your animation JavaScript file:**
```
/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/static/js/background-animation.js
```

**2. Create your animation CSS file:**
```
/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/static/css/background-animation.css
```

**3. Configure in hugo.yaml:**

In `/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/hugo.yaml`, add at the bottom under `params:`:

```yaml
params:
  # Enable custom CSS
  customCSS: true

  # Add custom scripts (for your animation)
  customScripts: |
    <link rel="stylesheet" href="/css/background-animation.css">
    <script src="/js/background-animation.js"></script>
```

### Option 2: Override Theme Templates (More Control)

If you need more control over where the animation appears, you can override theme files:

**1. Copy baseof.html to your project:**
```
/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/layouts/_default/baseof.html
```
(Copy from theme and modify line 23 to add a canvas/div for animation)

**2. Or copy specific section (e.g., hero section):**
```
/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/layouts/partials/sections/hero/index.html
```

## Key Files Reference

### Theme Files (READ ONLY - for reference):
- **Base template**: `themes/hugo-profile/layouts/_default/baseof.html:1` (main HTML structure)
- **Scripts loader**: `themes/hugo-profile/layouts/partials/scripts.html:99-101` (custom scripts injection point)
- **Hero section**: `themes/hugo-profile/layouts/partials/sections/hero/index.html:1` (homepage hero)
- **CSS directory**: `themes/hugo-profile/static/css/` (theme styles)
- **JS directory**: `themes/hugo-profile/static/js/` (theme scripts)

### Your Project Files (WHERE YOU'LL WORK):
- **Main config**: `/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/hugo.yaml`
- **Your CSS**: `/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/static/css/` (create files here)
- **Your JS**: `/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/static/js/` (create files here)
- **Override layouts**: `/Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/my-portfolio/layouts/` (optional, copy from theme to override)

## Quick Start Example

For a math particle animation, you'd create:
- `static/js/background-animation.js` - Contains canvas drawing logic (particles, formulas, etc.)
- `static/css/background-animation.css` - Positions canvas as background layer
- Update `hugo.yaml` with the `customScripts` parameter shown above

The animation will then load on all pages automatically!

## Example Animation Structure

### JavaScript (background-animation.js)
```javascript
// Create canvas element
const canvas = document.createElement('canvas');
canvas.id = 'background-canvas';
document.body.prepend(canvas);

const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Your animation logic here
// Example: particles, mathematical formulas, etc.
function animate() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw your animation

    requestAnimationFrame(animate);
}

animate();
```

### CSS (background-animation.css)
```css
#background-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
}
```

## Notes

- Always create your files in the `static/` directory, not in the theme directory
- The theme directory should remain untouched to make updates easier
- Hugo will automatically serve files from `static/` at the root URL
- Use `customScripts` parameter for simple additions
- Override layouts only when you need structural changes
