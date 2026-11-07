const mapElement = document.getElementById('map-template');
const statusElement = document.getElementById('route-summary');

new maplibregl.Map({
    container: mapElement,
    style: mapElement.dataset.mapStyle,
    center: [-90.5069, 14.6349],
    zoom: 11,
});
