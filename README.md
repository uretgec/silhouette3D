# Silhouette3D

🎨 **Image to 3D Printer File Generator**

Transform any image into 3D-printable STL, OBJ, or 3MF files with AI-powered background removal and real-time 3D preview.

![Silhouette3D](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🤖 **AI Background Removal** - Professional-grade background removal using ONNX neural network
- 🖼️ **Silhouette Extraction** - High-quality silhouette generation with adjustable threshold
- ✂️ **Crop Tool** - Select and crop specific areas of your image
- 🎛️ **Mesh Processing** - Normal smoothing, Laplacian smoothing, and mesh simplification
- 📦 **Multiple Export Formats** - STL, OBJ, and 3MF support
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
   - **Resolution**: 300px (fast) to 2000px (ultra detail)
   - **Threshold**: Control silhouette detail level
   - **Thickness**: Set 3D model height (0.5-20mm)
   - **Pixel Size**: Adjust physical size (0.02-1mm)
   - **Mesh Smoothing**: None, Smooth, or Simplify
5. **Preview** - Rotate, zoom, and inspect the 3D model
6. **Download** - Choose format (STL, OBJ, or 3MF) and download

### Export Formats

| Format | Size | Features | Best For |
|--------|------|----------|----------|
| **STL** | ~42MB | Standard, most compatible | General use |
| **OBJ** | ~50MB | Colors & textures | Colored prints |
| **3MF** | ~17MB | Compressed, modern | Fast downloads ⭐ |

### Tips for Best Results

- Use high-contrast images (dark subject on light background)
- Enable "Remove Background (AI)" for complex backgrounds
- Use lower resolution (300px) for faster processing
- Minimum 2mm thickness recommended for 3D printing
- Use "Simplify" mesh mode to reduce file size

## 🏗️ Project Structure

```txt
silhouette3D/
├── src/
│   ├── components/
│   │   └── STLViewer.tsx       # 3D viewer component
│   ├── utils/
│   │   ├── silhouette.ts       # Image processing & silhouette extraction
│   │   └── stlGenerator.ts     # STL/OBJ/3MF generation
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
5. **Mesh Generation** - Voxels or contours are converted to 3D mesh

### Mesh Processing

- **None** - Original voxel mesh (fast)
- **Smooth** - Normal smoothing for visual quality (3D preview only)
- **Simplify** - Grid-based quad merging (reduces file size by 50-70%)

### Export Generation

- **STL** - Binary STL format with triangle mesh
- **OBJ** - Wavefront OBJ with material file
- **3MF** - XML-based 3D Manufacturing Format

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

---

**Made with ❤️ for the 3D printing community*
