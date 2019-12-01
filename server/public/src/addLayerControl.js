import L from 'leaflet';
import 'leaflet.control.layers.tree';
import filePaths from '../data/filePaths';

export default function addLayerControl(basemaps, chloroPropsByFilePath, legends, map) {
    // Create dummy tickboxes for each layer
    const overlaysByFilePath = [];
    for  (let pathObj of filePaths) {
        const childLabel = {
            label: pathObj.groupName,
            children: []
        };
        overlaysByFilePath.push(childLabel);
        for (let [propName, propObj] of Object.entries(chloroPropsByFilePath[pathObj.joinfile].props)) {
            childLabel.children.push({
                label: propObj.legendName,
                layer: L.layerGroup([], { filePath: pathObj.joinfile, propName })
            });
        }
    }

    // Add in the layer control
    const layersControl = L.control.layers.tree(
        {
            label: 'Base layers',
            children: [
                {
                    label: 'Dark basemap',
                    layer: basemaps.dark
                },
                {
                    label: 'Light basemap',
                    layer: basemaps.light
                }
            ]
        },
        overlaysByFilePath
    );
    layersControl.addTo(map);
    layersControl.collapseTree(true);

    // Swap out styles instead of loading a whole new layer when overlays switch
    map.on('overlayadd', function(e) {
        const { filePath, propName } = e.layer.options;
        legends[filePath][propName].addTo(this);
        chloroPropsByFilePath[filePath].layerGroup.setStyle(chloroPropsByFilePath[filePath].props[propName].style.styleFn);

        // TODO: lazy loading of each layer's data
        const { GISJOINs } = chloroPropsByFilePath[filePath];
        const GISJOINsParam = GISJOINs.join('&GISJOIN[]=');
        const reqSignature =`/data/json/${filePath}?GISJOIN[]=${GISJOINsParam}&props[]=${propName}`;
        console.log(reqSignature);
    });

    map.on('overlayremove', function(e) {
        const { filePath, propName } = e.layer.options;
        this.removeControl(legends[filePath][propName]);
        chloroPropsByFilePath[filePath].layerGroup.resetStyle();
    });
}