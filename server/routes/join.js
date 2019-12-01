/* eslint-env node */
const express = require('express');
const router = express.Router();
const through2 = require('through2');
const { Readable } = require('stream');
const JSONStream = require('jsonstream');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const debugFn = require('debug')('server:routes:join');

/**
 * GeoJSON data API:
 * Access at /data/join/shapefileName
 * URL options:
 * ?propName=propValue filters for only features with ALL the given props from their associated data
 * any propNames (incl. w/o assoc. propValues) will be outputted in the final GeoJSON
 * if no propNames w/o propValues are provided, all properties will be outputted
 * Returns: GeoJSON Feature with geometry and requested properties and GISJOIN
 */

const possibleJoinfiles = fs.readdirSync(path.join(__dirname, '../../join/output'));

const cache = {};

// request signatures => arrays of previously returned features

router.get('/:shapefile', (req, res) => {
    const debug = debugFn.extend(req.params.shapefile);
    debug('Request for shapefile ' + req.params.shapefile);
    if (!possibleJoinfiles.includes(req.params.shapefile + '_join.geojson')) {
        res.status(404).send('Shapefile not found');
        debug('Shapefile not found')
    }
    else {
        // Check cache first
        // if (Object.values(cache).includes())
        let i = 0, j = 0; // for debugging
        const compareFn = (a, b) => {
            const valA = a[1], valB = b[1];
            if (valA < valB) return -1;
            if (valB < valA) return 1;
            return 0;
        };
        const outputtedProps = Object.entries(req.query).filter(([_propName, propValue]) => propValue === '').sort(compareFn);
        const filterProps = Object.entries(req.query).filter(([_propName, propValue]) => propValue !== '').sort(compareFn);
        const props = Object.assign({}, Object.fromEntries(outputtedProps), Object.fromEntries(filterProps));
        const params = Object.keys(props).map(key => props[key] === '' ? key : key + '=' + props[key]).join('&');
        const reqSignature =`/${req.params.shapefile}?${params}`; // signature: /:shapefile?propNameA=propValueA&propNameB=propValueB&propNameC&propNameD
        debug('Request signature:', reqSignature);
        // check cache:
        if (Object.keys(cache).includes(reqSignature)) {
            const cacheDebug = debug.extend('cache');
            cacheDebug('Found in cache, pushing all features');
            let k = 0;
            const rs = new Readable({
                objectMode: true,
                read() {
                    if (k % 100 == 0) cacheDebug('Found ' + k + ' matching features so far');
                    this.push(cache[reqSignature][i]);
                    k++;
                    if (k === cache[reqSignature].length) {
                        this.push(null);
                    }
                }
            });
            return rs.pipe(JSONStream.stringify('{"features":[', ',', ']}')).on('error', err => console.error(err)).pipe(res).on('error', err => console.error(err));
        }
        else {
            cache[reqSignature] = [];
        }

        const streamDebug = debug.extend('stream');
        streamDebug('Finding matching features');

        const filterStream = through2.obj(function(feature, _enc, cb) {
            j++;
            if (j % 10000 === 0) streamDebug('Scanned ' + j + ' features');
            const matchesAll = filterProps.every(([propName, propValue]) => feature.properties[propName] === propValue);
            if (matchesAll) {
                i++;
                if (i % 100 === 0) streamDebug('Found ' + i + ' matching features so far');
                let output;
                // either only output filter props and outputted props
                if (outputtedProps.length > 0) {
                    const propsObj = {};
                    for (let [propName] of outputtedProps) {
                        propsObj[propName] = feature.properties[propName];
                    }
                    for (let [propName, propValue] of filterProps)  {
                        propsObj[propName] = propValue;
                    }
                    propsObj.GISJOIN = feature.properties.GISJOIN;
                    const moddedFeature = Object.assign({}, feature);
                    moddedFeature.properties = propsObj;
                    output = moddedFeature;
                }
                // or just output all props
                else {
                    output = feature;
                }
                cache[reqSignature].push(output);
                this.push(output);
            }
            cb();
        });

        pipeline(
            fs.createReadStream(path.join(__dirname, '../../join/output', req.params.shapefile + '_join.geojson')),
            JSONStream.parse('features.*'),
            filterStream,
            JSONStream.stringify('{"features":[', ',', ']}'),
            res,
            (err) => {
                if (err) {
                    console.error('Pipeline failed:')
                    console.error(err);
                    delete cache[reqSignature];
                }
                else {
                    streamDebug('Pipeline succeeded');
                }
            }
        );
    }
});

module.exports = router;