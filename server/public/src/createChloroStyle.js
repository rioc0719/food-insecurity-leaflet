import jenks from './jenks';
import colorbrewer from 'colorbrewer';

export default async function createChloroStyle(features, propName) {
    let propValues = features.map(feat => +feat.properties[propName]).filter(x => x != null);
    let propClasses = jenks(propValues, 5);

    let getColorForValue = v => {
        let colorBracket = 0;
        for (let i = 0; i < propClasses.length - 1; i++) {
            if (v > propClasses[i]) colorBracket = i;
        }
        return colorbrewer['RdPu'][5][colorBracket];
    };

    let featColorsByJoin = features.reduce((acc, feat) => {
        acc[feat.properties.GISJOIN] = getColorForValue(feat.properties[propName]);
        return acc;
    }, {});

    let style = feature => ({
        fillColor: featColorsByJoin[feature.properties.GISJOIN],
        weight: 2,
        fillOpacity: 0.5
    });

    // let onEachFeature = (feature, layer) => layer.bindPopup(`${1}: ${feature.properties[propName]}`);

    return { styleFn: style, propClasses, getColorForValue };
}