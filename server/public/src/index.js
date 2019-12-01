import L from 'leaflet';
import debugFn from 'debug';
import loadChloroFeats from './loadChloroFeats';
import createLegend from './createLegend';
import addLayerControl from './addLayerControl';

const debug = debugFn('client:index');

const mapboxToken = "pk.eyJ1IjoicmlvYzA3MTkiLCJhIjoiY2sydTA3NmlsMWgydDNtbWJueDczNTVyYSJ9.OXt2qQjXDCMVpDZA5pf3gw";

async function main() {
    // Set up Leaflet map
    let map = L.map('map', {
        center: [27.346153994505922, -81.01318359375001], // over the lake
        zoom: 9
    });

    // Set up Mapbox basemaps
    let dark = L.tileLayer("https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={mapboxToken}", { id: 'mapbox.dark', mapboxToken });
    let light = L.tileLayer("https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={mapboxToken}", { id: 'mapbox.light', mapboxToken });
    dark.addTo(map);

    // Load data
    debug('Loading data...');

    const chloroPropsByFilePath = await loadChloroFeats(map);

    debug('Adding legends...');

    const legends = [];
    for (let [filePath, { props }] of Object.entries(chloroPropsByFilePath)) {
        legends[filePath] = {};
        for (let [propName, { legendName, style }] of Object.entries(props)) {
            legends[filePath][propName] = createLegend(legendName, style);
        }
    }

    debug('Adding layer control...');

    addLayerControl({ dark, light }, chloroPropsByFilePath, legends, map);

    debug('Adding store polygons...');

    const storeData = await fetch('../data/foodSources.json');
    const storeJSON = await storeData.json();
    const storeGeoJSON = {
        type: 'FeatureCollection',
        features: storeJSON.features.map(feat => ({
            type: 'Polygon',
            properties: {
                parcelID: feat.parcelID,
                classification: feat.classification,
                owner: feat.owner,
                address: feat.address
            },
            coordinates: [feat.polygonCoords]
        }))
    };

    // for (let feat of storeGeoJSON.features) {
    //     const isochroneData = await fetch(`https://api.mapbox.com/isochrone/v1/mapbox/walking/${feat.coordinates[0][0][0]},${feat.coordinates[0][0][1]}?contours_minutes=30&polygons=true&access_token=${mapboxToken}`);
    //     const isochroneJSON = await isochroneData.json();
    //     L.geoJSON(isochroneJSON, { style: { fillColor: "green", fillOpacity: 0.25, color: "darkgreen" } }).addTo(map);
    // }

    // let isochroneData = await fetch("https://api.mapbox.com/isochrone/v1/mapbox/driving/-80.845932,27.243660?contours_minutes=5&polygons=true&access_token=pk.eyJ1IjoicmlvYzA3MTkiLCJhIjoiY2sydTA3NmlsMWgydDNtbWJueDczNTVyYSJ9.OXt2qQjXDCMVpDZA5pf3gw");

    // let isochroneJSON = await isochroneData.json();

    L.geoJSON(storeGeoJSON, { style: { fillColor: "red", fillOpacity: 0.25, color: "darkred" } }).addTo(map);

    // Fly to over Okeechobee
    // map.flyTo([27.244182, -80.828922], 14, { duration: 3 }); // over Okeechobee

}

main();
