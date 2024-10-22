import React, { useRef, useState } from 'react';
import './App.css'; // Import the CSS file
import jsPDF from 'jspdf';

function App() {
  const [colors, setColors] = useState([]);
  const [percentages, setPercentages] = useState([]); // State for percentages
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [copyAlert, setCopyAlert] = useState(''); // State for copy alert
  const canvasRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result); // Set the uploaded image
        extractColors(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const kMeans = (pixels, k = 5, maxIter = 10) => {
    const getRandomCentroids = (pixels, k) => {
      let centroids = [];
      for (let i = 0; i < k; i++) {
        centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
      }
      return centroids;
    };

    const getDistance = (p1, p2) => {
      return Math.sqrt(
        Math.pow(p1[0] - p2[0], 2) +
        Math.pow(p1[1] - p2[1], 2) +
        Math.pow(p1[2] - p2[2], 2)
      );
    };

    const assignPixelsToCentroids = (pixels, centroids) => {
      return pixels.map(pixel => {
        let minDist = Infinity;
        let closestCentroid = -1;

        centroids.forEach((centroid, idx) => {
          const dist = getDistance(pixel, centroid);
          if (dist < minDist) {
            minDist = dist;
            closestCentroid = idx;
          }
        });

        return closestCentroid;
      });
    };

    const computeNewCentroids = (pixels, assignments, k) => {
      const sums = Array(k).fill(null).map(() => [0, 0, 0]);
      const counts = Array(k).fill(0);

      assignments.forEach((assignment, i) => {
        sums[assignment][0] += pixels[i][0];
        sums[assignment][1] += pixels[i][1];
        sums[assignment][2] += pixels[i][2];
        counts[assignment]++;
      });

      return sums.map((sum, idx) => counts[idx] === 0
        ? sum
        : [Math.floor(sum[0] / counts[idx]), Math.floor(sum[1] / counts[idx]), Math.floor(sum[2] / counts[idx])]
      );
    };

    let centroids = getRandomCentroids(pixels, k);
    let assignments = [];
    for (let i = 0; i < maxIter; i++) {
      assignments = assignPixelsToCentroids(pixels, centroids);
      centroids = computeNewCentroids(pixels, assignments, k);
    }

    // Calculate percentages
    const colorCounts = Array(k).fill(0);
    assignments.forEach(a => colorCounts[a]++);

    const totalPixels = pixels.length;
    const percentages = colorCounts.map(count => (count / totalPixels) * 100);

    return { centroids, percentages };
  };

  const extractColors = (url) => {
    setLoading(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      const MAX_WIDTH = 200;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
      }

      // Get centroids and percentages
      const { centroids, percentages } = kMeans(pixels, 5);
      const hexColors = centroids.map(c => rgbToHex(c[0], c[1], c[2]));

      setColors(hexColors);
      setPercentages(percentages); // Set percentages
      setLoading(false);
    };
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.text('Dominant Color Report', 20, 20);
    if (imageSrc) {
      doc.addImage(imageSrc, 'JPEG', 20, 30, 160, 90); // Add the uploaded image
    }

    colors.forEach((color, index) => {
      doc.setFillColor(color); // Set fill color
      doc.rect(20, 130 + index * 10, 20, 10, 'F'); // Draw color box
      doc.text(`Color ${index + 1}: ${color} - ${percentages[index].toFixed(2)}%`, 50, 140 + index * 10);
    });

    doc.save('dominant_color_report.pdf');
  };

  const copyToClipboard = (color) => {
    navigator.clipboard.writeText(color).then(() => {
      setCopyAlert(`${color} copied!`);
      setTimeout(() => {
        setCopyAlert('');
      }, 2000); // Clear alert after 2 seconds
    });
  };

  return (
    <div className="App">
      <div className="intro">
        <h1>🎨 Dominant Color Extractor</h1>
        <p>Discover the hidden colors in your images! Upload any image and see the most dominant colors extracted with their hex codes. Perfect for designers, artists, and color enthusiasts!</p>
      </div>
      <input type="file" onChange={handleUpload} accept="image/*" />
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      
      {imageSrc && !loading && (
        <div className="image-preview">
          <h2>Uploaded Image</h2>
          <img src={imageSrc} alt="Uploaded" className="uploaded-image" />
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div>
          {copyAlert && <div className="copy-alert">{copyAlert}</div>} {/* Alert message */}
          <div className="color-container">
            {colors.map((color, index) => (
              <div key={index} className="color-block" onClick={() => copyToClipboard(color)}>
                <div className="color-swatch" style={{ backgroundColor: color }}></div>
                <p className="color-hex">{color}</p>
                <div className="percentage-bar" style={{ width: `${percentages[index]}%`, backgroundColor: color }}></div>
                <p className="percentage-text">{percentages[index].toFixed(2)}%</p>
              </div>
            ))}
          </div>

          <button onClick={downloadReport} className="download-report-button">Download Report</button> {/* Download button */}

          <div className="use-cases">
            <h2>Use Cases</h2>
            <ul>
              <li>👗 Fashion Designers: Get color palettes from clothing photos.</li>
              <li>🎨 Artists: Extract colors from your reference images.</li>
              <li>🏠 Interior Designers: Analyze room colors for design projects.</li>
              <li>📱 App Developers: Create color schemes based on images for UIs.</li>
              <li>📊 Data Visualization: Extract colors for better data representation.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
