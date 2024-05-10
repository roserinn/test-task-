import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from "@turf/turf";

mapboxgl.accessToken = "pk.eyJ1Ijoicm9zZXJpbm4iLCJhIjoiY2x2bTY4NGNjMDJkazJsczA2Y2M2b3Z6ZCJ9.Ak0kz3VhRg_IbLAC-qgGUg";

const Map = () => {
  const mapContainerRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [31.1656, 48.3794],
      zoom: 1.5
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        line_string: true,
        trash: true
      }
    });

    map.addControl(draw);

    map.on('draw.create', (e) => {
      const line = e.features[0];
      const roundedLine = roundLineCoordinates(line);
      draw.add(roundedLine);
    });

    const roundLineCoordinates = (line) => {
      const coordinates = line.geometry.coordinates.map(coord => [coord[0], coord[1]]);
      const roundedLine = turf.lineString(coordinates);
      const rounded = turf.bezierSpline(roundedLine);
      const roundedCoords = rounded.geometry.coordinates;
      line.geometry.coordinates = roundedCoords;
      return line;
    };

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: '1000px', height: '90vh', margin: '20px auto' }} />;
};

export default Map;