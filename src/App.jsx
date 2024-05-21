import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from "@turf/turf";
import StaticMode from '@mapbox/mapbox-gl-draw-static-mode';
import CustomControl from './CustomControl.jsx';

mapboxgl.accessToken = "pk.eyJ1Ijoicm9zZXJpbm4iLCJhIjoiY2x2bTY4NGNjMDJkazJsczA2Y2M2b3Z6ZCJ9.Ak0kz3VhRg_IbLAC-qgGUg";

const Map = () => {
  const [isChecked, setIsChecked] = useState(false);
  const [sharpness, setSharpness] = useState(0.85);
  const [resolution, setResolution] = useState(10000);
  const mapContainerRef = useRef(null);
  const drawRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [31.1656, 48.3794],
      zoom: 6
    });

    const modes = MapboxDraw.modes;
    modes.static = StaticMode;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: modes,
      controls: {
        trash: true
      },
    });

    map.addControl(draw);
    drawRef.current = draw;

    map.on('draw.create', (e) => {
      const line = e.features[0];
      const coordinates = line.geometry.coordinates;
      line.properties = { origCoords: coordinates };
      draw.add(line);
    });

    map.on('draw.update', (e) => {
      const line = e.features[0];
      const coordinates = line.geometry.coordinates;
      line.properties = { origCoords: coordinates };
      draw.add(line);
    });

    return () => map.remove();
  }, []);

  const handleCustomControlClick = () => {
    const allLines = drawRef.current.getAll();
    allLines.features = allLines.features.filter(item => item.geometry.coordinates.length !== 0);

    if (isChecked) {
      drawRef.current.changeMode('static');
    } else {
      drawRef.current.changeMode('draw_line_string');
    }

    if (allLines.features.length === 0) {
      return;
    }
    if (drawRef.current.getMode() === 'static') {
      const roundedLines = allLines.features.map(line => roundLineCoordinates(line, sharpness, resolution));
      drawRef.current.set({ type: 'FeatureCollection', features: roundedLines });
    } else {
      allLines.features.forEach(line => {
        line.geometry.coordinates = line.properties.origCoords;
        drawRef.current.add(line);
      });
    }
  };

  const handleSharpnessChange = (e) => {
    const newSharpness = parseFloat(e.target.value);
    setSharpness(newSharpness);
    if (drawRef.current.getMode() !== 'static') return;

    const allLines = drawRef.current.getAll();
    allLines.features.forEach(line => {
      line.geometry.coordinates = line.properties.origCoords;
      drawRef.current.add(line);
    });
    const roundedLines = allLines.features.map(line => roundLineCoordinates(line, newSharpness, resolution));
    drawRef.current.set({ type: 'FeatureCollection', features: roundedLines });
  };

  const handleResolutionChange = (e) => {
    const newResolution = parseFloat(e.target.value);
    setResolution(newResolution);
    if (drawRef.current.getMode() !== 'static') return;

    const allLines = drawRef.current.getAll();
    allLines.features.forEach(line => {
      line.geometry.coordinates = line.properties.origCoords;
      drawRef.current.add(line);
    });
    const roundedLines = allLines.features.map(line => roundLineCoordinates(line, sharpness, newResolution));
    drawRef.current.set({ type: 'FeatureCollection', features: roundedLines });
  };

  return (
    <>

      <div ref={mapContainerRef} style={{ width: '1000px', height: '90vh', margin: '20px auto' }} />
     
      <div className="custom-controls">
 <div className='sharpness-slider'>
        
        <label>Sharpness: {sharpness}</label>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={sharpness}
          onChange={handleSharpnessChange}
        />
      </div>

        <CustomControl
          isChecked={isChecked}
          setIsChecked={setIsChecked}
          onClick={handleCustomControlClick}
        />
     
     
        <div className='resolution-slider'>
        
          <label>Resolution: {resolution}</label>
          <input
            type="range"
            min="0"
            max="100000"
            step="20"
            value={resolution}
            onChange={handleResolutionChange}
          />
        </div>

      </div>
    </>
  )
};

const chaikinSmooth = (coordinates, iterations = 1) => {
  const smoothIteration = (coords) => {
    const newCoords = [coords[0]]; 
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const p0_new = [
        0.75 * p0[0] + 0.25 * p1[0],
        0.75 * p0[1] + 0.25 * p1[1]
      ];
      const p1_new = [
        0.25 * p0[0] + 0.75 * p1[0],
        0.25 * p0[1] + 0.75 * p1[1]
      ];
      newCoords.push(p0_new, p1_new);
    }
    newCoords.push(coords[coords.length - 1]);
    return newCoords;
  };

  let result = coordinates;
  for (let i = 0; i < iterations; i++) {
    result = smoothIteration(result);
  }

  return result;
};

const getTotalLength = (coords) => {
  let length = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    length += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  return length;
};

const rescaleToOriginalLength = (original, smoothed) => {
  const originalLength = getTotalLength(original);
  const smoothedLength = getTotalLength(smoothed);
  const scale = originalLength / smoothedLength;

  let accumulatedLength = 0;
  const rescaledCoords = [original[0]];

  for (let i = 1; i < smoothed.length; i++) {
    const [x1, y1] = smoothed[i - 1];
    const [x2, y2] = smoothed[i];
    const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * scale;
    accumulatedLength += segmentLength;

    if (accumulatedLength <= originalLength) {
      rescaledCoords.push([x2, y2]);
    } else {
      const remainingLength = originalLength - accumulatedLength + segmentLength;
      const ratio = remainingLength / segmentLength;
      const newX = x1 + (x2 - x1) * ratio;
      const newY = y1 + (y2 - y1) * ratio;
      rescaledCoords.push([newX, newY]);
      break;
    }
  }

  return rescaledCoords;
};

const roundLineCoordinates = (line, sharpness = 0.85, resolution = 10000) => {
  const iterations = Math.round(sharpness * 10);
  const roundedCoords = chaikinSmooth(line.geometry.coordinates, iterations);
  const rescaledCoords = rescaleToOriginalLength(line.geometry.coordinates, roundedCoords);


  line.geometry.coordinates = rescaledCoords;

  return line;
};

// const roundLineCoordinates = (line, sharpness = 0.85, resolution = 10000) => {
//   const roundedLine = turf.lineString(line.geometry.coordinates);
//   const rounded = turf.bezierSpline(roundedLine, { sharpness: sharpness, resolution: resolution });

//   // Обновляем координаты линии после скругления
//   line.geometry.coordinates = rounded.geometry.coordinates;

//   return line;
// };

// const roundLineCoordinates = (line, sharpness = 0.85, resolution = 10000) => {
//   // Функция для вычисления расстояния между двумя точками
//   const getDistance = (point1, point2) => {
//     return turf.distance(turf.point(point1), turf.point(point2));
//   };

//   // Находим длинные участки линии
//   const longSegments = [];
//   let maxDistance = 0;
//   let maxIndex = 0;

//   for (let i = 0; i < line.geometry.coordinates.length - 1; i++) {
//     const distance = getDistance(line.geometry.coordinates[i], line.geometry.coordinates[i + 1]);
//     if (distance > maxDistance) {
//       maxDistance = distance;
//       maxIndex = i;
//     }
//   }

//   if (maxDistance > 0) {
//     longSegments.push({ start: maxIndex, end: maxIndex + 1, distance: maxDistance });
//   }

//   // Добавляем дополнительные точки на длинные участки линии
//   const additionalPoints = 10; // Количество дополнительных точек

//   for (const segment of longSegments) {
//     const startPoint = turf.point(line.geometry.coordinates[segment.start]);
//     const endPoint = turf.point(line.geometry.coordinates[segment.end]);
//     const lineSegment = turf.lineString([startPoint.geometry.coordinates, endPoint.geometry.coordinates]);
//     const splitLine = turf.lineChunk(lineSegment, segment.distance / (additionalPoints + 1));

//     // Вставляем дополнительные точки в исходную линию
//     const newCoordinates = [
//       ...line.geometry.coordinates.slice(0, segment.start + 1),
//       ...splitLine.features.map(feature => feature.geometry.coordinates[1]),
//       ...line.geometry.coordinates.slice(segment.end)
//     ];
//     // Обновляем координаты линии после добавления дополнительных точек
//     line.geometry.coordinates = newCoordinates;
//   }

//   // Скругляем линию
//   const roundedLine = turf.lineString(line.geometry.coordinates);
//   const rounded = turf.bezierSpline(roundedLine, { sharpness: sharpness, resolution: resolution });

//   // Обновляем координаты линии после скругления
//   line.geometry.coordinates = rounded.geometry.coordinates;

//   return line;
// };


// const roundLineCoordinates = (line, sharpness = 0.85, resolution = 10000) => {
//   // Функция для вычисления расстояния между двумя точками
//   const getDistance = (point1, point2) => {
//     return turf.distance(turf.point(point1), turf.point(point2));
//   };

//   // Находим самый длинный участок линии
//   let maxDistance = 0;
//   let maxIndex = 0;
//   for (let i = 0; i < line.geometry.coordinates.length - 1; i++) {
//     const distance = getDistance(line.geometry.coordinates[i], line.geometry.coordinates[i + 1]);
//     if (distance > maxDistance) {
//       maxDistance = distance;
//       maxIndex = i;
//     }
//   }

//   // Добавляем дополнительные точки на самый длинный участок линии
//   const additionalPoints = 10; // Количество дополнительных точек
//   const startPoint = turf.point(line.geometry.coordinates[maxIndex]);
//   const endPoint = turf.point(line.geometry.coordinates[maxIndex + 1]);
//   const lineSegment = turf.lineString([startPoint.geometry.coordinates, endPoint.geometry.coordinates]);
//   const splitLine = turf.lineChunk(lineSegment, maxDistance / (additionalPoints + 1));

//   // Вставляем дополнительные точки в исходную линию
//   const newCoordinates = [
//     ...line.geometry.coordinates.slice(0, maxIndex + 1),
//     ...splitLine.features.map(feature => feature.geometry.coordinates[1]),
//     ...line.geometry.coordinates.slice(maxIndex + 1)
//   ];

//   // Обновляем координаты линии после добавления дополнительных точек
//   line.geometry.coordinates = newCoordinates;

//   // Скругляем линию
//   const roundedLine = turf.lineString(line.geometry.coordinates);
//   const rounded = turf.bezierSpline(roundedLine, { sharpness: sharpness, resolution: resolution });

//   // Обновляем координаты линии после скругления
//   line.geometry.coordinates = rounded.geometry.coordinates;

//   return line;
// };




export default Map;
