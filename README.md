# Silhouette3D

🎨 **Image to 3D Printer File Generator**

Transform any image into 3D-printable STL, OBJ, 3MF, or STEP files with AI-powered background removal and real-time 3D preview.

![Silhouette3D](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🤖 **AI Background Removal** - Professional-grade background removal using ONNX neural network
- 🖼️ **Silhouette Extraction** - High-quality silhouette generation with adjustable threshold
- ✂️ **Crop Tool** - Select and crop specific areas of your image
- 🎛️ **Mesh Processing** - Normal smoothing, Laplacian smoothing, and mesh simplification
- 📦 **Multiple Export Formats** - STL, OBJ, 3MF, and STEP support
- 🏗️ **Base Thickness** - Add a base layer to connect separate silhouette parts
- 🎯 **Base Mode** - Choose between Bounding Box or Cover mode for base generation
- 🎮 **Real-time 3D Preview** - Interactive Three.js viewer with orbit controls
- ⚡ **100% Client-Side** - All processing happens in your browser, no server uploads
- 🎨 **Modern UI** - Beautiful dark theme with responsive design

## 🚀 Live Demo

**[Try it now!](https://uretgec.github.io/silhouette3D/)**

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Three.js + React Three Fiber** - 3D rendering
- **@imgly/background-removal** - AI-powered background removal (ONNX + WASM)
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/uretgec/silhouette3D.git
cd silhouette3D

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 Usage

### Basic Workflow

1. **Upload Image** - Drag & drop or click to upload PNG, JPG, or WEBP
2. **Remove Background** (Optional) - Click "Remove Background (AI)" for cleaner results
3. **Crop** (Optional) - Use crop tool to select specific areas
4. **Adjust Settings**:
   - **Resolution**: 300px (fast) to 1200px (high detail)
   - **Threshold**: Control silhouette detail level (10-245)
   - **Thickness**: Set 3D model height (0.5-20mm)
   - **Pixel Size**: Adjust physical size (0.02-1mm)
   - **Base Mode**: Choose Bounding Box or Cover mode
   - **Base Thickness**: Add base layer to connect parts (0-2mm)
   - **Mesh Smoothing**: None, Smooth, or Simplify
5. **Preview** - Rotate, zoom, and inspect the 3D model
6. **Download** - Choose format (STL, OBJ, 3MF, or STEP) and download

### Export Formats

| Format | Size | Features | Best For |
|--------|------|----------|----------|
| **STL** | ~42MB | Standard, most compatible | General use |
| **OBJ** | ~50MB | Colors & textures | Colored prints |
| **3MF** | ~17MB | Compressed, modern | Fast downloads ⭐ |
| **STEP** | ~34MB | CAD format, editable | CAD editing |

### Base Thickness & Base Mode

The **Base Thickness** setting adds a base layer underneath your silhouette to connect separate parts:

#### Base Mode Options

**1. Bounding Box (Default)*

- Creates a single rectangular base covering all silhouette pixels
- Fast and simple
- Best for general use
- Example: If silhouette spans from x=10 to x=100, y=20 to y=80, creates one rectangle from (10,20) to (100,80)

**2. Cover*

- Creates row-by-row bases following the silhouette outline
- More aesthetic, follows the shape
- Slightly larger file size
- Example: Each row of the silhouette gets its own base segment

#### Base Thickness Values

- **0mm** - No base layer (default)
- **0.5mm** - Thin base for light connection
- **1.0mm** - Medium base for standard prints
- **1.5mm** - Thick base for heavy parts
- **2.0mm** - Maximum base for maximum stability

**When to use Base Thickness:**

- ✅ Silhouette has multiple disconnected parts
- ✅ Parts are too small to print separately
- ✅ Need structural support during printing
- ✅ Want to ensure all parts stick together

**Example:**

```txt
Original silhouette: Multiple separate pieces
With 1mm base (Bounding Box): All pieces connected by a single rectangular base
With 1mm base (Cover): All pieces connected by shape-following base segments
```

### Mesh Processing Modes

| Mode | Description | File Size Impact |
|------|-------------|------------------|
| **None** | Original voxel mesh | No change |
| **Smooth** | Visual smoothing only | No change |
| **Simplify** | Merge adjacent quads | Reduce 50-70% |

### Tips for Best Results

- Use high-contrast images (dark subject on light background)
- Enable "Remove Background (AI)" for complex backgrounds
- Use lower resolution (300px) for faster processing
- Minimum 2mm thickness recommended for 3D printing
- Use "Simplify" mesh mode to reduce file size
- Use Base Thickness (1-2mm) for disconnected silhouette parts
- Choose **Bounding Box** mode for simple, fast results
- Choose **Cover** mode for aesthetic, shape-following bases
- Export as STEP for CAD editing, 3MF for smallest file size

## 🏗️ Project Structure

```txt
silhouette3D/
├── src/
│   ├── components/
│   │   └── STLViewer.tsx       # 3D viewer component
│   ├── utils/
│   │   ├── silhouette.ts       # Image processing & silhouette extraction
│   │   └── stlGenerator.ts     # STL/OBJ/3MF/STEP generation
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
```

## 🧠 How It Works

### Silhouette Extraction

1. **Image Loading** - Image is loaded and scaled to target resolution
2. **Background Removal** (Optional) - AI model removes background using ONNX
3. **Threshold Processing** - Pixels below threshold become foreground
4. **Contour Detection** - Boundary pixels are identified
5. **Mesh Generation** - Voxels are converted to 3D mesh

### Base Thickness & Base Mode 1

When Base Thickness > 0:

**Bounding Box Mode:**

1. Calculate bounding box of all filled pixels (minX, maxX, minY, maxY)
2. Create a single rectangular prism covering the entire bounding box
3. Height = Base Thickness value
4. Position = Below the main silhouette (Z = -baseThickness to 0)
5. Merge with main silhouette mesh

**Cover Mode:**

1. For each row (y-coordinate), find the min and max x-coordinates of filled pixels
2. Create a rectangular prism for each row segment
3. Height = Base Thickness value
4. Position = Below the main silhouette (Z = -baseThickness to 0)
5. Merge all row segments with main silhouette mesh

### Mesh Processing

- **None** - Original voxel mesh (fast)
- **Smooth** - Normal smoothing for visual quality (3D preview only)
- **Simplify** - Grid-based quad merging (reduces file size by 50-70%)

### Export Generation

- **STL** - Binary STL format with triangle mesh
- **OBJ** - Wavefront OBJ with material file
- **3MF** - XML-based 3D Manufacturing Format
- **STEP** - ISO 10303-21 CAD format with rectangular blocks

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [@imgly/background-removal](https://github.com/imgly/background-removal-js) - AI background removal
- [Three.js](https://threejs.org/) - 3D rendering library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js

## 📧 Contact

- GitHub: [@uretgec](https://github.com/uretgec)
- Project: [https://github.com/uretgec/silhouette3D](https://github.com/uretgec/silhouette3D)

## 🌟 Show Your Support

If you find this project useful, please consider giving it a ⭐ on GitHub!

## 📋 Changelog

### v2.0.0 (Latest) ✨

- ✨ Added STEP format export (ISO 10303-21)
- ✨ Added Base Thickness feature (0-2mm)
- ✨ Added Base Mode selection (Bounding Box vs Cover)
  - **Bounding Box**: Single rectangle covering all pixels
  - **Cover**: Row-by-row segments following silhouette outline
- 🎨 Improved 3D preview with base layer visualization
- 🐛 Fixed mesh smoothing performance issues
- 📦 Optimized file size for all export formats
- 🎯 Enhanced UI with dropdown export menu
- 📱 Added Info popup with tips and information

### v1.0.0

- 🎉 Initial release
- 🤖 AI background removal
- 🖼️ Silhouette extraction
- ✂️ Crop tool
- 📦 STL, OBJ, 3MF export
- 🎮 Real-time 3D preview
- 🌐 GitHub Pages deployment

---

**Made with ❤️ for the 3D printing community*
