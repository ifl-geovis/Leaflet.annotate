
// --- Implementation for building annnotations in Microdata Syntax

var Microdata = {
    annotate: function() {
        var target = this._getTargetDOMElement()
        if (!target) {
            // console.log("Leaflet Entity Not Yet Wrapped for Annotations", this)
            // Catchs Markers when Added
            this.on('add', function() {
                target = this._getTargetDOMElement()
                this._buildAnnotations(target)
            })
        } else {
            this._buildAnnotations(target)
        }
        return this
    },
    _findContainerElements: function(element, results) {
        if (element._container) {
            results.push(element._container)
        }
        if (element._layers) {
            for (var el in element._layers) {
                var layer = element._layers[el]
                this._findContainerElements(layer, results)
            }
        }
    },
    _findSVGGroupElements: function(element, results) {
        if (element._container) {
            if (element._container.localName === "g") results.push(element)
        }
        if (element._layers) {
            for (var el in element._layers) {
                var layer = element._layers[el]
                this._findSVGGroupElements(layer, results)
            }
        }
    },
    _buildPolygonArray: function(wgsCoordinates) {
        var array = []
        for (var l in wgsCoordinates) {
            array.push(wgsCoordinates[l]['lat'])
            array.push(wgsCoordinates[l]['lng'])
        }
        return array
    },
    _createMetaElement: function(key, value) {
        var el = document.createElement('meta')
            el.setAttribute(key, value)
        return el
    },
    _buildAnnotations: function(targets) {

        if (Object.prototype.toString.call(targets) !== '[object Array]') {
            targets = [targets]
        }

        var Builder = function() {
            var data = {}
            this.element = function(type, attrs, target) {
                data['type'] = type
                data['attrs'] = attrs || {}
                data['target'] = target
                return this
            }
            this.child = function(element) {
                if (typeof data['children'] === 'undefined') {
                    data['children'] = []
                }
                data['children'].push(element.build())
                return this
            }
            this.children = function(children) {
                for (var i = 0; i < children.length; i++) {
                    this.child(children[i])
                }
                return this
            }
            this.build = function() {
                return data
            }
        }

        var data = null
        var domObject = targets[0]
        var isSVGGroup = (domObject.tagName === 'g') ? true : false
        var parentElement = domObject

        // Rendering HTML Element Annnotation
        if ((this.options.itemtype === 'Place' || this.options.itemtype === 'City'
             || this.options.itemtype === 'State' || this.options.itemtype === 'Country'
             || this.options.itemtype === 'AdministrativeArea' || this.options.itemtype === 'LocalBusiness'
             || this.options.itemtype === 'Residence' || this.options.itemtype === 'CivicStructure' || this.options.itemtype === 'Landform'
             || this.options.itemtype === 'TouristAttraction' ) && !isSVGGroup) {

            // console.log("Annotating HTML Geo Element", this.options.itemtype, this)
            console.log(this.options.itemtype, "HTML Point, LeafletID", leafletId, this)

            // --- Renders Simple Marker Annotations into an ARTICLE and DIV element

            data = new Builder().element('article', {
                'itemscope': '', 'itemtype': 'http://schema.org/' + this.options.itemtype, 'data-internal-leaflet-id': leafletId
            }).children([
                new Builder().element('meta', {
                    'itemprop': 'name', 'content': this.options.title
                }), new Builder().element('div', {
                    'itemprop': 'geo', 'itemtype': 'http://schema.org/GeoCoordinates'
                }, parentElement).children([
                    new Builder().element('meta', {
                        'itemprop': 'latitude', 'content': this._latlng.lat
                    }),
                    new Builder().element('meta', {
                        'itemprop': 'longitude', 'content': this._latlng.lng
                    })
                ])
            ]).build()

            var renderNode = function(parent, node) {
                var element = document.createElement(node.type)
                for (var attr in node.attrs) {
                    element.setAttribute(attr, node.attrs[attr])
                }
                if (node.children) {
                    for (var i = 0; i < node.children.length; i++) {
                        renderNode(element, node.children[i]);
                    }
                }
                if (node.target) {
                    element.appendChild(node.target);
                }
                parent.appendChild(element)
            }
            var parent = domObject.parentNode
            parent.innerHTML = ''
            renderNode(parent, data)

        } else if (isSVGGroup) {

            // --- Renders HTML Elements as Annotations into SVG Metadata Element for GeoJSON or Circle Marker

            var geoType = (this.options.hasOwnProperty('geotype')) ? this.options.geotype : "point"
            var hasLatLngValuePair = (this.hasOwnProperty('_latlng')) ? true : false
            var leafletId = this['_leaflet_id']
            var geoPropertyName = (this.options.hasOwnProperty('geoprop')) ? this.options.geoprop : "geo"
            var metadata = undefined

            // console.log("Annotating SVG Geo Element", this.options.itemtype, hasLatLngValuePair, this)

            if (geoType === "shape") {

                if ((this.options.itemtype === 'Place' || this.options.itemtype === 'City'
                     || this.options.itemtype === 'State' || this.options.itemtype === 'Country'
                     || this.options.itemtype === 'AdministrativeArea' || this.options.itemtype === 'LocalBusiness'
                     || this.options.itemtype === 'Residence' || this.options.itemtype === 'CivicStructure'
                     || this.options.itemtype === 'Landform' || this.options.itemtype === 'TouristAttraction')
                     && isSVGGroup) {
                    var groupElements = []
                    this._findSVGGroupElements(this, groupElements)
                    console.log(this.options.itemtype, "SVG Shape, LeafletID", leafletId, this, "SVG Geometry Leaflet Groups (possibly Polygon/Paths)", groupElements)
                    for (var lg in groupElements) {
                        var element = groupElements[lg]
                        var containerElement = element._container
                        console.log("   SVG Leaflet Geometry Group, LeafletID", element['_leaflet_id'], element)
                        metadata = document.createElement('metadata')
                        metadata.setAttribute('itemscope','')
                        metadata.setAttribute('itemtype', 'http://schema.org/' + this.options.itemtype)
                        metadata.setAttribute('data-internal-leaflet-id', element['_leaflet_id'])
                        var name = this._createMetaElement('itemprop', 'name')
                            name.setAttribute('content', this.options.title)
                        metadata.appendChild(name)
                        var geoShape = this._createMetaElement('itemprop', geoPropertyName)
                            geoShape.setAttribute('itemtype', 'http://schema.org/GeoShape')
                        var polygon = this._createMetaElement('itemprop', 'polygon')
                            polygon.setAttribute('content', this._buildPolygonArray(element._latlngs))
                        geoShape.appendChild(polygon)
                        metadata.appendChild(geoShape) // ### for each shape
                        containerElement.appendChild(metadata)
                    }
                    metadata = undefined // notes that metadata elements have been already appended to the DOM
                    // Some GeoJSON Feature/Layer Debug Experimentals
                    var layerElements =  this._layers
                    for (var le in this._layers) {
                        var layerElement = this._layers[le]
                        var internalId = this._leaflet_id
                        var geometryType = layerElement.feature.geometry["type"]
                        if (layerElement.hasOwnProperty("feature")) console.log("  Loaded GeoJSON " + geometryType + " Feature, LeafletID", internalId, layerElement.feature)
                    }
                }

            } else if (geoType === "point") {
                //..
                console.log(this.options.itemtype, "SVG Point, LeafletID", leafletId, this)
                if (this.options.itemtype === 'Place') {    // Direct Pin-Point location, just a ``Place'' with a simple "geo" property (GeoCoordinates)
                    metadata = document.createElement('metadata')
                    metadata.setAttribute('itemscope','')
                    metadata.setAttribute('itemtype', 'http://schema.org/Place')
                    metadata.setAttribute('data-internal-leaflet-id', leafletId)
                    var name = this._createMetaElement("itemprop", "name")
                        name.setAttribute('content', this.options.title)
                    metadata.appendChild(name)
                    var geoCoordinate = this._createMetaElement('itemprop', geoPropertyName)
                        geoCoordinate.setAttribute('itemtype', 'http://schema.org/GeoCoordinates')
                    var latitude = this._createMetaElement('itemprop', 'latitude')
                        latitude.setAttribute('content', this._latlng.lat)
                    var longitude = this._createMetaElement('itemprop', 'longitude')
                        longitude.setAttribute('content', this._latlng.lng)
                    geoCoordinate.appendChild(latitude)
                    geoCoordinate.appendChild(longitude)
                    metadata.appendChild(geoCoordinate)

                } else if (this.options.itemtype !== 'undefined') {  // Indirect Pin-Point location, a simple ``Place'' in given geo-property (geoprop) (GeoCoordinates)
                    metadata = document.createElement('metadata')
                    metadata.setAttribute('itemscope','')
                    metadata.setAttribute('itemtype', 'http://schema.org/' + this.options.itemtype)
                    metadata.setAttribute('data-internal-leaflet-id', leafletId)
                    var name = this._createMetaElement("itemprop", "name")
                        name.setAttribute('content', this.options.title)
                    var place = document.createElement('meta')
                        place.setAttribute('itemprop', geoPropertyName) // "contentLocation" or "locationCreated"
                        place.setAttribute('itemscope','')
                        place.setAttribute('itemtype', 'http://schema.org/Place')
                        var geoCoordinate = this._createMetaElement('itemprop', 'geo')
                            geoCoordinate.setAttribute('itemtype', 'http://schema.org/GeoCoordinates')
                            var latitude = this._createMetaElement('itemprop', 'latitude')
                                latitude.setAttribute('content', this._latlng.lat)
                            var longitude = this._createMetaElement('itemprop', 'longitude')
                                longitude.setAttribute('content', this._latlng.lng)
                            geoCoordinate.appendChild(latitude)
                            geoCoordinate.appendChild(longitude)
                        place.appendChild(geoCoordinate)
                    metadata.appendChild(name)
                    metadata.appendChild(place)
                }
            }
            // ### if not already available in the DOM
            if (metadata) domObject.appendChild(metadata)
        }
    }
}

// --- Leaflet Item Wrapper

L.Marker.include(Microdata)
L.Marker.include({
    _getTargetDOMElement: function() {
        return this._icon
    }
})
L.Marker.addInitHook(function () {
    this.annotate()
})

L.CircleMarker.include(Microdata)
L.CircleMarker.include({
    _getTargetDOMElement: function() {
        var results = []
        this._findContainerElements(this, results)
        return results.length > 0 ? results[0] : null
    }
})
L.CircleMarker.addInitHook(function () {
    this.annotate()
})

L.LayerGroup.include(Microdata)
L.LayerGroup.include({
    _getTargetDOMElement: function() {
        var results = []
        this._findContainerElements(this, results)
        return results.length > 0 ? results[0] : null
    }
})
L.LayerGroup.addInitHook(function () {
    this.annotate()
})

/** L.SVG.addInitHook({
    console.log("SVG.addInitHook", this)
}) **/

// var superPathInitialize = L.Path.prototype.initialize
/** L.Path.addInitHook({
    console.log("Path.addInitHook", this)
}) **/
