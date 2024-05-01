import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from "@turf/turf";

mapboxgl.accessToken =
  "pk.eyJ1Ijoicm9zZXJpbm4iLCJhIjoiY2x2bTY4NGNjMDJkazJsczA2Y2M2b3Z6ZCJ9.Ak0kz3VhRg_IbLAC-qgGUg";

function App() {
  const [distance, setDistance] = useState(null);
  const [city, setCity] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    const initMapSettings = async () => {
      const response = await fetch('/map.geojson');
      const data = await response.json();

      map.current.on('load', () => {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: data.features[0].geometry.coordinates
            }
          }
        });

        map.current.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#e303fc',
                'line-width': 2
            }
        });

        map.current.on('click', 'route', async function (e) {
          const coordinates = map.current.getSource('route')._data.geometry.coordinates;
          const startPoint = findArraysInRange(coordinates, e.lngLat)[0];
          const endPoint = findArraysInRange(coordinates, e.lngLat)[1];

          const startAdress = await reverseGeocode(startPoint);
          const endAdress = await reverseGeocode(endPoint);
          const startCity = startAdress.split(',')[2];
          const endCity = endAdress.split(',')[2];
          setCity(`${startCity} - ${endCity}`);
          setDistance(calculateDistance(startPoint, endPoint));
        });

        map.current.on('mouseenter', 'route', function() {
          map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'route', function() {
          map.current.getCanvas().style.cursor = '';
        });

        async function reverseGeocode(coordinates) {
          const response = await fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/' + coordinates[0] + ',' + coordinates[1] + '.json?access_token=' + mapboxgl.accessToken);
          const data = await response.json();
          return data.features[0].place_name;
        }
      });
    };
    
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [17, 50],
      zoom: 5
    });

    initMapSettings();
  }, []);

  const calculateDistance = (startPoint, endPoint) => {
    if (startPoint && endPoint) {
      const lineString = turf.lineString([startPoint, endPoint]);
      const distanceInKilometers = turf.length(lineString, { units: 'kilometers' });
      return distanceInKilometers.toFixed(2) + " км";
    }
    return null;
  };

  return (
    <section className="wrapper">
      <div ref={mapContainer} className="map__container" />
      <div className="info__container">
         {city && <div className="distance__city">{city}</div>}
      {distance && <div className="distance__info">{distance}</div>}
      </div>
     
    </section>
  )
}

function findArraysInRange(array, point) {
  for (let i = 0; i < array.length - 1; i++) {
    let lngValues = [array[i][0], array[i + 1][0]];
    let latValues = [array[i][1], array[i + 1][1]];

    if (
      (point.lng >= Math.min(...lngValues) && point.lng <= Math.max(...lngValues)) &&
      (point.lat >= Math.min(...latValues) && point.lat <= Math.max(...latValues))
    ) {
      return [array[i], array[i + 1]];
    }
  }

  return null;
}

export default App;
