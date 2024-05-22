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
      const roundedLines = allLines.features.map(line => processLine(line, sharpness, resolution));
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
    const roundedLines = allLines.features.map(line => processLine(line, newSharpness, resolution));
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
    const roundedLines = allLines.features.map(line => processLine(line, sharpness, newResolution));
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
        {/* <div className='resolution-slider'>
          <label>Resolution: {resolution}</label>
          <input
            type="range"
            min="0"
            max="100000"
            step="20"
            value={resolution}
            onChange={handleResolutionChange}
          />
        </div> */}
      </div>
    </>
  )
};

const processLine = (line, sharpness = 0.85, resolution = 10000) => {
  const addPointsToLongSegments = (line) => {
    const getDistance = (point1, point2) => {
      return turf.distance(turf.point(point1), turf.point(point2));
    };

    let minSegmentLength = Infinity;
    const segments = [];

    for (let i = 0; i < line.geometry.coordinates.length - 1; i++) {
      const start = line.geometry.coordinates[i];
      const end = line.geometry.coordinates[i + 1];
      const segment = [start, end];
      const length = getDistance(start, end);
      segments.push({ segment, length });

      if (length < minSegmentLength) {
        minSegmentLength = length;
      }
    }

    const newCoordinates = [segments[0].segment[0]];

    segments.forEach(({ segment, length }) => {
      if (length > 2 * minSegmentLength) {
        const additionalPoints = Math.ceil(length / minSegmentLength);
        const lineSegment = turf.lineString(segment);
        const splitLine = turf.lineChunk(lineSegment, length / additionalPoints);

        splitLine.features.forEach(feature => {
          newCoordinates.push(feature.geometry.coordinates[1]);
        });
      } else {
        newCoordinates.push(segment[1]);
      }
    });

    return newCoordinates;
  };

  const coordinatesWithExtraPoints = addPointsToLongSegments(line);
  const roundedLine = turf.lineString(coordinatesWithExtraPoints);
  
  const rounded = turf.bezierSpline(roundedLine, { sharpness, resolution: resolution * 2 });

  line.geometry.coordinates = rounded.geometry.coordinates;
  return line;
};


export default Map;
