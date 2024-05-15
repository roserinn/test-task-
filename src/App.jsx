import {useRef, useEffect, useState} from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from "@turf/turf";
import StaticMode from '@mapbox/mapbox-gl-draw-static-mode';
import CustomControl from './CustomControl.jsx'

mapboxgl.accessToken = "pk.eyJ1Ijoicm9zZXJpbm4iLCJhIjoiY2x2bTY4NGNjMDJkazJsczA2Y2M2b3Z6ZCJ9.Ak0kz3VhRg_IbLAC-qgGUg";

const Map = () => {

  const [isChecked, setIsChecked] = useState(false);
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
    
    if(allLines.features.length === 0) {
      return;
    }
    if(drawRef.current.getMode() ==='static') {
      const roundedLines = allLines.features.map(line => roundLineCoordinates(line))
      drawRef.current.set({ type: 'FeatureCollection', features: roundedLines });
    } else {
      allLines.features.forEach(line => {
        line.geometry.coordinates = line.properties.origCoords;
        drawRef.current.add(line);
      });
    }
  };

  return (
    <>  
    <div ref={mapContainerRef} style={{ width: '1000px', height: '90vh', margin: '20px auto' }} />
    <div className="custom-controls">
        <CustomControl
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        onClick={handleCustomControlClick}
        />
      </div>
    </>
  )
};

const roundLineCoordinates = (line) => {
  const roundedLine = turf.lineString(line.geometry.coordinates);
  const rounded = turf.bezierSpline(roundedLine);

  line.geometry.coordinates = rounded.geometry.coordinates;
  return line;
};

export default Map;
