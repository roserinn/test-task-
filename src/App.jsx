import {useRef, useEffect} from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from "@turf/turf";

mapboxgl.accessToken = "pk.eyJ1Ijoicm9zZXJpbm4iLCJhIjoiY2x2bTY4NGNjMDJkazJsczA2Y2M2b3Z6ZCJ9.Ak0kz3VhRg_IbLAC-qgGUg";

const Map = () => {
  const mapContainerRef = useRef(null);
  const drawRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [31.1656, 48.3794],
      zoom: 6
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        line_string: true,
        trash: true
      }
    });

    map.addControl(draw);
    drawRef.current = draw;

    map.on('draw.create', (e) => {
      const line = e.features[0];
      const roundedLine = originLineCoordinates(line);
      draw.add(roundedLine);
    });

    map.on('draw.selectionchange', (e) => {
      const selectedLine = e.features;
      if (selectedLine.length > 0) {
        const line = selectedLine[0];
        line.geometry.coordinates = line.properties.origCoords;
        drawRef.current.add(line);
      } else {
        const allLines = draw.getAll();
        const roundedLines = allLines.features.map(line => roundLineCoordinates(line));
        draw.set({ type: 'FeatureCollection', features: roundedLines });
      }
    });

    map.on('draw.update', (e) => {
      const line = e.features[0];
      const coordinatesLine = originLineCoordinates(line);
      drawRef.current.add(coordinatesLine);
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: '1000px', height: '90vh', margin: '20px auto' }} />;
};

const roundLineCoordinates = (line) => {
  const roundedLine = turf.lineString(line.geometry.coordinates);
  const rounded = turf.bezierSpline(roundedLine);

  line.geometry.coordinates = rounded.geometry.coordinates;
  return line;
};

const originLineCoordinates = (line) => {
  const coordinates = line.geometry.coordinates.map(coord => [coord[0], coord[1]]);
  line.properties = { origCoords: coordinates };
  return line;
};

export default Map;
